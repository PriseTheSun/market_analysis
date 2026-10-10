import { z } from "zod";
const limits = z
  .string()
  .default("{}")
  .transform((value, ctx) => {
    try {
      return z
        .record(z.string(), z.number().int().min(1).max(10000))
        .parse(JSON.parse(value));
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid rate limits" });
      return z.NEVER;
    }
  });
const envSchema = z.object({
  RATE_LIMITS_JSON: limits,
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.url(),
  ALLOWED_ORIGINS: z.string().min(1),
  SESSION_SECRET: z.string().regex(/^[a-f0-9]{64}$/),
  OUTBOX_KEY: z.string().regex(/^[a-f0-9]{64}$/),
  S3_ENDPOINT: z.url(),
  S3_PUBLIC_ENDPOINT: z.url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(26214400)
    .default(26214400),
  TENANT_STORAGE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1073741824),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  MAIL_FROM: z.string().min(1),
  CHAT_PROVIDER: z.enum(["demo", "unavailable"]).default("unavailable"),
  CHAT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(300000)
    .default(120000),
  CHAT_OUTPUT_MAX_CHARS: z.coerce
    .number()
    .int()
    .positive()
    .max(100000)
    .default(32000),
});
export type Config = z.infer<typeof envSchema>;
export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      "Invalid environment keys: " +
        result.error.issues.map((x) => x.path.join(".")).join(", "),
    );
  return result.data;
}
export const CONFIG = Symbol("CONFIG");
