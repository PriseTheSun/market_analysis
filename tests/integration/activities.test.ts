import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { Browser } from "./helpers";
import type { ActivityPage } from "@market/contracts";

const db = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const prefix = `activity-${randomUUID().slice(0, 8)}`;
const ids = Object.fromEntries(
  [
    "global",
    "super",
    "admin",
    "user",
    "other",
    "agencyA",
    "agencyB",
    "tenantA",
    "tenantA2",
    "tenantB",
    "adminGrant",
    "userGrant",
    "superGrant",
    "extraAgency",
  ].map((key) => [key, randomUUID()]),
);
const clients = {
  global: new Browser(),
  super: new Browser(),
  admin: new Browser(),
  user: new Browser(),
  other: new Browser(),
};
const email = (key: string) => `${prefix}-${key}@fixture.example.test`;
const activity = (module: string, params: Record<string, string> = {}) =>
  `/activities?${new URLSearchParams({ module, period: "all", ...params })}`;
async function list(
  browser: Browser,
  module: string,
  params: Record<string, string> = {},
) {
  const result = await browser.call(activity(module, params));
  expect(result.status).toBe(200);
  return result.data as ActivityPage;
}
beforeAll(async () => {
  const hash = (
    await db.query('SELECT "passwordHash" FROM "User" WHERE email=$1', [
      "global@marketanalysis.com",
    ])
  ).rows[0].passwordHash;
  for (const key of Object.keys(clients))
    await db.query(
      'INSERT INTO "User" (id,email,name,"passwordHash","platformRole","updatedAt") VALUES ($1,$2,$3,$4,$5,now())',
      [
        ids[key],
        email(key),
        `${prefix} ${key}`,
        hash,
        key === "global" ? "GLOBAL" : null,
      ],
    );
  for (const key of ["agencyA", "agencyB"])
    await db.query(
      'INSERT INTO "Agency" (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())',
      [ids[key], `${prefix} ${key}`, `${prefix}-${key.toLowerCase()}`],
    );
  for (const [tenant, agency] of [
    ["tenantA", "agencyA"],
    ["tenantA2", "agencyA"],
    ["tenantB", "agencyB"],
  ]) {
    await db.query(
      'INSERT INTO "Tenant" (id,"agencyId",name,slug,status,"updatedAt") VALUES ($1,$2,$3,$4,\'active\',now())',
      [
        ids[tenant!],
        ids[agency!],
        `${prefix} ${tenant}`,
        `${prefix}-${tenant!.toLowerCase()}`,
      ],
    );
    await db.query(
      'INSERT INTO "TenantMembership" (id,"tenantId","userId",role,"updatedAt") VALUES ($1,$2,$3,\'ADMIN\',now())',
      [
        tenant === "tenantA" ? ids.adminGrant : randomUUID(),
        ids[tenant!],
        tenant === "tenantA" ? ids.admin : ids.global,
      ],
    );
  }
  await db.query(
    'INSERT INTO "AgencyMembership" (id,"agencyId","userId") VALUES ($1,$2,$3)',
    [ids.superGrant, ids.agencyA, ids.super],
  );
  await db.query(
    'INSERT INTO "TenantMembership" (id,"tenantId","userId",role,"updatedAt") VALUES ($1,$2,$3,\'USER\',now())',
    [ids.userGrant, ids.tenantA, ids.user],
  );
  await db.query(
    'INSERT INTO "TenantMembership" (id,"tenantId","userId",role,"updatedAt") VALUES ($1,$2,$3,\'USER\',now())',
    [randomUUID(), ids.tenantA, ids.other],
  );
  for (const [key, browser] of Object.entries(clients))
    expect((await browser.login(email(key))).status).toBe(200);
});
afterAll(async () => {
  await db.query(
    'UPDATE "Tenant" SET status=\'disabled\',"archivedAt"=now() WHERE id=ANY($1::uuid[])',
    [[ids.tenantA, ids.tenantA2, ids.tenantB]],
  );
  await db.query(
    'UPDATE "Agency" SET active=false,"archivedAt"=now() WHERE id=ANY($1::uuid[])',
    [[ids.agencyA, ids.agencyB, ids.extraAgency]],
  );
  await db.query(
    'UPDATE "User" SET active=false,"archivedAt"=now() WHERE id=ANY($1::uuid[])',
    [Object.keys(clients).map((key) => ids[key])],
  );
  await db.query(
    'UPDATE "Session" SET "revokedAt"=now() WHERE "userId"=ANY($1::uuid[])',
    [Object.keys(clients).map((key) => ids[key])],
  );
  await db.end();
});
describe("module activity history", () => {
  it("requires authentication and validates filters", async () => {
    expect((await new Browser().call(activity("management"))).status).toBe(401);
    expect(
      (await clients.global.call(activity("management", { page: "0" }))).status,
    ).toBe(400);
    expect((await clients.global.call(activity("unknown"))).status).toBe(400);
  });
  it("records actor, target and before/after names without exposing raw audit fields", async () => {
    expect(
      (
        await clients.global.call(
          `/platform/agencies/${ids.agencyA}`,
          "PATCH",
          { name: `${prefix} renamed` },
        )
      ).status,
    ).toBe(200);
    const result = await list(clients.global, "management", {
      search: prefix,
      action: "updated",
      person: `${prefix} global`,
    });
    const item = result.items.find(
      (x) => x.resourceName === `${prefix} renamed`,
    )!;
    expect(item.actor.name).toBe(`${prefix} global`);
    expect(item.changes).toContainEqual({
      field: "name",
      before: `${prefix} agencyA`,
      after: `${prefix} renamed`,
    });
    expect(item.href).toContain("record=" + ids.agencyA);
    expect(item).not.toHaveProperty("requestId");
    expect(item).not.toHaveProperty("resourceId");
  });
  it("records scoped access changes and limits agency history", async () => {
    expect(
      (
        await clients.admin.call(
          `/tenants/${ids.tenantA}/members/${ids.userGrant}`,
          "PATCH",
          { role: "ADMIN" },
        )
      ).status,
    ).toBe(200);
    const result = await list(clients.super, "management");
    expect(
      result.items.some((x) =>
        x.changes.some(
          (c) =>
            c.field === "role" && c.before === "USER" && c.after === "ADMIN",
        ),
      ),
    ).toBe(true);
    expect(result.items.every((x) => x.action === "access")).toBe(true);
    expect(JSON.stringify(result)).not.toContain(`${prefix} agencyB`);
    expect(
      (
        await clients.admin.call(
          `/tenants/${ids.tenantA}/members/${ids.userGrant}`,
          "PATCH",
          { role: "USER" },
        )
      ).status,
    ).toBe(200);
  });
  it("enforces tenant permissions for all four roles", async () => {
    for (const who of [clients.global, clients.super, clients.admin])
      expect(
        (await who.call(activity("members", { tenantId: ids.tenantA! })))
          .status,
      ).toBe(200);
    expect(
      (await clients.user.call(activity("members", { tenantId: ids.tenantA! })))
        .status,
    ).toBe(403);
    expect(
      (
        await clients.admin.call(
          activity("members", { tenantId: ids.tenantB! }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await clients.super.call(
          activity("members", { tenantId: ids.tenantB! }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await clients.super.call(
          activity("members", { tenantId: ids.tenantA2! }),
        )
      ).status,
    ).toBe(200);
    for (const module of ["management", "ai"])
      expect((await clients.user.call(activity(module))).status).toBe(403);
    expect(
      (await clients.admin.call(activity("audit", { tenantId: ids.tenantA! })))
        .status,
    ).toBe(403);
  });
  it("keeps chat history private and excludes titles and message contents", async () => {
    for (const who of [clients.user, clients.other])
      expect(
        (
          await who.call(`/tenants/${ids.tenantA}/conversations`, "POST", {
            title: "PRIVATE conversation content",
          })
        ).status,
      ).toBe(201);
    const result = await list(clients.user, "chat", { tenantId: ids.tenantA! });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.actor.name).toBe(`${prefix} user`);
    expect(result.items[0]?.href).toContain("conversation=");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(
      (
        await list(clients.user, "chat", {
          tenantId: ids.tenantA!,
          person: `${prefix} other`,
        })
      ).total,
    ).toBe(0);
  });
  it("isolates personal preferences and records their previous value", async () => {
    expect(
      (await clients.user.call("/preferences", "PATCH", { theme: "dark" }))
        .status,
    ).toBe(200);
    expect(
      (await clients.user.call("/preferences", "PATCH", { theme: "light" }))
        .status,
    ).toBe(200);
    const result = await list(clients.user, "preferences");
    expect(result.items[0]?.changes).toContainEqual({
      field: "theme",
      before: "dark",
      after: "light",
    });
    expect((await list(clients.other, "preferences")).items).toHaveLength(0);
    expect(
      (await list(clients.global, "preferences", { person: `${prefix} user` }))
        .total,
    ).toBe(0);
  });
  it("keeps archive, restore and removed records distinct and preserves historical names", async () => {
    const created = await clients.global.call(
      "/platform/management/agencies",
      "POST",
      { name: `${prefix} temporary`, slug: `${prefix}-temporary` },
    );
    expect(created.status).toBe(201);
    ids.extraAgency = created.data.id;
    expect(
      (
        await clients.global.call(
          `/platform/management/agencies/${ids.extraAgency}`,
          "DELETE",
        )
      ).status,
    ).toBe(200);
    let result = await list(clients.global, "management", {
      search: `${prefix} temporary`,
    });
    expect(result.items.find((x) => x.action === "archived")?.href).toBeNull();
    expect(
      (
        await clients.global.call(
          `/platform/management/agencies/${ids.extraAgency}/restore`,
          "POST",
        )
      ).status,
    ).toBe(201);
    result = await list(clients.global, "management", {
      search: `${prefix} temporary`,
    });
    expect(result.items.map((x) => x.action)).toEqual([
      "restored",
      "archived",
      "created",
    ]);
    // Fixture-only deletion verifies that history has no live-record dependency.
    await db.query('DELETE FROM "Agency" WHERE id=$1', [ids.extraAgency]);
    result = await list(clients.global, "management", {
      search: `${prefix} temporary`,
    });
    expect(result.items).toHaveLength(3);
    expect(result.items.every((x) => x.href === null)).toBe(true);
    expect(
      result.items.every((x) => x.resourceName === `${prefix} temporary`),
    ).toBe(true);
  });
  it("filters and paginates the authorized set, including legacy events without invented details", async () => {
    const legacyId = randomUUID();
    await db.query(
      'INSERT INTO "AuditLog" (id,"actorId",action,"tenantId","agencyId","resourceId",result,"requestId") VALUES ($1,$2,\'membership.updated\',$3,$4,$5,\'success\',$6)',
      [
        legacyId,
        ids.admin,
        ids.tenantA,
        ids.agencyA,
        ids.userGrant,
        randomUUID(),
      ],
    );
    const result = await list(clients.admin, "members", {
      tenantId: ids.tenantA!,
      pageSize: "1",
      person: `${prefix} admin`,
    });
    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(legacyId);
    expect(result.items[0]?.detailsRecorded).toBe(false);
    expect(result.items[0]?.changes).toEqual([]);
    const second = await list(clients.admin, "members", {
      tenantId: ids.tenantA!,
      pageSize: "1",
      page: "2",
      person: `${prefix} admin`,
    });
    expect(second.items[0]?.id).not.toBe(legacyId);
  });
  it("captures the previous role when a grant is upserted through creation", async () => {
    const payload = {
      userId: ids.user,
      scope: "CLIENT",
      agencyId: ids.agencyA,
      tenantId: ids.tenantA,
      role: "ADMIN",
    };
    expect(
      (
        await clients.global.call(
          "/platform/management/permissions",
          "POST",
          payload,
        )
      ).status,
    ).toBe(201);
    const result = await list(clients.global, "management", {
      action: "access",
      search: prefix,
    });
    const event = result.items.find(
      (x) =>
        x.event === "permission.created" && x.resourceName === prefix + " user",
    )!;
    expect(event.changes).toContainEqual({
      field: "role",
      before: "USER",
      after: "ADMIN",
    });
    expect(
      (
        await clients.global.call("/platform/management/permissions", "POST", {
          ...payload,
          role: "USER",
        })
      ).status,
    ).toBe(201);
  });
  it("never exposes cross-scope before values after a permission move", async () => {
    const change = await clients.global.call(
      `/platform/management/permissions/client:${ids.userGrant}`,
      "PATCH",
      {
        userId: ids.user,
        scope: "CLIENT",
        agencyId: ids.agencyB,
        tenantId: ids.tenantB,
        role: "USER",
      },
    );
    expect(change.status).toBe(200);
    const result = await list(clients.global, "management", {
      action: "access",
      search: `${prefix} user`,
    });
    const moved = result.items.find((x) => x.event === "permission.updated")!;
    expect(moved.changes.some((x) => x.field === "client")).toBe(true);
    await db.query(
      'INSERT INTO "AgencyMembership" (id,"userId","agencyId") VALUES ($1,$2,$3)',
      [randomUUID(), ids.other, ids.agencyB],
    );
    const agencyView = await list(clients.other, "management");
    expect(agencyView.items.some((x) => x.id === moved.id)).toBe(false);
  });
  it("shows the responsible person's current photo only through an authorized activity", async () => {
    const activityId = randomUUID();
    const photo = await readFile(
      new URL("../fixtures/avatars/photo.webp", import.meta.url),
    );
    await db.query(
      'INSERT INTO "UserAvatar" ("userId", image) VALUES ($1,$2)',
      [ids.admin, photo],
    );
    await db.query('UPDATE "User" SET "avatarVersion"=$1 WHERE id=$2', [
      randomUUID(),
      ids.admin,
    ]);
    await db.query(
      'INSERT INTO "AuditLog" (id,"actorId",action,"tenantId","agencyId",result,"requestId") VALUES ($1,$2,\'membership.updated\',$3,$4,\'success\',$5)',
      [activityId, ids.admin, ids.tenantA, ids.agencyA, randomUUID()],
    );
    const photoFor = async (
      browser: Browser,
      module: string,
      params: Record<string, string> = {},
    ) => {
      const result = await list(browser, module, {
        person: `${prefix} admin`,
        ...params,
      });
      return result.items.find((item) => item.id === activityId)!.actor
        .avatarUrl;
    };
    try {
      const url = (await photoFor(clients.super, "management"))!;
      expect(url).toContain(`/activities/${activityId}/avatar?`);
      const path = url.replace(/^\/api\/v1/, "");
      for (const browser of [clients.global, clients.super]) {
        const response = await browser.raw(path);
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("image/webp");
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        expect(Buffer.from(await response.arrayBuffer())).toEqual(photo);
      }
      const tenantUrl = (await photoFor(clients.admin, "members", {
        tenantId: ids.tenantA!,
      }))!;
      expect(tenantUrl).toContain(`tenantId=${ids.tenantA}`);
      expect(
        (await clients.admin.raw(tenantUrl.replace(/^\/api\/v1/, ""))).status,
      ).toBe(200);
      expect((await new Browser().raw(path)).status).toBe(401);
      expect((await clients.user.raw(path)).status).toBe(403);
      expect((await clients.other.raw(path)).status).toBe(404);
      expect(
        (
          await clients.global.raw(
            `/activities/${activityId}/avatar?module=preferences`,
          )
        ).status,
      ).toBe(404);
      expect(
        (await clients.global.raw(`/activities/${activityId}/avatar?module=ai`))
          .status,
      ).toBe(404);
      expect(
        (
          await clients.global.raw(
            "/activities/not-a-uuid/avatar?module=management",
          )
        ).status,
      ).toBe(400);
      await db.query('UPDATE "AgencyMembership" SET active=false WHERE id=$1', [
        ids.superGrant,
      ]);
      expect((await clients.super.raw(path)).status).toBe(403);
      await db.query('UPDATE "AgencyMembership" SET active=true WHERE id=$1', [
        ids.superGrant,
      ]);
      await db.query('UPDATE "User" SET "avatarVersion"=$1 WHERE id=$2', [
        randomUUID(),
        ids.admin,
      ]);
      expect(await photoFor(clients.super, "management")).not.toBe(url);
      await db.query('DELETE FROM "UserAvatar" WHERE "userId"=$1', [ids.admin]);
      await db.query('UPDATE "User" SET "avatarVersion"=null WHERE id=$1', [
        ids.admin,
      ]);
      expect((await clients.super.raw(path)).status).toBe(404);
      expect(await photoFor(clients.super, "management")).toBeNull();
    } finally {
      await db.query('UPDATE "AgencyMembership" SET active=true WHERE id=$1', [
        ids.superGrant,
      ]);
      await db.query('DELETE FROM "UserAvatar" WHERE "userId"=$1', [ids.admin]);
      await db.query('UPDATE "User" SET "avatarVersion"=null WHERE id=$1', [
        ids.admin,
      ]);
    }
  });
  it("revalidates revoked permissions without relying on session role claims", async () => {
    await db.query('UPDATE "AgencyMembership" SET active=false WHERE id=$1', [
      ids.superGrant,
    ]);
    expect((await clients.super.call(activity("management"))).status).toBe(403);
    await db.query('UPDATE "User" SET "platformRole"=null WHERE id=$1', [
      ids.global,
    ]);
    expect((await clients.global.call(activity("ai"))).status).toBe(403);
  });
});
