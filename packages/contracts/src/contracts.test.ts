import { it, expect } from "vitest";
import {
  accessRequestSchema,
  reviewSchema,
  preferenceSchema,
  messageSchema,
} from "./index.js";
it("normalizes identity but rejects public authority fields", () => {
  const data = {
    name: "Ana Silva",
    email: " ANA@EXAMPLE.COM ",
    organization: "Agência",
  };
  expect(accessRequestSchema.parse(data).email).toBe("ana@example.com");
  expect(
    accessRequestSchema.safeParse({
      ...data,
      tenantId: "forged",
      role: "GLOBAL",
    }).success,
  ).toBe(false);
});
it("cannot grant platform roles through request review", () => {
  expect(
    reviewSchema.safeParse({ decision: "approved", role: "GLOBAL" }).success,
  ).toBe(false);
});
it("only accepts manual themes and valid time zones", () => {
  expect(preferenceSchema.safeParse({ theme: "system" }).success).toBe(false);
  expect(preferenceSchema.safeParse({ timeZone: "invalid-zone" }).success).toBe(
    false,
  );
});
it("requires a valid operation identity and bounded message", () => {
  expect(
    messageSchema.safeParse({
      content: "x",
      operationId: "invalid",
      locale: "pt-BR",
    }).success,
  ).toBe(false);
});
