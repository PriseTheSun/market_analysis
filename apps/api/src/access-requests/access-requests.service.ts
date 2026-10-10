import { Inject, Injectable } from "@nestjs/common";
import type { Actor } from "../authorization/policy.js";
import { DatabaseService, type Tx } from "../database/database.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EventsService } from "../notifications/events.service.js";
import { AuthService } from "../auth/auth.service.js";
import { AppError } from "../common/errors.js";
import {
  pageArgs,
  resultPage,
  type Pagination,
} from "../administration/administration.service.js";
import type { TenantRole } from "@market/contracts";
@Injectable()
export class AccessRequestsService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AuditService) private audit: AuditService,
    @Inject(EventsService) private events: EventsService,
    @Inject(AuthService) private auth: AuthService,
  ) {}
  async submit(data: {
    name: string;
    email: string;
    organization: string;
    message?: string;
  }) {
    await this.db.metadata.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.email}, 8721))::text`;
      if (
        await tx.accessRequest.findFirst({
          where: { email: data.email, status: "pending" },
        })
      )
        return;
      const item = await tx.accessRequest.create({ data });
      await this.events.notify(
        tx,
        await this.events.reviewers(tx, null),
        null,
        "access.received",
        "access.received:" + item.id,
        { name: item.name },
        item.id,
      );
    });
    return { received: true };
  }
  async list(
    actor: Actor,
    p: Pagination & { status?: "pending" | "approved" | "rejected" },
    requestId: string,
    tenantId?: string,
  ) {
    const run = async (tx: Tx) => {
      const where = {
        ...(tenantId ? { tenantId } : {}),
        ...(p.status ? { status: p.status } : {}),
        OR: [
          { name: { contains: p.search, mode: "insensitive" as const } },
          { email: { contains: p.search, mode: "insensitive" as const } },
          {
            organization: { contains: p.search, mode: "insensitive" as const },
          },
        ],
      };
      const items = await tx.accessRequest.findMany({
        where,
        ...pageArgs(p),
        orderBy: { createdAt: "desc" },
        include: { tenant: { select: { name: true, agencyId: true } } },
      });
      const reviewers = await tx.user.findMany({
        where: {
          id: {
            in: items.flatMap((x) => (x.reviewedBy ? [x.reviewedBy] : [])),
          },
        },
        select: { id: true, name: true },
      });
      const deliveries = await tx.emailDelivery.findMany({
        where: {
          eventKey: {
            in: items.flatMap((x) =>
              x.invitationId ? ["invitation:" + x.invitationId] : [],
            ),
          },
        },
        select: { eventKey: true, status: true },
      });
      return resultPage(
        items.map((x) => ({
          ...x,
          reviewer: reviewers.find((u) => u.id === x.reviewedBy) ?? null,
          deliveryStatus:
            deliveries.find(
              (d) => d.eventKey === "invitation:" + x.invitationId,
            )?.status ?? null,
        })),
        await tx.accessRequest.count({ where }),
        p,
      );
    };
    return tenantId
      ? this.db.tenant(actor, tenantId, "requests", requestId, run)
      : this.db.global(actor, run);
  }
  classify(actor: Actor, id: string, tenantId: string, requestId: string) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const item = await tx.accessRequest.findUnique({ where: { id } });
        const tenant = await tx.tenant.findFirst({
          where: { id: tenantId, status: "active", agency: { active: true } },
        });
        if (!item || !tenant) throw new AppError(404, "NOT_FOUND");
        if (item.status !== "pending") throw new AppError(409, "CONFLICT");
        const value = await tx.accessRequest.update({
          where: { id },
          data: { tenantId, agencyId: tenant.agencyId },
        });
        await this.audit.record(tx, current, "access.classified", requestId, {
          tenantId,
          resourceId: id,
        });
        await this.events.notify(
          tx,
          await this.events.reviewers(tx, tenantId),
          tenantId,
          "access.assigned",
          "access.assigned:" + id + ":" + value.updatedAt.toISOString(),
          { name: item.name },
          id,
        );
        return value;
      },
      true,
    );
  }
  review(
    actor: Actor,
    id: string,
    data: {
      decision: "approved" | "rejected";
      role: TenantRole;
      reason?: string;
    },
    requestId: string,
    tenantId?: string,
  ) {
    return this.db.metadata.$transaction(async (tx) => {
      await this.db.lockAccess(tx);
      const current = await this.db.actor(tx, actor);
      const item = await tx.accessRequest.findUnique({ where: { id } });
      if (!item || (tenantId && tenantId !== item.tenantId))
        throw new AppError(404, "NOT_FOUND");
      if (current.platformRole !== "GLOBAL") {
        if (!item.tenantId) throw new AppError(404, "NOT_FOUND");
        await this.db.context(
          tx,
          current,
          item.tenantId,
          "requests",
          requestId,
        );
      }
      if (!tenantId && current.platformRole !== "GLOBAL")
        throw new AppError(403, "FORBIDDEN");
      await this.db.setContext(tx, current, item.tenantId);
      if (item.status !== "pending") {
        if (item.status !== data.decision) throw new AppError(409, "CONFLICT");
        if (item.invitationId) {
          const invitation = await tx.invitation.findUnique({
            where: { id: item.invitationId },
          });
          if (invitation?.role !== data.role)
            throw new AppError(409, "CONFLICT");
        }
        return { id: item.id, status: item.status };
      }
      let invitationId: string | undefined;
      if (data.decision === "approved") {
        if (!item.tenantId) throw new AppError(409, "CONFLICT");
        await this.db.context(
          tx,
          current,
          item.tenantId,
          "requests",
          requestId,
        );
        invitationId = (
          await this.auth.issue(
            tx,
            current,
            item.tenantId,
            item.email,
            data.role,
          )
        ).id;
      }
      const value = await tx.accessRequest.update({
        where: { id },
        data: {
          status: data.decision,
          reviewedBy: current.id,
          reviewedAt: new Date(),
          reason: data.reason,
          invitationId,
        },
      });
      await this.audit.record(
        tx,
        current,
        "access." + data.decision,
        requestId,
        {
          tenantId: item.tenantId ?? undefined,
          resourceId: id,
          reason: data.reason,
        },
      );
      await this.events.notify(
        tx,
        await this.events.reviewers(tx, item.tenantId),
        item.tenantId,
        "access.reviewed",
        "access.reviewed:" + id,
        { name: item.name, status: data.decision },
        id,
      );
      return { id: value.id, status: value.status };
    });
  }
}
