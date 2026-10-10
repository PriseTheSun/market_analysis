import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { Browser } from "./helpers";

const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const global = new Browser(),
  superAdmin = new Browser(),
  admin = new Browser(),
  user = new Browser();
const prefix = `permission-scope-${randomUUID().slice(0, 8)}`;
const ids = Object.fromEntries(
  [
    "agencyA",
    "agencyB",
    "clientA",
    "clientB",
    "sa",
    "admin",
    "user",
    "candidate",
    "outside",
    "global",
    "saGrant",
    "adminGrant",
    "userGrant",
    "candidateGrant",
    "outsideGrant",
    "globalClientGrant",
  ].map((key) => [key, randomUUID()]),
);
const base = "/platform/management";
const email = (key: string) => `${prefix}-${key}@fixture.example.test`;
const permission = (
  userId = ids.candidate,
  agencyId = ids.agencyA,
  tenantId = ids.clientA,
) => ({ userId, scope: "CLIENT", agencyId, tenantId, role: "USER" });

beforeAll(async () => {
  const hash = (
    await owner.query('SELECT "passwordHash" FROM "User" WHERE email=$1', [
      "global@marketanalysis.com",
    ])
  ).rows[0].passwordHash;
  for (const key of ["sa", "admin", "user", "candidate", "outside", "global"]) {
    await owner.query(
      'INSERT INTO "User" (id,email,name,"passwordHash","platformRole","updatedAt") VALUES ($1,$2,$3,$4,$5,now())',
      [
        ids[key],
        email(key),
        `${prefix} ${key}`,
        hash,
        key === "global" ? "GLOBAL" : null,
      ],
    );
  }
  for (const key of ["agencyA", "agencyB"])
    await owner.query(
      'INSERT INTO "Agency" (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())',
      [ids[key], `${prefix} ${key}`, `${prefix}-${key.toLowerCase()}`],
    );
  for (const [client, agency] of [
    ["clientA", "agencyA"],
    ["clientB", "agencyB"],
  ])
    await owner.query(
      'INSERT INTO "Tenant" (id,"agencyId",name,slug,status,"updatedAt") VALUES ($1,$2,$3,$4,\'active\',now())',
      [
        ids[client!],
        ids[agency!],
        `${prefix} ${client}`,
        `${prefix}-${client!.toLowerCase()}`,
      ],
    );
  await owner.query(
    'INSERT INTO "AgencyMembership" (id,"agencyId","userId") VALUES ($1,$2,$3)',
    [ids.saGrant, ids.agencyA, ids.sa],
  );
  for (const [grant, person, client, role] of [
    [ids.adminGrant, ids.admin, ids.clientA, "ADMIN"],
    [randomUUID(), ids.admin, ids.clientB, "ADMIN"],
    [ids.userGrant, ids.user, ids.clientA, "USER"],
    [ids.candidateGrant, ids.candidate, ids.clientA, "USER"],
    [ids.outsideGrant, ids.candidate, ids.clientB, "USER"],
    [randomUUID(), ids.outside, ids.clientB, "USER"],
    [ids.globalClientGrant, ids.global, ids.clientA, "USER"],
  ])
    await owner.query(
      'INSERT INTO "TenantMembership" (id,"tenantId","userId",role,"updatedAt") VALUES ($1,$2,$3,$4,now())',
      [grant, client, person, role],
    );
  for (const [browser, identity] of [
    [global, "global@marketanalysis.com"],
    [superAdmin, email("sa")],
    [admin, email("admin")],
    [user, email("user")],
  ] as const)
    expect((await browser.login(identity)).status).toBe(200);
});
afterAll(async () => {
  await owner.query(
    'UPDATE "Tenant" SET status=\'disabled\', "archivedAt"=now() WHERE id=ANY($1::uuid[])',
    [[ids.clientA, ids.clientB]],
  );
  await owner.query(
    'UPDATE "User" SET active=false, "archivedAt"=now() WHERE id=ANY($1::uuid[])',
    [[ids.sa, ids.admin, ids.user, ids.candidate, ids.outside, ids.global]],
  );
  await owner.query(
    'UPDATE "Agency" SET active=false, "archivedAt"=now() WHERE id=ANY($1::uuid[])',
    [[ids.agencyA, ids.agencyB]],
  );
  await owner.end();
});

