import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import type { ManagementOptions } from "@market/contracts";
import { Browser } from "./helpers";

const global = new Browser();
const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const base = "/platform/management/users";
const prefix = `direct-${randomUUID().slice(0, 8)}`;
const password = "DirectAccess#2027";
const users: string[] = [];
let a: ManagementOptions["clients"][number],
  b: ManagementOptions["clients"][number];
const payload = (suffix: string) => ({
  name: `${prefix} ${suffix}`,
  email: `${prefix}-${suffix}@fixture.example.test`,
  directAccess: true,
  password,
});

beforeAll(async () => {
  expect((await global.login("global@marketanalysis.com")).status).toBe(200);
  const options = (await global.call("/platform/management/options"))
    .data as ManagementOptions;
  a = options.clients.find((c) => c.name === "Aurora")!;
  b = options.clients.find((c) => c.agencyId !== a.agencyId)!;
});
afterAll(async () => {
  for (const id of users)
    expect((await global.call(`${base}/${id}`, "DELETE")).status).toBe(200);
  await owner.end();
});
async function create(suffix: string, fields: Record<string, unknown> = {}) {
  const data = { ...payload(suffix), ...fields };
  const result = await global.call(base, "POST", data);
  expect(result.status).toBe(201);
  users.push(result.data.id);
  expect(result.data).not.toHaveProperty("passwordHash");
  expect(result.data).not.toHaveProperty("password");
  const login = new Browser();
  expect((await login.login(data.email, password)).status).toBe(200);
  return { data, user: result.data, login };
}

describe("Global direct user creation", () => {
  it("hashes the password, allows immediate login without links and sends no email", async () => {
    const { user, data, login } = await create("unlinked");
    expect((await login.call("/contexts")).data).toEqual([]);
    const stored = (
      await owner.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
        user.id,
      ])
    ).rows[0];
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toBe(password);
    expect(
      (
        await owner.query('SELECT id FROM "PasswordReset" WHERE "userId"=$1', [
          user.id,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await owner.query('SELECT id FROM "EmailDelivery" WHERE recipient=$1', [
          data.email,
        ])
      ).rowCount,
    ).toBe(0);
    const audit = (
      await owner.query('SELECT * FROM "AuditLog" WHERE "resourceId"=$1', [
        user.id,
      ])
    ).rows;
    expect(audit.some((row) => row.action === "user.created-direct")).toBe(
      true,
    );
    expect(JSON.stringify(audit)).not.toContain(password);
    expect(
      (
        await global.call(base, "POST", {
          ...data,
          password: "AnotherPassword#2027",
        })
      ).status,
    ).toBe(409);
    expect((await login.login(data.email, password)).status).toBe(200);
    expect(
      (
        await global.call(`${base}/${user.id}`, "PATCH", {
          name: data.name,
          email: data.email,
          password: "AnotherPassword#2027",
        })
      ).status,
    ).toBe(400);
  });
  it("creates client, agency and global permissions atomically and confines their scope", async () => {
    const client = await create("clients", {
      clients: [
        { agencyId: a.agencyId, tenantId: a.id, role: "USER" },
        { agencyId: b.agencyId, tenantId: b.id, role: "ADMIN" },
      ],
    });
    expect((await client.login.call("/contexts")).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: a.id, role: "USER" }),
        expect.objectContaining({ id: b.id, role: "ADMIN" }),
      ]),
    );
    expect((await client.login.call("/contexts")).data).toHaveLength(2);
    const agency = await create("agency", {
      accessScope: "AGENCY",
      agencyId: a.agencyId,
    });
    const contexts = (await agency.login.call("/contexts")).data;
    expect(contexts.length).toBeGreaterThan(0);
    expect(
      contexts.every(
        (c: { agencyId: string; role: string }) =>
          c.agencyId === a.agencyId && c.role === "SUPER_ADMIN",
      ),
    ).toBe(true);
    expect(agency.user.agencies[0].agency.id).toBe(a.agencyId);
    expect(
      (
        await global.call(
          `${base}?search=${agency.data.email}&agencyId=${a.agencyId}`,
        )
      ).data.total,
    ).toBe(1);
    const platform = await create("global", { accessScope: "GLOBAL" });
    expect(platform.user.platformRole).toBe("GLOBAL");
    expect((await platform.login.call(base)).status).toBe(200);
  });
  it("rejects non-global actors and invalid assignments without creating an account", async () => {
    for (const role of ["superadmin", "admin", "user"]) {
      const actor = new Browser();
      expect((await actor.login(`${role}@marketanalysis.com`)).status).toBe(
        200,
      );
      expect(
        (
          await actor.call(base, "POST", {
            ...payload(role),
            accessScope: "GLOBAL",
          })
        ).status,
      ).toBe(403);
      expect(
        (await global.call(`${base}?search=${payload(role).email}`)).data.total,
      ).toBe(0);
    }
    for (const fields of [
      { password: "short" },
      { accessScope: "AGENCY", agencyId: randomUUID() },
      { clients: [{ agencyId: b.agencyId, tenantId: a.id, role: "ADMIN" }] },
    ]) {
      const data = { ...payload("invalid"), ...fields };
      expect((await global.call(base, "POST", data)).status).toBe(400);
      expect(
        (await global.call(`${base}?search=${data.email}`)).data.total,
      ).toBe(0);
    }
  });
});
