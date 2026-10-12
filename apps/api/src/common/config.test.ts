import { describe, expect, it } from "vitest";
import { loadConfig, localAiAllowed } from "./config.js";
const environment = {
  DATABASE_URL: "postgresql://example.test/database",
  APP_ORIGIN: "http://localhost:8080",
  ALLOWED_ORIGINS: "http://localhost:8080",
  SESSION_SECRET: "a".repeat(64),
  OUTBOX_KEY: "b".repeat(64),
  S3_ENDPOINT: "http://localhost:8333",
  S3_PUBLIC_ENDPOINT: "http://localhost:8333",
  S3_BUCKET: "test",
  S3_ACCESS_KEY: "test",
  S3_SECRET_KEY: "test",
  SMTP_HOST: "localhost",
  MAIL_FROM: "test@example.test",
};
describe("AI environment protection", () => {
  it("starts with no Gemini or AWS credential and disables the integration by default", () => {
    const config = loadConfig(environment);
    expect(config.AI_GEMINI_SECRET_ID).toBe("");
    expect(config.AI_GEMINI_ENABLED).toBe("false");
    expect(localAiAllowed(config)).toBe(false);
  });
  it("requires an explicit local environment and both opt-ins", () => {
    const enabled = {
      ...environment,
      AI_GEMINI_ENABLED: "true",
      AI_LOCAL_TOKEN_ENABLED: "true",
    };
    for (const APP_ENV of [undefined, "test", "staging", "production"]) {
      expect(localAiAllowed(loadConfig({ ...enabled, APP_ENV }))).toBe(false);
    }
    expect(localAiAllowed(loadConfig({ ...enabled, APP_ENV: "local" }))).toBe(
      true,
    );
    expect(
      localAiAllowed(
        loadConfig({ ...enabled, APP_ENV: "local", NODE_ENV: "production" }),
      ),
    ).toBe(false);
    expect(
      localAiAllowed(
        loadConfig({
          ...enabled,
          APP_ENV: "local",
          AI_GEMINI_ENABLED: "false",
        }),
      ),
    ).toBe(false);
    expect(
      localAiAllowed(
        loadConfig({
          ...enabled,
          APP_ENV: "local",
          AI_LOCAL_TOKEN_ENABLED: "false",
        }),
      ),
    ).toBe(false);
  });
  it("ignores removed quota variables from older deployments", () => {
    const config = loadConfig({
      ...environment,
      AI_LOCAL_TOKEN_LIMIT: "1",
      AI_LOCAL_IMAGE_LIMIT: "1",
      AI_OUTPUT_TOKEN_LIMIT: "1",
      CHAT_OUTPUT_MAX_CHARS: "1",
    });
    for (const key of [
      "AI_LOCAL_TOKEN_LIMIT",
      "AI_LOCAL_IMAGE_LIMIT",
      "AI_OUTPUT_TOKEN_LIMIT",
      "CHAT_OUTPUT_MAX_CHARS",
    ])
      expect(config).not.toHaveProperty(key);
  });
  it("rejects invalid limits without printing their input values", () => {
    expect(() =>
      loadConfig({
        ...environment,
        CHAT_TIMEOUT_MS: "private-invalid-value",
      }),
    ).toThrow("CHAT_TIMEOUT_MS");
    expect(() =>
      loadConfig({
        ...environment,
        CHAT_TIMEOUT_MS: "private-invalid-value",
      }),
    ).not.toThrow("private-invalid-value");
  });
});
