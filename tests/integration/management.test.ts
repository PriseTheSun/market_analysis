import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Browser, mailToken } from "./helpers";
const global = new Browser(),
  regular = new Browser(),
  created = new Browser();
const prefix = `management-${randomUUID().slice(0, 8)}`;
const base = "/platform/management";
let agencyA: string,
  agencyB: string,
  clientA: string,
  clientB: string,
  userId: string;
let userEmail = `${prefix}@fixture.example.test`;
const password = "ManagementTest#2027";
beforeAll(async () => {
  expect((await global.login("global@marketanalysis.com")).status).toBe(200);
  expect((await regular.login("user@marketanalysis.com")).status).toBe(200);
});
describe("management center", () => {
  it("restricts every management surface and mutation to Global", async () => {
    for (const path of [
      "options",
      "users",
      "permissions",
      "agencies",
      "clients",
    ])
      expect((await regular.call(`${base}/${path}`)).status).toBe(403);
    expect(
      (
        await regular.call(`${base}/agencies`, "POST", {
          name: prefix,
          slug: prefix,
        })
      ).status,
    ).toBe(403);
  });
  it("creates a user with a usable password setup email and two agencies", async () => {
    const since = Date.now();
    const result = await global.call(`${base}/users`, "POST", {
      name: "Pessoa " + prefix,
      email: userEmail,
      clients: [],
    });
    expect(result.status).toBe(201);
    expect(result.data).not.toHaveProperty("passwordHash");
    userId = result.data.id;
    const token = await mailToken(userEmail, "reset", since);
    expect(
      (await created.call("/auth/reset", "POST", { token, password })).status,
    ).toBe(201);
    expect((await created.login(userEmail, password)).status).toBe(200);
    for (const name of ["A", "B"]) {
      const result = await global.call(`${base}/agencies`, "POST", {
        name: `${prefix} ${name}`,
        slug: `${prefix}-${name.toLowerCase()}`,
      });
      expect(result.status).toBe(201);
      if (name === "A") agencyA = result.data.id;
      else agencyB = result.data.id;
    }
    expect(
      (
        await global.call(`${base}/clients`, "POST", {
          name: prefix,
          slug: prefix,
          agencyId: agencyA,
        })
      ).status,
    ).toBe(400);
    for (const [name, agencyId] of [
      ["A", agencyA],
      ["B", agencyB],
    ]) {
      const result = await global.call(`${base}/clients`, "POST", {
        name: `${prefix} ${name}`,
        slug: prefix,
        agencyId,
        adminId: userId,
      });
      expect(result.status).toBe(201);
      if (name === "A") clientA = result.data.id;
      else clientB = result.data.id;
    }
    expect(
      (await created.call("/contexts")).data
        .map((c: { id: string }) => c.id)
        .sort(),
    ).toEqual([clientA, clientB].sort());
  });
  it("paginates and filters users, preserving client links and rejecting mismatched agencies", async () => {
    const result = await global.call(
      `${base}/users?search=${prefix}&agencyId=${agencyA}&pageSize=12`,
    );
    expect(result.data.total).toBe(1);
    expect(result.data.pageSize).toBe(12);
    expect(result.data.items[0].tenants).toHaveLength(2);
    const body = {
      name: `Atualizado ${prefix}`,
      email: userEmail,
      clients: [
        { agencyId: agencyA, tenantId: clientA, role: "ADMIN" },
        { agencyId: agencyB, tenantId: clientB, role: "ADMIN" },
      ],
    };
    expect(
      (await global.call(`${base}/users/${userId}`, "PATCH", body)).status,
    ).toBe(200);
    expect(
      (
        await global.call(`${base}/users/${userId}`, "PATCH", {
          ...body,
          clients: [{ agencyId: agencyB, tenantId: clientA, role: "ADMIN" }],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await global.call(`${base}/users/${userId}`, "PATCH", {
          ...body,
          clients: [],
        })
      ).data.code,
    ).toBe("LAST_ADMIN");
    expect(
      (await global.call(`${base}/users/${userId}`, "DELETE")).data.code,
    ).toBe("LAST_ADMIN");
    expect((await created.call("/auth/session")).status).toBe(200);
    expect(
      (
        await global.call(`${base}/agencies/${agencyA}`, "PATCH", {
          name: `Renomeada ${prefix}`,
          slug: `${prefix}-a`,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await global.call(`${base}/clients/${clientA}`, "PATCH", {
          name: `Cliente ${prefix}`,
          slug: prefix,
          agencyId: agencyA,
        })
      ).status,
    ).toBe(200);
  });
  it("creates, updates and removes scoped permissions without changing other memberships", async () => {
    const result = await global.call(`${base}/permissions`, "POST", {
      userId,
      scope: "AGENCY",
      agencyId: agencyA,
    });
    expect(result.status).toBe(201);
    const id = result.data.id;
    expect(
      (
        await global.call(`${base}/permissions/${id}`, "PATCH", {
          userId,
          scope: "AGENCY",
          agencyId: agencyB,
        })
      ).status,
    ).toBe(200);
    const listed = await global.call(
      `${base}/permissions?search=${prefix}&pageSize=100`,
    );
    expect(
      listed.data.items.filter((p: { scope: string }) => p.scope === "AGENCY"),
    ).toHaveLength(1);
    const permission = listed.data.items.find(
      (p: { scope: string }) => p.scope === "AGENCY",
    );
    expect(permission.agency.id).toBe(agencyB);
    expect(
      (await global.call(`${base}/permissions/${permission.id}`, "DELETE"))
        .status,
    ).toBe(200);
    const adminPermission = listed.data.items.find(
      (p: { scope: string; client?: { id: string } }) =>
        p.scope === "CLIENT" && p.client?.id === clientA,
    );
    expect(
      (await global.call(`${base}/permissions/${adminPermission.id}`, "DELETE"))
        .data.code,
    ).toBe("LAST_ADMIN");
    expect((await created.call("/contexts")).data).toHaveLength(2);
  });
  it("updates client roles and Global grants without creating custom profiles", async () => {
    const account = await global.call(`${base}/users`, "POST", {
      name: `Permissões ${prefix}`,
      email: `roles-${userEmail}`,
      clients: [],
    });
    expect(account.status).toBe(201);
    const userId = account.data.id;
    const grant = await global.call(`${base}/permissions`, "POST", {
      userId,
      scope: "CLIENT",
      agencyId: agencyA,
      tenantId: clientA,
      role: "USER",
    });
    expect(grant.status).toBe(201);
    expect(
      (
        await global.call(`${base}/permissions/${grant.data.id}`, "PATCH", {
          userId,
          scope: "CLIENT",
          agencyId: agencyA,
          tenantId: clientA,
          role: "ADMIN",
        })
      ).status,
    ).toBe(200);
    const list = await global.call(
      `${base}/permissions?search=roles-${prefix}`,
    );
    expect(list.data.items).toHaveLength(1);
    expect(list.data.items[0].role).toBe("ADMIN");
    expect(
      (await global.call(`${base}/permissions/${grant.data.id}`, "DELETE"))
        .status,
    ).toBe(200);
    const elevated = await global.call(`${base}/permissions`, "POST", {
      userId,
      scope: "GLOBAL",
    });
    expect(elevated.status).toBe(201);
    expect(
      (await global.call(`${base}/permissions/${elevated.data.id}`, "DELETE"))
        .status,
    ).toBe(200);
    expect(
      (await global.call(`${base}/permissions?search=roles-${prefix}`)).data
        .total,
    ).toBe(0);
    expect(
      (await global.call(`${base}/users/${userId}`, "DELETE")).status,
    ).toBe(200);
  });
  it("archives and restores clients and agencies with access blocked and links preserved", async () => {
    expect(
      (await global.call(`${base}/agencies/${agencyA}`, "DELETE")).status,
    ).toBe(200);
    expect(
      (await created.call("/contexts")).data.map((c: { id: string }) => c.id),
    ).toEqual([clientB]);
    expect(
      (
        await global.call(`/platform/agencies/${agencyA}`, "PATCH", {
          active: true,
        })
      ).status,
    ).toBe(404);
    expect(
      (await global.call(`${base}/agencies/${agencyA}/restore`, "POST", {}))
        .status,
    ).toBe(201);
    expect(
      (await global.call(`${base}/clients/${clientA}`, "DELETE")).status,
    ).toBe(200);
    expect(
      (
        await global.call(`${base}/clients?search=${prefix}&view=archived`)
      ).data.items.some((c: { id: string }) => c.id === clientA),
    ).toBe(true);
    expect(
      (
        await global.call(`/platform/tenants/${clientA}`, "PATCH", {
          status: "active",
        })
      ).status,
    ).toBe(404);
    // Editing a user must preserve links to archived clients for later restoration.
    expect(
      (
        await global.call(`${base}/users/${userId}`, "PATCH", {
          name: `Atualizado ${prefix}`,
          email: userEmail,
          clients: [{ agencyId: agencyB, tenantId: clientB, role: "ADMIN" }],
        })
      ).status,
    ).toBe(200);
    expect(
      (await global.call(`${base}/clients/${clientA}/restore`, "POST", {}))
        .status,
    ).toBe(201);
    expect((await created.call("/contexts")).data).toHaveLength(2);
  });
  it("revokes sessions on email change and archive, and restores archived users", async () => {
    userEmail = `updated-${userEmail}`;
    const clients = [
      { agencyId: agencyA, tenantId: clientA, role: "ADMIN" },
      { agencyId: agencyB, tenantId: clientB, role: "ADMIN" },
    ];
    expect(
      (
        await global.call(`${base}/users/${userId}`, "PATCH", {
          name: prefix,
          email: userEmail,
          clients,
        })
      ).status,
    ).toBe(200);
    expect((await created.call("/auth/session")).status).toBe(401);
    expect((await created.login(userEmail, password)).status).toBe(200);
    for (const id of [clientA, clientB])
      expect(
        (await global.call(`${base}/clients/${id}`, "DELETE")).status,
      ).toBe(200);
    expect(
      (await global.call(`${base}/users/${userId}`, "DELETE")).status,
    ).toBe(200);
    expect((await created.call("/auth/session")).status).toBe(401);
    expect(
      (await global.call(`${base}/users?search=${prefix}`)).data.total,
    ).toBe(0);
    expect(
      (await global.call(`${base}/users?search=${userEmail}&view=archived`))
        .data.total,
    ).toBe(1);
    expect(
      (await global.call(`${base}/users/${userId}/restore`, "POST", {})).status,
    ).toBe(201);
    expect((await created.login(userEmail, password)).status).toBe(200);
    // Archive test-only records after validation; keep history for audit.
    expect(
      (await global.call(`${base}/users/${userId}`, "DELETE")).status,
    ).toBe(200);
    for (const id of [agencyA, agencyB])
      expect(
        (await global.call(`${base}/agencies/${id}`, "DELETE")).status,
      ).toBe(200);
  });
});
