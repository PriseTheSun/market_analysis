import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { Browser, root } from "./helpers";
const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const runtime = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const global = new Browser(),
  admin = new Browser(),
  user = new Browser();
let tenant = "";
beforeAll(async () => {
  expect((await global.login("global@marketanalysis.com")).status).toBe(200);
  expect((await admin.login("admin@marketanalysis.com")).status).toBe(200);
  expect((await user.login("user@marketanalysis.com")).status).toBe(200);
  tenant = (await admin.call("/contexts")).data[0].id;
});
afterAll(async () => {
  await Promise.all([owner.end(), runtime.end()]);
});
describe("real API and PostgreSQL runtime", () => {
  it("runs as non-owner without schema privileges; content denies missing context", async () => {
    const result = await runtime.query(
      "SELECT current_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    );
    expect(result.rows[0]).toMatchObject({
      current_user: "market_runtime",
      rolsuper: false,
      rolbypassrls: false,
    });
    expect((await runtime.query('SELECT * FROM "Conversation"')).rowCount).toBe(
      0,
    );
    await expect(
      runtime.query("CREATE TABLE must_not_create(id int)"),
    ).rejects.toThrow();
  });
  it("rejects CSRF and allows safe session lookup", async () => {
    const r = await fetch(root + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@marketanalysis.com",
        password: "MarketGlobal#2027",
      }),
    });
    expect(r.status).toBe(403);
    expect((await user.call("/auth/session")).data.user.email).toBe(
      "user@marketanalysis.com",
    );
  });
  it("denies User members, uploads, admin routes and mass assignment", async () => {
    expect((await user.call(`/tenants/${tenant}/members`)).status).toBe(403);
    expect(
      (
        await user.call(`/tenants/${tenant}/files`, "POST", {
          name: "x.txt",
          size: 5,
          type: "text/plain",
        })
      ).status,
    ).toBe(403);
    expect((await user.call("/platform/tenants")).status).toBe(403);
    expect(
      (
        await admin.call(`/tenants/${tenant}/invitations`, "POST", {
          email: "x@example.com",
          role: "GLOBAL",
        })
      ).status,
    ).toBe(400);
  });
  it("persists scoped private file, rejects replay, downloads actual bytes and denies anonymous S3", async () => {
    const content = "Market Analysis fixture\n";
    const reserve = await admin.call(`/tenants/${tenant}/files`, "POST", {
      name: "fixture.txt",
      size: Buffer.byteLength(content),
      type: "text/plain",
    });
    expect(reserve.status).toBe(201);
    const { upload, file } = reserve.data;
    const form = new FormData();
    for (const [k, v] of Object.entries(upload.fields))
      form.append(k, String(v));
    form.append(
      "file",
      new Blob([content], { type: "text/plain" }),
      "fixture.txt",
    );
    {
      const transfer = await fetch(upload.url, { method: "POST", body: form });
      expect(transfer.status, await transfer.text()).toBeLessThan(300);
    }
    expect(
      (
        await admin.call(
          `/tenants/${tenant}/files/${file.id}/finalize`,
          "POST",
          {},
        )
      ).data.status,
    ).toBe("available");
    const d = await admin.call(
      `/tenants/${tenant}/files/${file.id}/download`,
      "POST",
      {},
    );
    expect(await (await fetch(d.data.url)).text()).toBe(content);
    expect((await fetch(d.data.url.split("?")[0])).status).toBe(403);
    expect(
      (
        await user.call(
          `/tenants/${tenant}/files/${file.id}/download`,
          "POST",
          {},
        )
      ).status,
    ).toBe(403);
    expect(
      (await admin.call(`/tenants/${tenant}/files/${file.id}`, "DELETE"))
        .status,
    ).toBe(200);
  });
  it("keeps private conversations private even from a Global in personal route", async () => {
    const c = await user.call(`/tenants/${tenant}/conversations`, "POST", {
      title: "Private fixture",
    });
    expect(c.status).toBe(201);
    expect(
      (await global.call(`/tenants/${tenant}/conversations/${c.data.id}`))
        .status,
    ).toBe(404);
    expect(
      (await admin.call(`/tenants/${tenant}/conversations/${c.data.id}`))
        .status,
    ).toBe(404);
    expect(
      (await user.call(`/tenants/${tenant}/conversations/${c.data.id}`)).status,
    ).toBe(200);
  });
  it("stores preferences and invalidates logout session", async () => {
    const b = new Browser();
    await b.login("user@marketanalysis.com");
    expect(
      (await b.call("/preferences", "PATCH", { theme: "dark", locale: "es" }))
        .status,
    ).toBe(200);
    expect((await b.call("/preferences")).data.theme).toBe("dark");
    await b.call("/preferences", "PATCH", { theme: "light", locale: "pt-BR" });
    expect((await b.call("/auth/logout", "POST", {})).status).toBe(200);
    expect((await b.call("/auth/session")).status).toBe(401);
  });
  it("normalizes unmapped routes into the safe error contract", async () => {
    const r = await user.call("/this-route-does-not-exist");
    expect(r.status).toBe(404);
    expect(r.data.code).toBe("NOT_FOUND");
    expect(r.data.requestId).toEqual(expect.any(String));
    expect(r.data.message).toBe("NOT_FOUND");
  });
});
