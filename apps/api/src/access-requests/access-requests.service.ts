import { Inject, Injectable } from "@nestjs/common";
import type { Actor } from "../authorization/policy.js";
import { DatabaseService, type Tx } from "../database/database.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EventsService } from "../notifications/events.service.js";
import { AuthService } from "../auth/auth.service.js";
import { MailService } from "../mail/mail.service.js";
import { AppError } from "../common/errors.js";
import {
  pageArgs,
  resultPage,
  type Pagination,
} from "../administration/administration.service.js";
import type { TenantRole, RequestAssignmentInput } from "@market/contracts";
@Injectable()
export class AccessRequestsService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AuditService) private audit: AuditService,
    @Inject(EventsService) private events: EventsService,
    @Inject(AuthService) private auth: AuthService,
    @Inject(MailService) private mail: MailService,
  ) {}
  async submit(
    data: {
      name: string;
      email: string;
      organization: string;
      message?: string;
    },
    requestId: string,
  ) {
    await this.db.metadata.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.email}, 8721))::text`;
      if (
        await tx.accessRequest.findFirst({
          where: { email: data.email, status: "pending" },
        })
      )
        return;
      const item = await tx.accessRequest.create({ data });
      await this.audit.record(tx, null, "access.submitted", requestId, {
        resourceId: item.id,
      });
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
        status: p.status ?? { not: "rejected" as const },
        OR: [
          { name: { contains: p.search, mode: "insensitive" as const } },
          { email: { contains: p.search, mode: "insensitive" as const } },
          {
            organization: { contains: p.search, mode: "insensitive" as const },
          },
          {
            tenant: {
              agency: {
                name: { contains: p.search, mode: "insensitive" as const },
              },
            },
          },
          {
            tenant: {
              name: { contains: p.search, mode: "insensitive" as const },
            },
          },
        ],
      };
      const items = await tx.accessRequest.findMany({
        where,
        ...pageArgs(p),
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: {
              name: true,
              agencyId: true,
              agency: { select: { id: true, name: true } },
            },
          },
          invitation: {
            select: {
              role: true,
              consumedAt: true,
              revokedAt: true,
              expiresAt: true,
            },
          },
        },
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
        const before = await this.audit.snapshot(tx, "access.classified", id);
        const value = await tx.accessRequest.update({
          where: { id },
          data: { tenantId, agencyId: tenant.agencyId },
        });
        await this.audit.record(tx, current, "access.classified", requestId, {
          tenantId,
          resourceId: id,
          before,
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
  options(actor: Actor) {
    return this.db.global(actor, async (tx) => ({
      agencies: await tx.agency.findMany({
        where: { active: true, archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      clients: await tx.tenant.findMany({
        where: {
          status: "active",
          archivedAt: null,
          agency: { active: true, archivedAt: null },
        },
        select: { id: true, name: true, agencyId: true },
        orderBy: { name: "asc" },
      }),
    }));
  }
  private async revokeInvitation(tx: Tx, id: string) {
    await tx.invitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await tx.emailDelivery.updateMany({
      where: { eventKey: "invitation:" + id },
      data: { status: "expired", encryptedPayload: null },
    });
  }
  assign(
    actor: Actor,
    id: string,
    data: RequestAssignmentInput,
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const item = await tx.accessRequest.findUnique({
          where: { id },
          include: { invitation: true },
        });
        if (!item) throw new AppError(404, "NOT_FOUND");
        if (item.status === "rejected" || item.invitation?.consumedAt)
          throw new AppError(409, "CONFLICT");
        const tenant = await tx.tenant.findFirst({
          where: {
            id: data.tenantId,
            agencyId: data.agencyId,
            status: "active",
            archivedAt: null,
            agency: { active: true, archivedAt: null },
          },
        });
        if (!tenant) throw new AppError(404, "NOT_FOUND");
        if (
          item.status === "approved" &&
          item.tenantId === tenant.id &&
          item.invitation?.role === data.role
        ) {
          return { id, status: item.status };
        }
        await this.db.setContext(tx, current, tenant.id);
        const before = await this.audit.snapshot(tx, "access.updated", id);
        const approved = data.approve || item.status === "approved";
        let invitationId = item.invitationId;
        if (approved) {
          if (invitationId) await this.revokeInvitation(tx, invitationId);
          invitationId = (
            await this.auth.issue(tx, current, tenant.id, item.email, data.role)
          ).id;
        }
        const value = await tx.accessRequest.update({
          where: { id },
          data: {
            tenantId: tenant.id,
            agencyId: tenant.agencyId,
            ...(approved
              ? {
                  status: "approved",
                  invitationId,
                  reviewedBy: current.id,
                  reviewedAt: new Date(),
                }
              : {}),
          },
        });
        await this.audit.record(
          tx,
          current,
          approved
            ? item.status === "approved"
              ? "access.updated"
              : "access.approved"
            : "access.classified",
          requestId,
          { tenantId: tenant.id, resourceId: id, before },
        );
        await this.events.notify(
          tx,
          await this.events.reviewers(tx, tenant.id),
          tenant.id,
          approved ? "access.reviewed" : "access.assigned",
          "access.assigned:" + id + ":" + value.updatedAt.toISOString(),
          { name: item.name, ...(approved ? { status: "approved" } : {}) },
          id,
        );
        return { id, status: value.status };
      },
      true,
    );
  }
  resend(actor: Actor, id: string, requestId: string, tenantId?: string) {
    const run = async (tx: Tx, current: Actor) => {
      const item = await tx.accessRequest.findUnique({
        where: { id },
        include: { invitation: true },
      });
      if (!item || (tenantId && item.tenantId !== tenantId))
        throw new AppError(404, "NOT_FOUND");
      if (
        item.status !== "approved" ||
        !item.tenantId ||
        !item.invitation ||
        item.invitation.consumedAt ||
        item.invitation.revokedAt
      )
        throw new AppError(409, "CONFLICT");
      await this.db.context(tx, current, item.tenantId, "requests", requestId);
      await this.db.setContext(tx, current, item.tenantId);
      if (item.invitation.expiresAt <= new Date()) {
        await this.revokeInvitation(tx, item.invitation.id);
        const invitation = await this.auth.issue(
          tx,
          current,
          item.tenantId,
          item.email,
          item.invitation.role,
        );
        await tx.accessRequest.update({
          where: { id },
          data: { invitationId: invitation.id },
        });
      } else {
        await this.mail.resend(tx, "invitation:" + item.invitation.id);
      }
      await this.audit.record(tx, current, "invitation.resent", requestId, {
        tenantId: item.tenantId,
        resourceId: id,
      });
      return { queued: true };
    };
    return tenantId
      ? this.db.tenant(
          actor,
          tenantId,
          "requests",
          requestId,
          (tx, scope) => run(tx, scope.actor),
          true,
        )
      : this.db.global(actor, run, true);
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
      const item = await tx.accessRequest.findUnique({
        where: { id },
        include: { invitation: true },
      });
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
      const rejectingInvitation =
        item.status === "approved" &&
        data.decision === "rejected" &&
        !item.invitation?.consumedAt;
      if (item.status !== "pending" && !rejectingInvitation) {
        if (
          item.status !== data.decision ||
          (data.decision === "approved" && item.invitation?.role !== data.role)
        )
          throw new AppError(409, "CONFLICT");
        return { id: item.id, status: item.status };
      }
      const before = await this.audit.snapshot(tx, "access.updated", id);
      let invitationId: string | undefined;
      if (data.decision === "rejected" && item.invitationId)
        await this.revokeInvitation(tx, item.invitationId);
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
          before,
        },
      );
      await this.events.notify(
        tx,
        await this.events.reviewers(tx, item.tenantId),
        item.tenantId,
        "access.reviewed",
        "access.reviewed:" + id + ":" + data.decision,
        { name: item.name, status: data.decision },
        id,
      );
      return { id: value.id, status: value.status };
    });
  }
}
