import { z } from "zod";

const id = z.uuid();
const name = z.string().trim().min(2).max(160);
const email = z.string().trim().toLowerCase().email().max(254);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
export const managementKindSchema = z.enum([
  "users",
  "permissions",
  "agencies",
  "clients",
]);
export type ManagementKind = z.infer<typeof managementKindSchema>;
export const managementListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(160).default(""),
  agencyId: id.optional(),
  view: z.enum(["current", "archived"]).default("current"),
});
export const clientAccessSchema = z.strictObject({
  agencyId: id,
  tenantId: id,
  role: z.enum(["ADMIN", "USER"]),
});
export const managementUserSchema = z
  .strictObject({
    name,
    email,
    active: z.boolean().default(true),
    clients: z.array(clientAccessSchema).max(200).default([]),
  })
  .refine(
    (v) => new Set(v.clients.map((c) => c.tenantId)).size === v.clients.length,
    { path: ["clients"], message: "duplicate" },
  );
export const managementAgencySchema = z.strictObject({
  name,
  slug,
  active: z.boolean().default(true),
});
export const managementClientSchema = z.strictObject({
  name,
  slug,
  agencyId: id,
  status: z.enum(["active", "disabled"]).default("active"),
  adminId: id.optional(),
});
export const permissionSchema = z
  .strictObject({
    userId: id,
    scope: z.enum(["GLOBAL", "AGENCY", "CLIENT"]),
    agencyId: id.optional(),
    tenantId: id.optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
  })
  .superRefine((v, ctx) => {
    for (const field of v.scope === "CLIENT"
      ? (["agencyId", "tenantId", "role"] as const)
      : v.scope === "AGENCY"
        ? (["agencyId"] as const)
        : []) {
      if (!v[field])
        ctx.addIssue({ code: "custom", path: [field], message: "required" });
    }
    if (v.scope !== "CLIENT" && (v.tenantId || v.role))
      ctx.addIssue({
        code: "custom",
        path: ["scope"],
        message: "invalid scope",
      });
    if (v.scope === "GLOBAL" && v.agencyId)
      ctx.addIssue({
        code: "custom",
        path: ["agencyId"],
        message: "invalid scope",
      });
  });
export const permissionIdSchema = z
  .string()
  .regex(/^(global|agency|client):[0-9a-f-]{36}$/)
  .refine(
    (value) => id.safeParse(value.split(":")[1]).success,
    "invalid identifier",
  );
export type ManagementUserInput = z.infer<typeof managementUserSchema>;
export type ManagementAgencyInput = z.infer<typeof managementAgencySchema>;
export type ManagementClientInput = z.infer<typeof managementClientSchema>;
export type PermissionInput = z.infer<typeof permissionSchema>;
export type ManagementListInput = z.infer<typeof managementListSchema>;

export interface ManagementAgency {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  archivedAt: string | null;
}
export interface ManagementClient {
  id: string;
  name: string;
  slug: string;
  agencyId: string;
  status: string;
  archivedAt: string | null;
  agency: ManagementAgency;
}
export interface ManagementUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  platformRole: "GLOBAL" | null;
  archivedAt: string | null;
  tenants: { id: string; role: "ADMIN" | "USER"; tenant: ManagementClient }[];
}
export interface ManagementPermission {
  id: string;
  scope: "GLOBAL" | "AGENCY" | "CLIENT";
  role: "GLOBAL" | "SUPER_ADMIN" | "ADMIN" | "USER";
  user: { id: string; name: string; email: string };
  agency?: ManagementAgency;
  client?: ManagementClient;
}
export interface ManagementOptions {
  agencies: ManagementAgency[];
  clients: ManagementClient[];
  users: { id: string; name: string; email: string }[];
}
