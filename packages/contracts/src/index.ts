import { z } from "zod";
export * from "./routes.js";
export * from "./management.js";

export const locales = ["pt-BR", "en", "es"] as const;
export const localeSchema = z.enum(locales);
export const roleSchema = z.enum(["ADMIN", "USER"]);
export type TenantRole = z.infer<typeof roleSchema>;
export type Locale = z.infer<typeof localeSchema>;
export const idSchema = z.uuid();
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
  remember: z.boolean().default(false),
});
export const recoverySchema = z.strictObject({ email: emailSchema });
export const resetSchema = z.strictObject({
  token: z.string().min(32).max(256),
  password: passwordSchema,
});
export const invitationAcceptSchema = z.strictObject({
  token: z.string().min(32).max(256),
  password: passwordSchema.optional(),
  name: z.string().trim().min(2).max(160).optional(),
});
export const accessRequestSchema = z.strictObject({
  name: z.string().trim().min(2).max(160),
  email: emailSchema,
  organization: z.string().trim().min(2).max(160),
  message: z.string().trim().max(2000).optional(),
});
export const classifySchema = z.strictObject({ tenantId: idSchema });
export const reviewSchema = z.strictObject({
  decision: z.enum(["approved", "rejected"]),
  role: roleSchema.default("USER"),
  reason: z.string().trim().max(1000).optional(),
});
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(160).default(""),
});
export const requestListSchema = paginationSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});
export const agencyListSchema = paginationSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});
export const invitationSchema = z.strictObject({
  email: emailSchema,
  role: roleSchema,
});
export const membershipSchema = z
  .strictObject({ role: roleSchema.optional(), active: z.boolean().optional() })
  .refine((v) => v.role !== undefined || v.active !== undefined);
export const agencySchema = z.strictObject({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
});
export const agencyUpdateSchema = agencySchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .strict();
export const tenantCreateSchema = agencySchema.extend({
  agencyId: idSchema,
  adminEmail: emailSchema,
});
export const tenantUpdateSchema = agencySchema
  .partial()
  .extend({ status: z.enum(["active", "disabled"]).optional() })
  .strict();
export const agencyMembershipSchema = z.strictObject({
  email: emailSchema,
  active: z.boolean(),
});
export const platformRoleSchema = z.strictObject({
  global: z.boolean(),
  reason: z.string().trim().min(5).max(1000),
});
export const accountStatusSchema = z.strictObject({
  active: z.boolean(),
  reason: z.string().trim().min(5).max(1000),
});
export const preferenceSchema = z.strictObject({
  locale: localeSchema.optional(),
  theme: z.enum(["light", "dark"]).optional(),
  timeZone: z
    .string()
    .max(80)
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    })
    .optional(),
});
export const tourSchema = z.strictObject({
  version: z.number().int().min(1).max(1000),
  status: z.enum(["started", "completed", "dismissed"]),
  step: z.number().int().min(0).max(100),
});
export const uploadSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(26214400),
  type: z.string().max(160),
});
export const conversationSchema = z.strictObject({
  title: z.string().trim().min(1).max(160).optional(),
});
export const messageSchema = z.strictObject({
  content: z.string().trim().min(1).max(8000),
  operationId: idSchema,
  locale: localeSchema,
  retryOf: idSchema.optional(),
});
export const auditReadSchema = z.strictObject({
  reason: z.string().trim().min(5).max(1000),
});
export const errorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "LAST_ADMIN",
  "LAST_GLOBAL",
  "INVALID_TOKEN",
  "INVALID_CREDENTIALS",
  "RATE_LIMITED",
  "CSRF_INVALID",
  "SERVICE_UNAVAILABLE",
  "UPLOAD_INVALID",
  "UPLOAD_TOO_LARGE",
  "OPERATION_ACTIVE",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof errorCodes)[number];
export interface ApiError {
  code: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  platformRole: "GLOBAL" | null;
  avatarUrl: string | null;
}
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export interface Preference {
  locale: Locale;
  theme: "light" | "dark" | null;
  timeZone: string;
}
export interface SessionView {
  user: PublicUser;
  preference: Preference;
}
export interface Context {
  id: string;
  name: string;
  agencyId: string;
  agencyName: string;
  role: "GLOBAL" | "SUPER_ADMIN" | TenantRole;
}