describe("management permission hierarchy", () => {
  it("exposes only the Super Admin's agencies, clients and eligible users", async () => {
    expect((await global.call(`${base}/options`)).data.role).toBe("GLOBAL");
    const options = await superAdmin.call(`${base}/options`);
    expect(options.status).toBe(200);
    expect(options.data.role).toBe("SUPER_ADMIN");
    expect(options.data.agencies.map((a: { id: string }) => a.id)).toEqual([
      ids.agencyA,
    ]);
    expect(options.data.clients.map((c: { id: string }) => c.id)).toEqual([
      ids.clientA,
    ]);
    expect(options.data.users.map((u: { id: string }) => u.id).sort()).toEqual(
      [ids.sa, ids.admin, ids.user, ids.candidate].sort(),
    );
    const result = await superAdmin.call(`${base}/permissions?pageSize=100`);
    expect(result.status).toBe(200);
    expect(
      result.data.items.every(
        (p: { scope: string; agency: { id: string } }) =>
          p.scope !== "GLOBAL" && p.agency.id === ids.agencyA,
      ),
    ).toBe(true);
  });
  it("denies Admin and User the entire management API, including forged mutations", async () => {
    for (const browser of [admin, user]) {
      for (const kind of [
        "options",
        "permissions",
        "users",
        "agencies",
        "clients",
      ])
        expect((await browser.call(`${base}/${kind}`)).status).toBe(403);
      expect(
        (await browser.call(`${base}/permissions`, "POST", permission()))
          .status,
      ).toBe(403);
      expect(
        (
          await browser.call(
            `${base}/permissions/client:${ids.userGrant}`,
            "PATCH",
            permission(),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await browser.call(
            `${base}/permissions/client:${ids.userGrant}`,
            "DELETE",
          )
        ).status,
      ).toBe(403);
    }
  });
  it("keeps user, agency and client CRUD exclusive to Global", async () => {
    for (const [kind, id, body] of [
      ["users", ids.user, { name: prefix, email: email("user"), clients: [] }],
      ["agencies", ids.agencyA, { name: prefix, slug: prefix }],
      [
        "clients",
        ids.clientA,
        {
          name: prefix,
          slug: prefix,
          agencyId: ids.agencyA,
          adminId: ids.admin,
        },
      ],
    ] as const) {
      expect((await superAdmin.call(`${base}/${kind}`)).status).toBe(403);
      expect(
        (await superAdmin.call(`${base}/${kind}`, "POST", body)).status,
      ).toBe(403);
      expect(
        (await superAdmin.call(`${base}/${kind}/${id}`, "PATCH", body)).status,
      ).toBe(403);
      expect(
        (await superAdmin.call(`${base}/${kind}/${id}`, "DELETE")).status,
      ).toBe(403);
      expect(
        (await superAdmin.call(`${base}/${kind}/${id}/restore`, "POST", {}))
          .status,
      ).toBe(403);
    }
  });
  it("lets Super Admin grant Super Admin, Admin and User only within their agency", async () => {
    const grant = await superAdmin.call(`${base}/permissions`, "POST", {
      userId: ids.candidate,
      scope: "AGENCY",
      agencyId: ids.agencyA,
    });
    expect(grant.status).toBe(201);
    expect(
      (
        await superAdmin.call(`${base}/permissions/${grant.data.id}`, "PATCH", {
          ...permission(),
          role: "ADMIN",
        })
      ).status,
    ).toBe(200);
    const active = await superAdmin.call(
      `${base}/permissions?search=${email("candidate")}`,
    );
    expect(active.data.items).toHaveLength(1);
    expect(active.data.items[0].role).toBe("ADMIN");
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/client:${ids.candidateGrant}`,
          "PATCH",
          permission(),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/client:${ids.candidateGrant}`,
          "DELETE",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await global.call(`${base}/permissions?search=${email("candidate")}`)
      ).data.items.map((p: { id: string }) => p.id),
    ).toEqual([`client:${ids.outsideGrant}`]);
    expect(
      (await global.call(`${base}/permissions`, "POST", permission())).status,
    ).toBe(201);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/client:${ids.adminGrant}`,
          "DELETE",
        )
      ).data.code,
    ).toBe("LAST_ADMIN");
  });
  it("blocks Global escalation and editing or revoking a Global identity's grants", async () => {
    const globalBody = { userId: ids.candidate, scope: "GLOBAL" };
    expect(
      (await superAdmin.call(`${base}/permissions`, "POST", globalBody)).status,
    ).toBe(403);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/client:${ids.candidateGrant}`,
          "PATCH",
          globalBody,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/global:${ids.global}`,
          "DELETE",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/global:${ids.global}`,
          "PATCH",
          permission(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions`,
          "POST",
          permission(ids.global),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/client:${ids.globalClientGrant}`,
          "DELETE",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await global.call(`${base}/permissions?search=${email("global")}`)
      ).data.items.some((p: { scope: string }) => p.scope === "GLOBAL"),
    ).toBe(true);
    const grantedByGlobal = await global.call(
      `${base}/permissions`,
      "POST",
      globalBody,
    );
    expect(grantedByGlobal.status).toBe(201);
    expect(
      (
        await global.call(
          `${base}/permissions/${grantedByGlobal.data.id}`,
          "DELETE",
        )
      ).status,
    ).toBe(200);
  });
  it("rejects foreign agency IDs, foreign grants and unrelated user IDs", async () => {
    expect(
      (await superAdmin.call(`${base}/permissions?agencyId=${ids.agencyB}`))
        .status,
    ).toBe(404);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions`,
          "POST",
          permission(ids.candidate, ids.agencyB, ids.clientB),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await superAdmin.call(`${base}/permissions`, "POST", {
          userId: ids.candidate,
          scope: "AGENCY",
          agencyId: ids.agencyB,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/client:${ids.outsideGrant}`,
          "PATCH",
          permission(),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions/client:${ids.outsideGrant}`,
          "DELETE",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await superAdmin.call(
          `${base}/permissions`,
          "POST",
          permission(ids.outside),
        )
      ).status,
    ).toBe(400);
    const remaining = await global.call(
      `${base}/permissions?search=${email("candidate")}`,
    );
    expect(
      remaining.data.items.map((p: { id: string }) => p.id).sort(),
    ).toEqual(
      [`client:${ids.candidateGrant}`, `client:${ids.outsideGrant}`].sort(),
    );
  });
  it("rechecks Super Admin access after revocation or agency deactivation", async () => {
    expect(
      (await global.call(`${base}/permissions/agency:${ids.saGrant}`, "DELETE"))
        .status,
    ).toBe(200);
    expect((await superAdmin.call(`${base}/options`)).status).toBe(403);
    expect(
      (await superAdmin.call(`${base}/permissions`, "POST", permission()))
        .status,
    ).toBe(403);
    expect(
      (
        await global.call(`${base}/permissions`, "POST", {
          userId: ids.sa,
          scope: "AGENCY",
          agencyId: ids.agencyA,
        })
      ).status,
    ).toBe(201);
    expect((await superAdmin.call(`${base}/permissions`)).status).toBe(200);
    expect(
      (
        await global.call(`${base}/agencies/${ids.agencyA}`, "PATCH", {
          name: prefix,
          slug: prefix,
          active: false,
        })
      ).status,
    ).toBe(200);
    expect((await superAdmin.call(`${base}/permissions`)).status).toBe(403);
  });
});
