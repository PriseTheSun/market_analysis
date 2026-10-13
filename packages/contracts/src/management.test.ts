import { describe, expect, it } from "vitest";
import {
  managementUserSchema,
  managementUserCreateSchema,
  permissionSchema,
  permissionIdSchema,
  managementClientSchema,
} from "./management.js";
const userId = "00000000-0000-4000-8000-000000000001",
  agencyId = "00000000-0000-4000-8000-000000000002",
  tenantId = "00000000-0000-4000-8000-000000000003";
describe("management contracts", () => {
  it("keeps email setup as default and confines passwords to direct creation", () => {
    const user = { name: "Pessoa", email: "pessoa@example.test" };
    expect(managementUserCreateSchema.parse(user).directAccess).toBe(false);
    for (const password of [undefined, "short", "x".repeat(129)])
      expect(
        managementUserCreateSchema.safeParse({
          ...user,
          directAccess: true,
          password,
        }).success,
      ).toBe(false);
    const direct = {
      ...user,
      directAccess: true,
      password: "DirectAccess#2027",
    };
    expect(managementUserCreateSchema.safeParse(direct).success).toBe(true);
    expect(
      managementUserCreateSchema.safeParse({ ...direct, directAccess: false })
        .success,
    ).toBe(false);
    expect(managementUserSchema.safeParse(direct).success).toBe(false);
  });
  it("requires coherent direct permission scopes without hidden grants", () => {
    const direct = {
      name: "Pessoa",
      email: "pessoa@example.test",
      directAccess: true,
      password: "DirectAccess#2027",
    };
    expect(
      managementUserCreateSchema.safeParse({ ...direct, accessScope: "AGENCY" })
        .success,
    ).toBe(false);
    expect(
      managementUserCreateSchema.safeParse({
        ...direct,
        accessScope: "AGENCY",
        agencyId,
      }).success,
    ).toBe(true);
    expect(
      managementUserCreateSchema.safeParse({ ...direct, accessScope: "GLOBAL" })
        .success,
    ).toBe(true);
    expect(
      managementUserCreateSchema.safeParse({
        ...direct,
        accessScope: "GLOBAL",
        agencyId,
      }).success,
    ).toBe(false);
    expect(
      managementUserCreateSchema.safeParse({
        ...direct,
        accessScope: "GLOBAL",
        clients: [{ agencyId, tenantId, role: "USER" }],
      }).success,
    ).toBe(false);
    expect(
      managementUserCreateSchema.safeParse({ ...direct, active: false })
        .success,
    ).toBe(false);
  });
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
