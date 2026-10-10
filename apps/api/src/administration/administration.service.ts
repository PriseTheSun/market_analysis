import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService, type Tx } from "../database/database.service.js";
import type { Actor } from "../authorization/policy.js";
import { effectiveRole } from "../authorization/policy.js";
import { AuthService, publicUser } from "../auth/auth.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EventsService } from "../notifications/events.service.js";
import { MailService } from "../mail/mail.service.js";
import { AppError } from "../common/errors.js";
import type { TenantRole } from "@market/contracts";
export interface Pagination {
  page: number;
  pageSize: number;
  search: string;
}
export const pageArgs = (p: Pagination) => ({
  skip: (p.page - 1) * p.pageSize,
  take: p.pageSize,
});
export const resultPage = <T>(items: T[], total: number, p: Pagination) => ({
  items,
  total,
  page: p.page,
  pageSize: p.pageSize,
});
export const userSelect = {
  id: true,
  name: true,
  email: true,
  platformRole: true,
  active: true,
} as const;
@Injectable()
export class AdministrationService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AuthService) private auth: AuthService,
    @Inject(AuditService) private audit: AuditService,
    @Inject(EventsService) private events: EventsService,
    @Inject(MailService) private mail: MailService,
  ) {}
  contexts(actor: Actor) {
    return this.db.personal(actor, async (tx, current) => {
      const tenants = await tx.tenant.findMany({
        where: {
          status: "active",
          archivedAt: null,
          agency: { active: true },
          ...(current.platformRole === "GLOBAL"
            ? {}
            : {
                OR: [
                  { members: { some: { userId: current.id, active: true } } },
                  {
                    agency: {
                      members: { some: { userId: current.id, active: true } },
                    },
                  },
                ],
              }),
        },
        include: {
          agency: {
            include: {
              members: { where: { userId: current.id, active: true } },
            },
          },
          members: { where: { userId: current.id, active: true } },
        },
        orderBy: { name: "asc" },
      });
      return tenants.map((t) => ({
        id: t.id,
        name: t.name,
        agencyId: t.agencyId,
        agencyName: t.agency.name,
        role: effectiveRole(
          current.platformRole === "GLOBAL",
          t.agency.members.length > 0,
          t.members[0]?.role ?? null,
        ),
      }));
    });
  }
  async agencyPermission(tx: Tx, actor: Actor, id: string) {
    const current = await this.db.actor(tx, actor);
    const agency = await tx.agency.findFirst({
      where: {
        id,
        active: true,
        ...(current.platformRole === "GLOBAL"
          ? {}
          : { members: { some: { userId: current.id, active: true } } }),
      },
    });
    if (!agency) throw new AppError(404, "NOT_FOUND");
    return current;
  }
  agencies(
    actor: Actor,
    p: Pagination & { status?: "active" | "inactive" },
    platformOnly = false,
  ) {
    return this.db.personal(actor, async (tx, current) => {
      if (platformOnly && current.platformRole !== "GLOBAL")
        throw new AppError(403, "FORBIDDEN");
      const where = {
        archivedAt: null,
        OR: [
          { name: { contains: p.search, mode: "insensitive" as const } },
          { slug: { contains: p.search, mode: "insensitive" as const } },
        ],
        ...(current.platformRole === "GLOBAL"
          ? p.status
            ? { active: p.status === "active" }
            : {}
          : {
              active: true,
              members: { some: { userId: current.id, active: true } },
            }),
      };
      return resultPage(
        await tx.agency.findMany({
          where,
          ...pageArgs(p),
          orderBy: [{ name: "asc" }, { id: "asc" }],
        }),
        await tx.agency.count({ where }),
        p,
      );
    });
  }
  createAgency(
    actor: Actor,
    data: { name: string; slug: string },
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const value = await tx.agency.create({ data });
        await this.audit.record(tx, current, "agency.created", requestId, {
          agencyId: value.id,
          resourceId: value.id,
        });
        return value;
      },
      true,
    );
  }
  updateAgency(
    actor: Actor,
    id: string,
    data: { name?: string; slug?: string; active?: boolean },
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        if (!(await tx.agency.findFirst({ where: { id, archivedAt: null } })))
          throw new AppError(404, "NOT_FOUND");
        const value = await tx.agency.update({ where: { id }, data });
        await this.db.assertResponsibilities(tx);
        await this.audit.record(tx, current, "agency.updated", requestId, {
          agencyId: id,
          resourceId: id,
        });
        return value;
      },
      true,
    );
  }
  tenants(actor: Actor, p: Pagination, agencyId?: string) {
    return this.db.personal(actor, async (tx, current) => {
      if (agencyId) await this.agencyPermission(tx, current, agencyId);
      else if (current.platformRole !== "GLOBAL")
        throw new AppError(403, "FORBIDDEN");
      const where = {
        archivedAt: null,
        ...(agencyId ? { agencyId } : {}),
        name: { contains: p.search, mode: "insensitive" as const },
      };
      return resultPage(
        await tx.tenant.findMany({
          where,
          ...pageArgs(p),
          include: { agency: { select: { name: true } } },
          orderBy: { name: "asc" },
        }),
        await tx.tenant.count({ where }),
        p,
      );
    });
  }
  createTenant(
    actor: Actor,
    data: { name: string; slug: string; agencyId: string; adminEmail: string },
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const agency = await tx.agency.findFirst({
          where: { id: data.agencyId, active: true },
        });
        if (!agency) throw new AppError(404, "NOT_FOUND");
        const user = await tx.user.findUnique({
          where: { email: data.adminEmail },
        });
        if (user && !user.active) throw new AppError(409, "CONFLICT");
        const tenant = await tx.tenant.create({
          data: {
            name: data.name,
            slug: data.slug,
            agencyId: agency.id,
            status: user ? "active" : "provisioning",
          },
        });
        if (user)
          await tx.tenantMembership.create({
            data: { tenantId: tenant.id, userId: user.id, role: "ADMIN" },
          });
        else
          await this.auth.issue(
            tx,
            current,
            tenant.id,
            data.adminEmail,
            "ADMIN",
            true,
          );
        await this.db.assertResponsibilities(tx);
        await this.audit.record(tx, current, "tenant.created", requestId, {
          tenantId: tenant.id,
          agencyId: agency.id,
          resourceId: tenant.id,
        });
        return tenant;
      },
      true,
    );
  }
  updateTenant(
    actor: Actor,
    id: string,
    data: { name?: string; slug?: string; status?: "active" | "disabled" },
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const t = await tx.tenant.findFirst({
          where: { id, archivedAt: null },
          include: { agency: true },
        });
        if (!t) throw new AppError(404, "NOT_FOUND");
        if (data.status === "active" && !t.agency.active)
          throw new AppError(409, "CONFLICT");
        const value = await tx.tenant.update({ where: { id }, data });
        await this.db.assertResponsibilities(tx);
        await this.audit.record(tx, current, "tenant.updated", requestId, {
          tenantId: id,
          agencyId: t.agencyId,
          resourceId: id,
        });
        return value;
      },
      true,
    );
  }
  agencyMembers(
    actor: Actor,
    id: string,
    data: { email: string; active: boolean },
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const agency = await tx.agency.findFirst({
          where: { id, archivedAt: null },
        });
        const user = await tx.user.findFirst({
          where: { email: data.email, active: true },
        });
        if (!agency || !user) throw new AppError(404, "NOT_FOUND");
        const value = await tx.agencyMembership.upsert({
          where: { agencyId_userId: { agencyId: id, userId: user.id } },
          create: { agencyId: id, userId: user.id, active: data.active },
          update: { active: data.active },
        });
        await this.audit.record(
          tx,
          current,
          "agency.super-admin.updated",
          requestId,
          { agencyId: id, resourceId: user.id },
        );
        return value;
      },
      true,
    );
  }
  listAgencyMembers(actor: Actor, id: string) {
    return this.db.global(actor, (tx) =>
      tx.agencyMembership.findMany({
        where: { agencyId: id },
        include: { user: { select: userSelect } },
      }),
    );
  }
  users(actor: Actor, p: Pagination) {
    return this.db.global(actor, async (tx) => {
      const where = {
        archivedAt: null,
        OR: [
          { name: { contains: p.search, mode: "insensitive" as const } },
          { email: { contains: p.search, mode: "insensitive" as const } },
        ],
      };
      return resultPage(
        await tx.user.findMany({
          where,
          select: userSelect,
          ...pageArgs(p),
          orderBy: { email: "asc" },
        }),
        await tx.user.count({ where }),
        p,
      );
    });
  }
  updateIdentity(
    actor: Actor,
    id: string,
    data: { global?: boolean; active?: boolean; reason: string },
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const user = await tx.user.findFirst({
          where: { id, archivedAt: null },
        });
        if (!user) throw new AppError(404, "NOT_FOUND");
        const result = await tx.user.update({
          where: { id },
          data: {
            ...(data.global !== undefined
              ? { platformRole: data.global ? "GLOBAL" : null }
              : {}),
            ...(data.active !== undefined ? { active: data.active } : {}),
          },
        });
        await this.db.assertResponsibilities(tx);
        if (data.active === false)
          await tx.session.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        await this.audit.record(
          tx,
          current,
          data.global !== undefined
            ? "user.global.updated"
            : "user.status.updated",
          requestId,
          { resourceId: id, reason: data.reason },
        );
        return publicUser(result);
      },
      true,
    );
  }
  members(actor: Actor, tenantId: string, p: Pagination, requestId: string) {
    return this.db.tenant(actor, tenantId, "members", requestId, async (tx) => {
      const where = {
        tenantId,
        user: {
          OR: [
            { name: { contains: p.search, mode: "insensitive" as const } },
            { email: { contains: p.search, mode: "insensitive" as const } },
          ],
        },
      };
      return resultPage(
        await tx.tenantMembership.findMany({
          where,
          include: { user: { select: userSelect } },
          ...pageArgs(p),
          orderBy: { createdAt: "desc" },
        }),
        await tx.tenantMembership.count({ where }),
        p,
      );
    });
  }
  updateMember(
    actor: Actor,
    tenantId: string,
    id: string,
    data: { role?: TenantRole; active?: boolean },
    requestId: string,
  ) {
    return this.db.tenant(
      actor,
      tenantId,
      "members",
      requestId,
      async (tx, scope) => {
        const member = await tx.tenantMembership.findFirst({
          where: { id, tenantId },
          include: { user: true },
        });
        if (!member) throw new AppError(404, "NOT_FOUND");
        const value = await tx.tenantMembership.update({ where: { id }, data });
        await this.db.assertResponsibilities(tx);
        await this.audit.record(
          tx,
          scope.actor,
          "membership.updated",
          requestId,
          { tenantId, resourceId: id },
        );
        if (value.active && member.user.active)
          await this.events.notify(
            tx,
            [member.userId],
            tenantId,
            "membership.changed",
            "membership:" + id + ":" + value.updatedAt.toISOString(),
            { role: value.role },
          );
        return value;
      },
      true,
    );
  }
  invite(
    actor: Actor,
    tenantId: string,
    data: { email: string; role: TenantRole },
    requestId: string,
  ) {
    return this.db.tenant(
      actor,
      tenantId,
      "members",
      requestId,
      async (tx, scope) => {
        const existing = await tx.invitation.findFirst({
          where: {
            tenantId,
            email: data.email,
            consumedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        });
        if (existing) {
          if (existing.role !== data.role) throw new AppError(409, "CONFLICT");
          return { id: existing.id };
        }
        const value = await this.auth.issue(
          tx,
          scope.actor,
          tenantId,
          data.email,
          data.role,
        );
        await this.audit.record(
          tx,
          scope.actor,
          "invitation.created",
          requestId,
          { tenantId, resourceId: value.id },
        );
        return { id: value.id };
      },
      true,
    );
  }
  invitations(actor: Actor, tenantId: string, requestId: string) {
    return this.db.tenant(actor, tenantId, "members", requestId, async (tx) => {
      const invites = await tx.invitation.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          consumedAt: true,
          revokedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const deliveries = await tx.emailDelivery.findMany({
        where: { eventKey: { in: invites.map((x) => "invitation:" + x.id) } },
        select: { eventKey: true, status: true },
      });
      return invites.map((x) => ({
        ...x,
        deliveryStatus:
          deliveries.find((d) => d.eventKey === "invitation:" + x.id)?.status ??
          "pending",
      }));
    });
  }
  resend(actor: Actor, tenantId: string, id: string, requestId: string) {
    return this.db.tenant(
      actor,
      tenantId,
      "members",
      requestId,
      async (tx, scope) => {
        if (
          !(await tx.invitation.findFirst({
            where: {
              id,
              tenantId,
              consumedAt: null,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
          }))
        )
          throw new AppError(404, "NOT_FOUND");
        await this.mail.resend(tx, "invitation:" + id);
        await this.audit.record(
          tx,
          scope.actor,
          "invitation.resent",
          requestId,
          { tenantId, resourceId: id },
        );
        return { queued: true };
      },
    );
  }
}
