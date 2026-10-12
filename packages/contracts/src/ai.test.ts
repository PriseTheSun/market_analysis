import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  aiSettingsInputSchema,
  aiConnectionSchema,
  aiLocalConnectionInputSchema,
  aiModelTestInputSchema,
  aiTokenUsageSchema,
} from "./ai.js";

const settings = {
  scope: "local",
  expectedVersion: 0,
  source: "temporary",
  connectionRevision: randomUUID(),
  models: { chatText: "models/example-text", imageGeneration: null },
  localPolicy: { warnAt80: true, pauseAtLimit: true },
};
describe("AI contracts", () => {
  it("allows independent features and rejects mixing session options into managed configuration", () => {
    expect(aiSettingsInputSchema.safeParse(settings).success).toBe(true);
    expect(
      aiSettingsInputSchema.safeParse({ ...settings, scope: "managed" })
        .success,
    ).toBe(false);
    expect(
      aiSettingsInputSchema.safeParse({
        ...settings,
        models: { chatText: null, imageGeneration: null },
      }).success,
    ).toBe(true);
  });
  it("rejects forged scope, revisions, versions, models and arbitrary endpoints", () => {
    for (const extra of [
      { expectedVersion: -1 },
      { expectedVersion: 0.5 },
      { connectionRevision: "" },
      { environment: "local" },
      { sessionId: randomUUID() },
      { baseURL: "http://127.0.0.1" },
      { models: { chatText: "models/../../other", imageGeneration: null } },
    ])
      expect(
        aiSettingsInputSchema.safeParse({ ...settings, ...extra }).success,
      ).toBe(false);
  });
  it("accepts a bounded header-safe token only in the connection input and not a response", () => {
    const token = randomUUID();
    expect(
      aiLocalConnectionInputSchema.safeParse({ provider: "gemini", token })
        .success,
    ).toBe(true);
    expect(
      aiLocalConnectionInputSchema.safeParse({
        provider: "gemini",
        token: token + "\r\nheader",
      }).success,
    ).toBe(false);
    expect(
      aiLocalConnectionInputSchema.safeParse({
        provider: "gemini",
        token: "x".repeat(513),
      }).success,
    ).toBe(false);
    const connection = {
      status: "connected",
      revision: randomUUID(),
      expiresAt: new Date().toISOString(),
      errorCode: null,
    };
    expect(aiConnectionSchema.safeParse(connection).success).toBe(true);
    for (const sensitive of ["token", "apiKey", "secretArn", "headers"]) {
      expect(
        aiConnectionSchema.safeParse({ ...connection, [sensitive]: token })
          .success,
      ).toBe(false);
    }
  });
  it("requires an idempotent model test and forbids caller supplied prompts", () => {
    const input = {
      operationId: randomUUID(),
      feature: "chatText",
      source: "temporary",
      modelId: "models/example",
      connectionRevision: randomUUID(),
    };
    expect(aiModelTestInputSchema.safeParse(input).success).toBe(true);
    expect(
      aiModelTestInputSchema.safeParse({ ...input, prompt: "custom" }).success,
    ).toBe(false);
    expect(
      aiModelTestInputSchema.safeParse({ ...input, operationId: "" }).success,
    ).toBe(false);
  });
  it("preserves unknown usage and rejects negative or imprecise totals", () => {
    const usage = { input: null, output: null, thinking: null, total: null };
    expect(aiTokenUsageSchema.parse(usage)).toEqual(usage);
    for (const total of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(aiTokenUsageSchema.safeParse({ ...usage, total }).success).toBe(
        false,
      );
  });
});
