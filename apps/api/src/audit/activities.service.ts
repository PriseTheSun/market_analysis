import { Inject, Injectable } from "@nestjs/common";
import {
  activityDisplaySchema,
  type ActivityPage,
  type ActivityQuery,
  type ActivityItem,
} from "@market/contracts";
import { Prisma, type AuditLog } from "../generated/prisma/client.js";
import { DatabaseService, type Tx } from "../database/database.service.js";
import type { Actor } from "../authorization/policy.js";
import { AppError } from "../common/errors.js";
import { activityEvents } from "./activity-events.js";

@Injectable()
export class ActivitiesService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}
  list(
    actor: Actor,
    query: ActivityQuery,
    requestId: string,
  ): Promise<ActivityPage> {
    return this.db.personal(actor, async (tx, current) => {
      const { where: authorized, scope } = await this.scope(
        tx,
        current,
        query,
        requestId,
      );
      const actions = Object.entries(activityEvents)
        .filter(
          ([, definition]) =>
            definition.modules.includes(query.module) &&
            (!query.action || definition.action === query.action),
        )
        .map(([key]) => key);
      const conditions: Prisma.AuditLogWhereInput[] = [
        authorized,
        { action: { in: actions }, result: "success" },
      ];
      if (query.period !== "all")
        conditions.push({
          createdAt: {
            gte: new Date(Date.now() - Number(query.period) * 86400000),
          },
        });
      if (query.search)
        conditions.push({
          display: {
            path: ["resourceName"],
            string_contains: query.search,
            mode: "insensitive",
          },
        });
      if (query.person) {
        const actors = await tx.user.findMany({
          where: { name: { contains: query.person, mode: "insensitive" } },
          select: { id: true },
        });
        conditions.push({
          OR: [
            {
              display: {
                path: ["actorName"],
                string_contains: query.person,
                mode: "insensitive",
              },
            },
            {
              display: { equals: Prisma.DbNull },
              actorId: { in: actors.map((x) => x.id) },
            },
          ],
        });
      }
      const where = { AND: conditions };
      const [rows, total] = await Promise.all([
        tx.auditLog.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        tx.auditLog.count({ where }),
      ]);
      const items = await Promise.all(
        rows.map(async (row): Promise<ActivityItem> => {
          const parsed = activityDisplaySchema.safeParse(row.display);
          const display = parsed.success ? parsed.data : null;
          const legacyActor =
            !display && row.actorId
              ? await tx.user.findUnique({
                  where: { id: row.actorId },
                  select: { name: true },
                })
              : null;
          const definition = activityEvents[row.action]!;
          return {
            id: row.id,
            event: row.action,
            action: definition.action,
            entity: definition.entity,
            actor: {
              name: display?.actorName ?? legacyActor?.name ?? null,
              system: !row.actorId,
            },
            resourceName: display?.resourceName ?? null,
            agencyName: display?.agencyName ?? null,
            tenantName: display?.tenantName ?? null,
            createdAt: row.createdAt.toISOString(),
            reason: row.reason?.slice(0, 1000) ?? null,
            changes: display?.changes ?? [],
            detailsRecorded: display?.detailsRecorded ?? false,
            href: await this.link(tx, current, row, query),
          };
        }),
      );
      return {
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
        scope,
      };
    });
  }
  private async scope(
    tx: Tx,
    actor: Actor,
    q: ActivityQuery,
    requestId: string,
  ): Promise<{
    where: Prisma.AuditLogWhereInput;
    scope: ActivityPage["scope"];
  }> {
    const global = actor.platformRole === "GLOBAL";
    const scope: ActivityPage["scope"] = {
      name: null,
      kind: "platform",
      role: global ? "GLOBAL" : "USER",
      capabilities: [],
    };
    const conditions: Prisma.AuditLogWhereInput[] = [];
    if (!global)
      conditions.push({
        OR: [
          { display: { equals: Prisma.DbNull } },
          { display: { path: ["platformOnly"], equals: false } },
        ],
      });
    if (q.tenantId && q.agencyId) throw new AppError(400, "VALIDATION_ERROR");
    if (q.tenantId) {
      if (["management", "clients", "ai"].includes(q.module))
        throw new AppError(403, "FORBIDDEN");
      const action =
        q.module === "files"
          ? "files"
          : q.module === "members"
            ? "members"
            : q.module === "requests"
              ? "requests"
              : "chat";
      const context = await this.db.context(
        tx,
        actor,
        q.tenantId,
        action,
        requestId,
      );
      await this.db.setContext(tx, actor, q.tenantId);
      const tenant = await tx.tenant.findUniqueOrThrow({
        where: { id: q.tenantId },
        select: { name: true },
      });
      scope.kind = "tenant";
      scope.name = tenant.name;
      scope.role = context.role;
      conditions.push({ tenantId: q.tenantId });
    } else if (q.agencyId || (!global && q.module === "management")) {
      if (!["clients", "management"].includes(q.module))
        throw new AppError(403, "FORBIDDEN");
      const memberships = await tx.agencyMembership.findMany({
        where: {
          userId: actor.id,
          active: true,
          agency: { active: true, archivedAt: null },
        },
        select: { agencyId: true },
      });
      const agencyIds = memberships.map((x) => x.agencyId);
      if (
        !global &&
        (!agencyIds.length || (q.agencyId && !agencyIds.includes(q.agencyId)))
      )
        throw new AppError(403, "FORBIDDEN");
      if (q.agencyId) {
        const agency = await tx.agency.findFirst({
          where: { id: q.agencyId, active: true, archivedAt: null },
          select: { name: true },
        });
        if (!agency) throw new AppError(404, "NOT_FOUND");
        scope.name = agency.name;
      }
      scope.kind = "agency";
      scope.role = global ? "GLOBAL" : "SUPER_ADMIN";
      conditions.push({ agencyId: q.agencyId ?? { in: agencyIds } });
      if (!global && q.module === "management")
        conditions.push({
          action: {
            in: [
              "permission.created",
              "permission.updated",
              "permission.removed",
              "membership.updated",
              "agency.super-admin.updated",
            ],
          },
        });
    } else if (!global && q.module !== "preferences")
      throw new AppError(403, "FORBIDDEN");
    if (["files", "members", "chat", "audit"].includes(q.module) && !q.tenantId)
      throw new AppError(400, "VALIDATION_ERROR");
    if (["ai", "audit"].includes(q.module) && !global)
      throw new AppError(403, "FORBIDDEN");
    if (["chat", "preferences", "notifications"].includes(q.module)) {
      conditions.push({ actorId: actor.id });
      // Preferences belong to the account, independent of the currently selected client.
      if (q.module === "preferences") {
        conditions.splice(0, conditions.length, { actorId: actor.id });
        scope.kind = "personal";
        scope.name = null;
      }
    }
    const capabilities: Record<string, string[]> = {
      management: global
        ? ["users", "agencies", "clients", "permissions", "archive"]
        : ["permissions"],
      clients: global ? ["clients", "archive"] : ["viewClients"],
      members: ["invite", "permissions"],
      requests: ["reviewRequests"],
      files: ["uploadFiles", "deleteFiles"],
      chat: ["ownChat"],
      ai: ["configureAi"],
      preferences: ["ownPreferences"],
      notifications: ["ownNotifications"],
      audit: ["auditConversations"],
    };
    scope.capabilities = capabilities[q.module] ?? [];
    return { where: { AND: conditions }, scope };
  }
  // Links are recomputed from live records and authorization, never trusted from stored metadata.
  private async link(
    tx: Tx,
    actor: Actor,
    row: AuditLog,
    q: ActivityQuery,
  ): Promise<string | null> {
    const id = row.resourceId;
    if (!id) return null;
    const entity = activityEvents[row.action]?.entity;
    if (
      actor.platformRole === "GLOBAL" &&
      ["user", "agency", "client"].includes(entity ?? "")
    ) {
      const item =
        entity === "user"
          ? await tx.user.findFirst({
              where: { id, archivedAt: null },
              select: { id: true, name: true, email: true },
            })
          : entity === "agency"
            ? await tx.agency.findFirst({
                where: { id, archivedAt: null },
                select: { id: true, name: true },
              })
            : await tx.tenant.findFirst({
                where: { id, archivedAt: null },
                select: { id: true, name: true },
              });
      if (!item) return null;
      const tab =
        entity === "user"
          ? "users"
          : entity === "agency"
            ? "agencies"
            : "clients";
      return `/platform/management?${new URLSearchParams({ tab, search: "email" in item && typeof item.email === "string" ? item.email : item.name, record: item.id })}`;
    }
    if (entity === "conversation" && q.module === "chat" && q.tenantId) {
      const item = await tx.conversation.findFirst({
        where: { id, tenantId: q.tenantId, ownerId: actor.id },
        select: { id: true },
      });
      return item ? `/app/${q.tenantId}/chat?conversation=${item.id}` : null;
    }
    // Other modules currently have no stable record detail route.
    return null;
  }
}
