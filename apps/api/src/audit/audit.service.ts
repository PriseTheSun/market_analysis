import { Injectable } from "@nestjs/common";
import {
  activityDisplaySchema,
  activityFields,
  type ActivityChange,
} from "@market/contracts";
import type { Tx } from "../database/database.service.js";
import type { Actor } from "../authorization/policy.js";
import { activityEvents } from "./activity-events.js";

type Values = Partial<
  Record<(typeof activityFields)[number], string | boolean | number | null>
>;
export interface ActivitySnapshot {
  name: string | null;
  tenantId?: string;
  agencyId?: string;
  agencyName?: string;
  tenantName?: string;
  fields: Values;
}
interface AuditDetails {
  tenantId?: string;
  agencyId?: string;
  resourceId?: string;
  reason?: string;
  result?: string;
  before?: ActivitySnapshot | null;
  platformOnly?: boolean;
}
const short = (value: string) => value.slice(0, 300);
export function activityChanges(
  before: ActivitySnapshot | null | undefined,
  after: ActivitySnapshot | null,
): ActivityChange[] {
  if (before === undefined || !after) return [];
  return activityFields.flatMap((field) => {
    const a = before?.fields[field] ?? null,
      b = after.fields[field] ?? null;
    return a === b ? [] : [{ field, before: a, after: b }];
  });
}
@Injectable()
export class AuditService {
  async snapshot(
    tx: Tx,
    action: string,
    id?: string,
    scope: { agencyId?: string; tenantId?: string } = {},
  ): Promise<ActivitySnapshot | null> {
    const entity = activityEvents[action]?.entity;
    if (!entity || !id) return null;
    let value: ActivitySnapshot | null = null;
    if (entity === "user" || entity === "avatar") {
      const x = await tx.user.findUnique({
        where: { id },
        select: {
          name: true,
          email: true,
          active: true,
          platformRole: true,
          archivedAt: true,
        },
      });
      if (x)
        value = {
          name: x.name,
          fields: {
            name: x.name,
            email: x.email,
            active: x.active,
            platformRole: x.platformRole,
            archived: !!x.archivedAt,
          },
        };
    } else if (entity === "agency") {
      const x = await tx.agency.findUnique({ where: { id } });
      if (x)
        value = {
          name: x.name,
          agencyId: x.id,
          fields: {
            name: x.name,
            slug: x.slug,
            active: x.active,
            archived: !!x.archivedAt,
          },
        };
    } else if (entity === "client") {
      const x = await tx.tenant.findUnique({ where: { id } });
      if (x)
        value = {
          name: x.name,
          tenantId: x.id,
          agencyId: x.agencyId,
          fields: {
            name: x.name,
            slug: x.slug,
            status: x.status,
            archived: !!x.archivedAt,
          },
        };
    } else if (
      entity === "permission" ||
      entity === "membership" ||
      entity === "agencyMembership"
    ) {
      const [kind, key] =
        entity === "permission"
          ? id.split(":")
          : [entity === "membership" ? "client" : "agencyUser", id];
      if (kind === "global") {
        const x = await tx.user.findUnique({
          where: { id: key },
          select: { name: true, platformRole: true },
        });
        if (x)
          value = {
            name: x.name,
            fields: {
              name: x.name,
              role: x.platformRole,
              active: x.platformRole === "GLOBAL",
            },
          };
      } else if (kind === "agency" || kind === "agencyUser") {
        const x = await tx.agencyMembership.findFirst({
          where:
            kind === "agency"
              ? { id: key }
              : { userId: key, agencyId: scope.agencyId },
          include: { user: { select: { name: true } } },
        });
        if (x)
          value = {
            name: x.user.name,
            agencyId: x.agencyId,
            fields: { name: x.user.name, role: x.role, active: x.active },
          };
      } else if (kind === "client") {
        const x = await tx.tenantMembership.findUnique({
          where: { id: key },
          include: { user: { select: { name: true } } },
        });
        if (x)
          value = {
            name: x.user.name,
            tenantId: x.tenantId,
            fields: { name: x.user.name, role: x.role, active: x.active },
          };
      }
    } else if (entity === "request") {
      const x = await tx.accessRequest.findUnique({
        where: { id },
        select: {
          name: true,
          email: true,
          status: true,
          tenantId: true,
          agencyId: true,
          invitation: { select: { role: true } },
        },
      });
      if (x)
        value = {
          name: x.name,
          tenantId: x.tenantId ?? undefined,
          agencyId: x.agencyId ?? undefined,
          fields: {
            name: x.name,
            email: x.email,
            status: x.status,
            role: x.invitation?.role ?? null,
          },
        };
    } else if (entity === "invitation") {
      const x = await tx.invitation.findUnique({
        where: { id },
        select: { email: true, role: true, tenantId: true },
      });
      if (x)
        value = {
          name: x.email,
          tenantId: x.tenantId,
          fields: { email: x.email, role: x.role },
        };
    } else if (entity === "file") {
      const x = await tx.storedFile.findUnique({
        where: { id },
        select: { name: true, status: true, tenantId: true },
      });
      if (x)
        value = {
          name: x.name,
          tenantId: x.tenantId,
          fields: { name: x.name, status: x.status },
        };
    } else if (entity === "ai") {
      const x = await tx.aiConfiguration.findUnique({
        where: { key: id },
        select: { source: true, chatText: true, imageGeneration: true },
      });
      if (x) value = { name: null, fields: x };
    } else if (entity === "preferences") {
      const x = await tx.userPreference.findUnique({
        where: { userId: id },
        select: { locale: true, theme: true, timeZone: true },
      });
      value = {
        name: null,
        fields: x ?? {
          locale: "pt-BR",
          theme: null,
          timeZone: "America/Sao_Paulo",
        },
      };
    }
    if (!value) return null;
    if (value.tenantId) {
      const tenant = await tx.tenant.findUnique({
        where: { id: value.tenantId },
        select: { name: true, agencyId: true },
      });
      if (tenant) {
        value.tenantName = tenant.name;
        value.agencyId = tenant.agencyId;
        if (entity !== "client") value.fields.client = tenant.name;
      }
    }
    if (value.agencyId) {
      const agency = await tx.agency.findUnique({
        where: { id: value.agencyId },
        select: { name: true },
      });
      if (agency) {
        value.agencyName = agency.name;
        if (entity !== "agency") value.fields.agency = agency.name;
      }
    }
    return value;
  }
  async record(
    tx: Tx,
    actor: Actor | null,
    action: string,
    requestId: string,
    details: AuditDetails = {},
  ) {
    const { before, platformOnly, ...data } = details;
    let display;
    if (activityEvents[action]) {
      const after = await this.snapshot(
        tx,
        action,
        details.resourceId,
        details,
      );
      const snapshot = after ?? before;
      data.tenantId ??= snapshot?.tenantId;
      data.agencyId ??= snapshot?.agencyId;
      const [user, tenant, agency] = await Promise.all([
        actor
          ? tx.user.findUnique({
              where: { id: actor.id },
              select: { name: true },
            })
          : null,
        data.tenantId
          ? tx.tenant.findUnique({
              where: { id: data.tenantId },
              select: { name: true, agencyId: true },
            })
          : null,
        data.agencyId
          ? tx.agency.findUnique({
              where: { id: data.agencyId },
              select: { name: true },
            })
          : null,
      ]);
      data.agencyId ??= tenant?.agencyId;
      const agencyName =
        agency?.name ??
        snapshot?.agencyName ??
        (data.agencyId
          ? (
              await tx.agency.findUnique({
                where: { id: data.agencyId },
                select: { name: true },
              })
            )?.name
          : null);
      display = activityDisplaySchema.parse({
        version: 1,
        actorName: user?.name ?? null,
        resourceName: snapshot?.name ? short(snapshot.name) : null,
        agencyName: agencyName ?? null,
        tenantName: tenant?.name ?? snapshot?.tenantName ?? null,
        changes: activityChanges(before, after),
        detailsRecorded:
          before !== undefined ||
          !["updated", "access"].includes(activityEvents[action]!.action),
        // A change spanning scopes is visible to Global only; never disclose the former scope to a new one.
        platformOnly:
          platformOnly ||
          !!(
            before &&
            after &&
            (before.tenantId ||
              before.agencyId ||
              activityEvents[action]?.entity !== "request") &&
            (before.tenantId !== after.tenantId ||
              before.agencyId !== after.agencyId)
          ),
      });
    }
    return tx.auditLog.create({
      data: {
        actorId: actor?.id,
        action,
        requestId,
        ...data,
        result: data.result ?? "success",
        ...(display ? { display } : {}),
      },
    });
  }
}
