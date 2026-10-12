import { z } from "zod";

export const aiErrorCodes = [
  "AI_NOT_CONFIGURED",
  "AI_CONNECTION_EXPIRED",
  "AI_CREDENTIAL_REJECTED",
  "AI_MODEL_INCOMPATIBLE",
  "AI_PROVIDER_QUOTA",
  "AI_LOCAL_LIMIT",
  "AI_TIMEOUT",
  "AI_CONTENT_BLOCKED",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_BUDGET_UNSUPPORTED",
  "AI_PREVIEW_EXPIRED",
  "AI_CONTEXT_TOO_LARGE",
] as const;
export const aiErrorCodeSchema = z.enum(aiErrorCodes);
export const aiSourceSchema = z.enum(["managed", "temporary"]);
export const aiFeatureSchema = z.enum(["chatText", "imageGeneration"]);
export const aiEnvironmentSchema = z.enum([
  "local",
  "test",
  "staging",
  "production",
  "unknown",
]);
export const aiModelIdSchema = z
  .string()
  .max(160)
  .regex(/^models\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
export const aiRevisionSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9._:-]+$/);
const count = z.number().int().nonnegative().safe();
const timestamp = z.iso.datetime();

export const aiModelsSchema = z.strictObject({
  chatText: aiModelIdSchema.nullable(),
  imageGeneration: aiModelIdSchema.nullable(),
});
// Legacy wire fields are accepted for older clients; the server ignores them.
export const aiLocalPolicySchema = z.strictObject({
  warnAt80: z.boolean(),
  pauseAtLimit: z.boolean(),
});
export const aiSettingsInputSchema = z
  .strictObject({
    scope: z.enum(["managed", "local"]),
    expectedVersion: count,
    source: aiSourceSchema,
    connectionRevision: aiRevisionSchema,
    models: aiModelsSchema,
    localPolicy: aiLocalPolicySchema.optional(),
  })
  .refine(
    (v) => v.scope === "local" || (v.source === "managed" && !v.localPolicy),
    {
      path: ["scope"],
      message: "Local options require a local scope",
    },
  );
export const aiLocalConnectionInputSchema = z.strictObject({
  provider: z.literal("gemini"),
  token: z
    .string()
    .trim()
    .min(16)
    .max(512)
    .regex(/^[\x21-\x7E]+$/),
});
export const aiConnectionSchema = z.strictObject({
  status: z.enum(["not_configured", "connected", "expired", "unavailable"]),
  revision: aiRevisionSchema.nullable(),
  expiresAt: timestamp.nullable(),
  errorCode: aiErrorCodeSchema.nullable(),
});
export const aiModelSchema = z.strictObject({
  id: aiModelIdSchema,
  label: z.string().min(1).max(200),
  features: z.array(aiFeatureSchema).min(1),
  inputTokenLimit: count,
  outputTokenLimit: count,
  strictBudgetSupported: z.boolean(),
});
export const aiCatalogSchema = z.strictObject({
  source: aiSourceSchema,
  connectionRevision: aiRevisionSchema,
  fetchedAt: timestamp,
  models: z.array(aiModelSchema).max(1000),
});
export const aiConfigurationSchema = z.strictObject({
  scope: z.enum(["managed", "local"]),
  exists: z.boolean(),
  version: count,
  source: aiSourceSchema,
  connectionRevision: aiRevisionSchema.nullable(),
  models: aiModelsSchema,
  localPolicy: aiLocalPolicySchema,
});
export const aiSettingsSchema = z.strictObject({
  environment: aiEnvironmentSchema,
  enabled: z.boolean(),
  localTokenAllowed: z.boolean(),
  serverTime: timestamp,
  configuration: aiConfigurationSchema,
  connections: z.strictObject({
    managed: aiConnectionSchema,
    temporary: aiConnectionSchema,
  }),
});
export const aiModelTestInputSchema = z.strictObject({
  operationId: z.uuid(),
  feature: aiFeatureSchema,
  source: aiSourceSchema,
  modelId: aiModelIdSchema,
  connectionRevision: aiRevisionSchema,
});
export const aiTokenUsageSchema = z.strictObject({
  input: count.nullable(),
  output: count.nullable(),
  thinking: count.nullable(),
  total: count.nullable(),
});
export const aiOperationSchema = z.strictObject({
  id: z.uuid(),
  feature: aiFeatureSchema,
  modelId: aiModelIdSchema,
  status: z.enum([
    "queued",
    "running",
    "completed",
    "failed",
    "cancelled",
    "interrupted",
  ]),
  errorCode: aiErrorCodeSchema.nullable(),
  text: z.string().nullable(),
  previewAvailable: z.boolean(),
  previewExpiresAt: timestamp.nullable(),
  usage: aiTokenUsageSchema,
});
export const aiUsageSchema = z.strictObject({
  scope: z.enum(["local", "managed"]),
  windowStart: timestamp,
  resetsAt: timestamp,
  confirmed: count,
  reserved: count,
  estimated: count,
  input: count,
  output: count,
  thinking: count,
  unknownOperations: count,
  imageOperations: count,
  tokenLimit: count.nullable(),
  imageLimit: count.nullable(),
  providerQuota: z.null(),
  localPolicy: aiLocalPolicySchema,
});
export type AiSource = z.infer<typeof aiSourceSchema>;
export type AiFeature = z.infer<typeof aiFeatureSchema>;
export type AiModel = z.infer<typeof aiModelSchema>;
export type AiCatalog = z.infer<typeof aiCatalogSchema>;
export type AiConfiguration = z.infer<typeof aiConfigurationSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsInputSchema>;
export type AiConnection = z.infer<typeof aiConnectionSchema>;
export type AiModelTestInput = z.infer<typeof aiModelTestInputSchema>;
export type AiOperation = z.infer<typeof aiOperationSchema>;
export type AiTokenUsage = z.infer<typeof aiTokenUsageSchema>;
export type AiUsage = z.infer<typeof aiUsageSchema>;
export type AiErrorCode = z.infer<typeof aiErrorCodeSchema>;
