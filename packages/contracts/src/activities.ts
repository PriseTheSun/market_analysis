import { z } from "zod";

export const activityModuleSchema = z.enum([
  "management",
  "clients",
  "members",
  "requests",
  "files",
  "chat",
  "ai",
  "preferences",
  "notifications",
  "audit",
]);
export type ActivityModule = z.infer<typeof activityModuleSchema>;
export const activityActionSchema = z.enum([
  "created",
  "updated",
  "access",
  "archived",
  "restored",
  "deleted",
  "approved",
  "rejected",
  "resent",
  "accepted",
  "connected",
  "disconnected",
  "read",
]);
export type ActivityAction = z.infer<typeof activityActionSchema>;
export const activityQuerySchema = z.object({
  module: activityModuleSchema,
  tenantId: z.uuid().optional(),
  agencyId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  period: z.enum(["7", "30", "90", "all"]).default("30"),
  action: activityActionSchema.optional(),
  person: z.string().trim().max(160).default(""),
  search: z.string().trim().max(160).default(""),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export const activityValueSchema = z.union([
  z.string().max(300),
  z.boolean(),
  z.number(),
  z.null(),
]);
export const activityFields = [
  "name",
  "email",
  "slug",
  "active",
  "archived",
  "status",
  "role",
  "platformRole",
  "agency",
  "client",
  "source",
  "chatText",
  "imageGeneration",
  "locale",
  "theme",
  "timeZone",
] as const;
export const activityChangeSchema = z.object({
  field: z.enum(activityFields),
  before: activityValueSchema,
  after: activityValueSchema,
});
// Intentionally an allowlist: secrets, provider payloads and conversation text never belong here.
export const activityDisplaySchema = z.object({
  version: z.literal(1),
  actorName: z.string().max(160).nullable(),
  resourceName: z.string().max(300).nullable(),
  agencyName: z.string().max(160).nullable(),
  tenantName: z.string().max(160).nullable(),
  changes: z.array(activityChangeSchema).max(30),
  detailsRecorded: z.boolean(),
  platformOnly: z.boolean(),
});
export type ActivityDisplay = z.infer<typeof activityDisplaySchema>;
export type ActivityChange = z.infer<typeof activityChangeSchema>;
export interface ActivityItem {
  id: string;
  action: ActivityAction;
  event: string;
  entity: string;
  actor: { name: string | null; system: boolean };
  resourceName: string | null;
  agencyName: string | null;
  tenantName: string | null;
  createdAt: string;
  reason: string | null;
  changes: ActivityChange[];
  detailsRecorded: boolean;
  href: string | null;
}
export interface ActivityPage {
  items: ActivityItem[];
  total: number;
  page: number;
  pageSize: number;
  scope: {
    name: string | null;
    kind: "platform" | "agency" | "tenant" | "personal";
    role: "GLOBAL" | "SUPER_ADMIN" | "ADMIN" | "USER";
    capabilities: string[];
  };
}
