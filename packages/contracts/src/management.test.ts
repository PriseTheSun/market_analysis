import { describe, expect, it } from "vitest";
import {
  managementUserSchema,
  permissionSchema,
  permissionIdSchema,
  managementClientSchema,
} from "./management.js";
const userId = "00000000-0000-4000-8000-000000000001",
  agencyId = "00000000-0000-4000-8000-000000000002",
  tenantId = "00000000-0000-4000-8000-000000000003";
describe("management contracts", () => {
  it("rejects malformed scoped permission identifiers before the database", () => {
    expect(permissionIdSchema.safeParse(`client:${userId}`).success).toBe(true);
    expect(
      permissionIdSchema.safeParse(`client:${"-".repeat(36)}`).success,
    ).toBe(false);
    expect(permissionIdSchema.safeParse(`custom:${userId}`).success).toBe(
      false,
    );
  });
  it("requires client, agency and a client-level role together", () => {
    expect(
      permissionSchema.safeParse({
        userId,
        scope: "CLIENT",
        agencyId,
        tenantId,
        role: "ADMIN",
      }).success,
    ).toBe(true);
    expect(
      permissionSchema.safeParse({
        userId,
        scope: "CLIENT",
        agencyId,
        role: "ADMIN",
      }).success,
    ).toBe(false);
    expect(
      permissionSchema.safeParse({
        userId,
        scope: "CLIENT",
        agencyId,
        tenantId,
        role: "GLOBAL",
      }).success,
    ).toBe(false);
    expect(
      permissionSchema.safeParse({ userId, scope: "GLOBAL", tenantId }).success,
    ).toBe(false);
    expect(
      permissionSchema.safeParse({ userId, scope: "AGENCY" }).success,
    ).toBe(false);
  });
  it("rejects duplicate memberships and payloads that attempt global escalation through user editing", () => {
    const user = {
      name: "Pessoa",
      email: "pessoa@example.test",
      clients: [{ agencyId, tenantId, role: "USER" }],
    };
    expect(managementUserSchema.safeParse(user).success).toBe(true);
    expect(
      managementUserSchema.safeParse({
        ...user,
        clients: [...user.clients, ...user.clients],
      }).success,
    ).toBe(false);
    expect(
      managementUserSchema.safeParse({ ...user, platformRole: "GLOBAL" })
        .success,
    ).toBe(false);
  });
  it("does not accept archive state or arbitrary client statuses from forms", () => {
    expect(
      managementClientSchema.safeParse({
        name: "Cliente",
        slug: "cliente",
        agencyId,
        archivedAt: null,
      }).success,
    ).toBe(false);
    expect(
      managementClientSchema.safeParse({
        name: "Cliente",
        slug: "cliente",
        agencyId,
        status: "deleted",
      }).success,
    ).toBe(false);
  });
});
