import { Inject, Injectable } from "@nestjs/common";
import type {
  ManagementKind,
  ManagementListInput,
  ManagementUserInput,
  ManagementAgencyInput,
  ManagementClientInput,
  PermissionInput,
} from "@market/contracts";
import type { Prisma } from "../generated/prisma/client.js";
import { DatabaseService, type Tx } from "../database/database.service.js";
import type { Actor } from "../authorization/policy.js";
import { AuditService } from "../audit/audit.service.js";
import { MailService } from "../mail/mail.service.js";
import { hashPassword } from "../auth/auth.service.js";
import { digest, randomToken } from "../common/crypto.js";
import { AppError } from "../common/errors.js";
import { pageArgs, resultPage, userSelect } from "./administration.service.js";

const agencyInclude = { agency: true } as const;
const userView = {
  ...userSelect,
  archivedAt: true,
  tenants: {
    where: { active: true, tenant: { archivedAt: null } },
    include: { tenant: { include: agencyInclude } },
    orderBy: { createdAt: "asc" },
  },
} as const;
@Injectable()
export class ManagementService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AuditService) private audit: AuditService,
    @Inject(MailService) private mail: MailService,
  ) {}
  private manage<T>(
    actor: Actor,
    fn: (tx: Tx, current: Actor, agencyIds: string[] | null) => Promise<T>,
    mutatesAccess = false,
  ) {
    return this.db.metadata.$transaction(
      async (tx) => {
        if (mutatesAccess) await this.db.lockAccess(tx);
        const current = await this.db.actor(tx, actor);
        const agencyIds =
          current.platformRole === "GLOBAL"
            ? null
            : (
                await tx.agencyMembership.findMany({
                  where: {
                    userId: current.id,
                    active: true,
                    role: "SUPER_ADMIN",
                    agency: { active: true, archivedAt: null },
                  },
                  select: { agencyId: true },
                })
              ).map((m) => m.agencyId);
        if (agencyIds && !agencyIds.length)
          throw new AppError(403, "FORBIDDEN");
        await this.db.setContext(tx, current, null);
        return fn(tx, current, agencyIds);
      },
      { timeout: 10000 },
    );
  }
  private requireAgency(agencyIds: string[] | null, agencyId: string) {
    if (agencyIds && !agencyIds.includes(agencyId))
      throw new AppError(404, "NOT_FOUND");
  }
  private visibleUser(agencyIds: string[] | null): Prisma.UserWhereInput {
    return agencyIds
      ? {
          platformRole: null,
          AND: [
            {
              OR: [
                {
                  agencies: {
                    some: { active: true, agencyId: { in: agencyIds } },
                  },
                },
                {
                  tenants: {
                    some: {
                      active: true,
                      tenant: { agencyId: { in: agencyIds } },
                    },
                  },
                },
              ],
            },
          ],
        }
      : {};
  }
  options(actor: Actor) {
    return this.manage(actor, async (tx, current, agencyIds) => ({
      role: current.platformRole === "GLOBAL" ? "GLOBAL" : "SUPER_ADMIN",
      agencies: await tx.agency.findMany({
        where: {
          active: true,
          archivedAt: null,
          ...(agencyIds ? { id: { in: agencyIds } } : {}),
        },
        orderBy: { name: "asc" },
      }),
      clients: await tx.tenant.findMany({
        where: {
          status: "active",
          archivedAt: null,
          agency: { active: true, archivedAt: null },
          ...(agencyIds ? { agencyId: { in: agencyIds } } : {}),
        },
        include: agencyInclude,
        orderBy: { name: "asc" },
      }),
      users: await tx.user.findMany({
        where: {
          active: true,
          archivedAt: null,
          ...this.visibleUser(agencyIds),
        },
        select: userSelect,
        orderBy: { name: "asc" },
      }),
    }));
  }
  list(actor: Actor, kind: ManagementKind, p: ManagementListInput) {
    return this.manage(actor, async (tx, _current, agencyIds) => {
      if (agencyIds && kind !== "permissions")
        throw new AppError(403, "FORBIDDEN");
      if (p.agencyId) this.requireAgency(agencyIds, p.agencyId);
      const archivedAt = p.view === "archived" ? { not: null } : null;
      const match = { contains: p.search, mode: "insensitive" as const };
      if (kind === "users") {
        const where = {
          archivedAt,
          OR: [{ name: match }, { email: match }],
          ...(p.agencyId
            ? {
                tenants: {
                  some: { active: true, tenant: { agencyId: p.agencyId } },
                },
              }
            : {}),
        };
        return resultPage(
          await tx.user.findMany({
            where,
            select: userView,
            ...pageArgs(p),
            orderBy: [{ name: "asc" }, { id: "asc" }],
          }),
          await tx.user.count({ where }),
          p,
        );
      }
      if (kind === "agencies") {
        const where = {
          archivedAt,
          OR: [{ name: match }, { slug: match }],
          ...(p.agencyId ? { id: p.agencyId } : {}),
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
      }
      if (kind === "clients") {
        const where = {
          archivedAt,
          OR: [{ name: match }, { slug: match }],
          ...(p.agencyId ? { agencyId: p.agencyId } : {}),
        };
        return resultPage(
          await tx.tenant.findMany({
            where,
            include: agencyInclude,
            ...pageArgs(p),
            orderBy: [{ name: "asc" }, { id: "asc" }],
          }),
          await tx.tenant.count({ where }),
          p,
        );
      }
      const user = {
        ...this.visibleUser(agencyIds),
        archivedAt: null,
        OR: [{ name: match }, { email: match }],
      };
      const globals =
        p.agencyId || agencyIds
          ? []
          : await tx.user.findMany({
              where: { ...user, platformRole: "GLOBAL" },
              select: userSelect,
            });
      const agencies = await tx.agencyMembership.findMany({
        where: {
          active: true,
          user,
          agency: { archivedAt: null },
          ...(agencyIds ? { agencyId: { in: agencyIds } } : {}),
          ...(p.agencyId ? { agencyId: p.agencyId } : {}),
        },
        include: { user: { select: userSelect }, agency: true },
      });
      const clients = await tx.tenantMembership.findMany({
        where: {
          active: true,
          user,
          tenant: {
            archivedAt: null,
            ...(agencyIds ? { agencyId: { in: agencyIds } } : {}),
            ...(p.agencyId ? { agencyId: p.agencyId } : {}),
          },
        },
        include: {
          user: { select: userSelect },
          tenant: { include: agencyInclude },
        },
      });
      const items = [
        ...globals.map((u) => ({
          id: `global:${u.id}`,
          scope: "GLOBAL",
          role: "GLOBAL",
          user: u,
        })),
        ...agencies.map((m) => ({
          id: `agency:${m.id}`,
          scope: "AGENCY",
          role: "SUPER_ADMIN",
          user: m.user,
          agency: m.agency,
        })),
        ...clients.map((m) => ({
          id: `client:${m.id}`,
          scope: "CLIENT",
          role: m.role,
          user: m.user,
          agency: m.tenant.agency,
          client: m.tenant,
        })),
      ].sort(
        (a, b) =>
          a.user.name.localeCompare(b.user.name) || a.id.localeCompare(b.id),
      );
      return resultPage(
        items.slice((p.page - 1) * p.pageSize, p.page * p.pageSize),
        items.length,
        p,
      );
    });
  }
  private async client(tx: Tx, tenantId: string, agencyId: string) {
    const client = await tx.tenant.findFirst({
      where: {
        id: tenantId,
        agencyId,
        archivedAt: null,
        status: "active",
        agency: { active: true, archivedAt: null },
      },
    });
    if (!client)
      throw new AppError(400, "VALIDATION_ERROR", {
        tenantId: ["invalid_client"],
      });
    return client;
  }
  private async syncClients(
    tx: Tx,
    userId: string,
    clients: ManagementUserInput["clients"],
  ) {
    for (const c of clients) {
      const unchanged = await tx.tenantMembership.findFirst({
        where: {
          userId,
          tenantId: c.tenantId,
          active: true,
          role: c.role,
          tenant: { agencyId: c.agencyId, archivedAt: null },
        },
      });
      if (!unchanged) await this.client(tx, c.tenantId, c.agencyId);
      await tx.tenantMembership.upsert({
        where: { tenantId_userId: { tenantId: c.tenantId, userId } },
        create: { tenantId: c.tenantId, userId, role: c.role },
        update: { active: true, role: c.role },
      });
    }
    // Only the edited user's direct client memberships are affected.
    await tx.tenantMembership.updateMany({
      where: {
        userId,
        active: true,
        tenantId: { notIn: clients.map((c) => c.tenantId) },
        tenant: { archivedAt: null },
      },
      data: { active: false },
    });
  }
  async saveUser(
    actor: Actor,
    id: string | undefined,
    data: ManagementUserInput,
    requestId: string,
  ) {
    const passwordHash = id ? undefined : await hashPassword(randomToken());
    return this.db.global(
      actor,
      async (tx, current) => {
        const existing = id
          ? await tx.user.findFirst({ where: { id, archivedAt: null } })
          : null;
        if (id && !existing) throw new AppError(404, "NOT_FOUND");
        const user = id
          ? await tx.user.update({
              where: { id },
              data: { name: data.name, email: data.email, active: data.active },
            })
          : await tx.user.create({
              data: {
                name: data.name,
                email: data.email,
                active: data.active,
                passwordHash: passwordHash!,
                preference: { create: { locale: "pt-BR", theme: "light" } },
              },
            });
        await this.syncClients(tx, user.id, data.clients);
        await this.db.assertResponsibilities(tx);
        if (!id) {
          const token = randomToken(),
            expiresAt = new Date(Date.now() + 24 * 3600000);
          const reset = await tx.passwordReset.create({
            data: { userId: user.id, tokenHash: digest(token), expiresAt },
          });
          await this.mail.queue(
            tx,
            `reset:${reset.id}`,
            user.email,
            "reset",
            token,
            expiresAt,
          );
        } else if (!data.active || existing?.email !== data.email) {
          await tx.session.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await tx.passwordReset.updateMany({
            where: { userId: id, consumedAt: null },
            data: { consumedAt: new Date() },
          });
          if (existing?.email !== data.email)
            await tx.invitation.updateMany({
              where: {
                email: existing!.email,
                consumedAt: null,
                revokedAt: null,
              },
              data: { revokedAt: new Date() },
            });
        }
        await this.audit.record(
          tx,
          current,
          id ? "user.updated" : "user.created",
          requestId,
          { resourceId: user.id },
        );
        return tx.user.findUniqueOrThrow({
          where: { id: user.id },
          select: userView,
        });
      },
      true,
    );
  }
  saveAgency(
    actor: Actor,
    id: string | undefined,
    data: ManagementAgencyInput,
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        if (
          id &&
          !(await tx.agency.findFirst({ where: { id, archivedAt: null } }))
        )
          throw new AppError(404, "NOT_FOUND");
        const value = id
          ? await tx.agency.update({ where: { id }, data })
          : await tx.agency.create({ data });
        await this.audit.record(
          tx,
          current,
          id ? "agency.updated" : "agency.created",
          requestId,
          { agencyId: value.id, resourceId: value.id },
        );
        return value;
      },
      true,
    );
  }
  saveClient(
    actor: Actor,
    id: string | undefined,
    data: ManagementClientInput,
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const existing = id
          ? await tx.tenant.findFirst({ where: { id, archivedAt: null } })
          : null;
        if (id && !existing) throw new AppError(404, "NOT_FOUND");
        if (existing && existing.agencyId !== data.agencyId)
          throw new AppError(409, "CONFLICT");
        if (
          !(await tx.agency.findFirst({
            where: {
              id: data.agencyId,
              archivedAt: null,
              ...(data.status === "active" ? { active: true } : {}),
            },
          }))
        )
          throw new AppError(400, "VALIDATION_ERROR", {
            agencyId: ["invalid_agency"],
          });
        if (!id && !data.adminId)
          throw new AppError(400, "VALIDATION_ERROR", {
            adminId: ["required"],
          });
        const { adminId, ...fields } = data;
        const client = id
          ? await tx.tenant.update({ where: { id }, data: fields })
          : await tx.tenant.create({ data: fields });
        if (adminId) {
          if (
            !(await tx.user.findFirst({
              where: { id: adminId, active: true, archivedAt: null },
            }))
          )
            throw new AppError(400, "VALIDATION_ERROR", {
              adminId: ["invalid_admin"],
            });
          await tx.tenantMembership.upsert({
            where: {
              tenantId_userId: { tenantId: client.id, userId: adminId },
            },
            create: { tenantId: client.id, userId: adminId, role: "ADMIN" },
            update: { active: true, role: "ADMIN" },
          });
        }
        await this.db.assertResponsibilities(tx);
        await this.audit.record(
          tx,
          current,
          id ? "tenant.updated" : "tenant.created",
          requestId,
          {
            tenantId: client.id,
            agencyId: client.agencyId,
            resourceId: client.id,
          },
        );
        return client;
      },
      true,
    );
  }
  private async revoke(tx: Tx, id: string, agencyIds: string[] | null) {
    const [kind, key] = id.split(":");
    if (kind === "global") {
      if (agencyIds) throw new AppError(403, "FORBIDDEN");
      if (
        !(await tx.user.findFirst({
          where: { id: key, platformRole: "GLOBAL", archivedAt: null },
        }))
      )
        throw new AppError(404, "NOT_FOUND");
      await tx.user.update({
        where: { id: key },
        data: { platformRole: null },
      });
    } else if (kind === "agency") {
      if (
        !(await tx.agencyMembership.findFirst({
          where: {
            id: key,
            active: true,
            ...(agencyIds
              ? { agencyId: { in: agencyIds }, user: { platformRole: null } }
              : {}),
          },
        }))
      )
        throw new AppError(404, "NOT_FOUND");
      await tx.agencyMembership.update({
        where: { id: key },
        data: { active: false },
      });
    } else {
      if (
        !(await tx.tenantMembership.findFirst({
          where: {
            id: key,
            active: true,
            ...(agencyIds
              ? {
                  tenant: { agencyId: { in: agencyIds } },
                  user: { platformRole: null },
                }
              : {}),
          },
        }))
      )
        throw new AppError(404, "NOT_FOUND");
      await tx.tenantMembership.update({
        where: { id: key },
        data: { active: false },
      });
    }
  }
  savePermission(
    actor: Actor,
    id: string | undefined,
    data: PermissionInput,
    requestId: string,
  ) {
    return this.manage(
      actor,
      async (tx, current, agencyIds) => {
        if (agencyIds && data.scope === "GLOBAL")
          throw new AppError(403, "FORBIDDEN");
        if (data.agencyId) this.requireAgency(agencyIds, data.agencyId);
        if (
          !(await tx.user.findFirst({
            where: {
              id: data.userId,
              active: true,
              archivedAt: null,
              ...this.visibleUser(agencyIds),
            },
          }))
        )
          throw new AppError(400, "VALIDATION_ERROR", {
            userId: ["invalid_user"],
          });
        if (id) await this.revoke(tx, id, agencyIds);
        let resultId: string;
        if (data.scope === "GLOBAL") {
          await tx.user.update({
            where: { id: data.userId },
            data: { platformRole: "GLOBAL" },
          });
          resultId = `global:${data.userId}`;
        } else if (data.scope === "AGENCY") {
          if (
            !(await tx.agency.findFirst({
              where: { id: data.agencyId!, active: true, archivedAt: null },
            }))
          )
            throw new AppError(400, "VALIDATION_ERROR", {
              agencyId: ["invalid_agency"],
            });
          const value = await tx.agencyMembership.upsert({
            where: {
              agencyId_userId: {
                agencyId: data.agencyId!,
                userId: data.userId,
              },
            },
            create: { agencyId: data.agencyId!, userId: data.userId },
            update: { active: true },
          });
          resultId = `agency:${value.id}`;
        } else {
          await this.client(tx, data.tenantId!, data.agencyId!);
          const value = await tx.tenantMembership.upsert({
            where: {
              tenantId_userId: {
                tenantId: data.tenantId!,
                userId: data.userId,
              },
            },
            create: {
              tenantId: data.tenantId!,
              userId: data.userId,
              role: data.role!,
            },
            update: { active: true, role: data.role! },
          });
          resultId = `client:${value.id}`;
        }
        await this.db.assertResponsibilities(tx);
        await this.audit.record(
          tx,
          current,
          id ? "permission.updated" : "permission.created",
          requestId,
          {
            resourceId: resultId,
            agencyId: data.agencyId,
            tenantId: data.tenantId,
          },
        );
        return { id: resultId };
      },
      true,
    );
  }
  removePermission(actor: Actor, id: string, requestId: string) {
    return this.manage(
      actor,
      async (tx, current, agencyIds) => {
        await this.revoke(tx, id, agencyIds);
        await this.db.assertResponsibilities(tx);
        await this.audit.record(tx, current, "permission.removed", requestId, {
          resourceId: id,
        });
        return { ok: true };
      },
      true,
    );
  }
  archive(
    actor: Actor,
    kind: Exclude<ManagementKind, "permissions">,
    id: string,
    restore: boolean,
    requestId: string,
  ) {
    return this.db.global(
      actor,
      async (tx, current) => {
        const where = { id, archivedAt: restore ? { not: null } : null };
        const archivedAt = restore ? null : new Date();
        if (kind === "users") {
          if (!(await tx.user.findFirst({ where })))
            throw new AppError(404, "NOT_FOUND");
          await tx.user.update({
            where: { id },
            data: { archivedAt, active: restore },
          });
          await tx.session.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await tx.passwordReset.updateMany({
            where: { userId: id, consumedAt: null },
            data: { consumedAt: new Date() },
          });
        } else if (kind === "agencies") {
          if (!(await tx.agency.findFirst({ where })))
            throw new AppError(404, "NOT_FOUND");
          await tx.agency.update({
            where: { id },
            data: { archivedAt, active: restore },
          });
        } else {
          const client = await tx.tenant.findFirst({
            where,
            include: agencyInclude,
          });
          if (!client) throw new AppError(404, "NOT_FOUND");
          if (restore && (!client.agency.active || client.agency.archivedAt))
            throw new AppError(409, "CONFLICT");
          await tx.tenant.update({
            where: { id },
            data: { archivedAt, status: restore ? "active" : "disabled" },
          });
        }
        await this.db.assertResponsibilities(tx);
        await this.audit.record(
          tx,
          current,
          `${kind}.${restore ? "restored" : "archived"}`,
          requestId,
          { resourceId: id },
        );
        return { ok: true };
      },
      true,
    );
  }
}
