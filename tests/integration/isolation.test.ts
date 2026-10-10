import { beforeAll, afterAll, describe, it, expect } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { Browser, mailToken } from "./helpers";
const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const runtime = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});
const ids = Object.fromEntries(
  [
    "agencyA",
    "agencyB",
    "a1",
    "a2",
    "b1",
    "sa",
    "admin",
    "secondAdmin",
    "user",
    "mixed",
  ].map((k) => [k, randomUUID()]),
);
const suffix = randomUUID().slice(0, 8),
  email = (name: string) =>
    `${name.toLowerCase()}-${suffix}@fixture.example.test`;
const g = new Browser(),
  sa = new Browser(),
  admin = new Browser(),
  user = new Browser(),
  mixed = new Browser();
beforeAll(async () => {
  const hash = (
    await owner.query('SELECT "passwordHash" FROM "User" WHERE email=$1', [
      "global@marketanalysis.com",
    ])
  ).rows[0].passwordHash;
  for (const n of ["sa", "admin", "secondAdmin", "user", "mixed"])
    await owner.query(
      'INSERT INTO "User" (id,email,name,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,now())',
      [ids[n], email(n), "Fixture " + n, hash],
    );
  for (const n of ["agencyA", "agencyB"])
    await owner.query(
      'INSERT INTO "Agency" (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())',
      [ids[n], "Fixture " + n, "fixture-" + n.toLowerCase() + "-" + suffix],
    );
  for (const n of ["a1", "a2", "b1"]) {
    await owner.query(
      'INSERT INTO "Tenant" (id,"agencyId",name,slug,status,"updatedAt") VALUES ($1,$2,$3,$4,\'active\',now())',
      [
        ids[n],
        ids[n === "b1" ? "agencyB" : "agencyA"],
        "Fixture " + n,
        n + "-" + suffix,
      ],
    );
    await owner.query(
      'INSERT INTO "TenantMembership" (id,"tenantId","userId",role,"updatedAt") VALUES ($1,$2,$3,\'ADMIN\',now())',
      [randomUUID(), ids[n], ids.secondAdmin],
    );
  }
  for (const [n, tenant, role] of [
    ["admin", "a1", "ADMIN"],
    ["user", "a1", "USER"],
    ["mixed", "a1", "ADMIN"],
    ["mixed", "a2", "USER"],
  ])
    await owner.query(
      'INSERT INTO "TenantMembership" (id,"tenantId","userId",role,"updatedAt") VALUES ($1,$2,$3,$4::"TenantRole",now())',
      [randomUUID(), ids[tenant!], ids[n!], role],
    );
  await owner.query(
    'INSERT INTO "AgencyMembership" (id,"agencyId","userId") VALUES ($1,$2,$3)',
    [randomUUID(), ids.agencyA, ids.sa],
  );
  for (const [b, n] of [
    [g, "global@marketanalysis.com"],
    [sa, email("sa")],
    [admin, email("admin")],
    [user, email("user")],
    [mixed, email("mixed")],
  ] as const)
    expect((await b.login(n)).status).toBe(200);
});
afterAll(async () => {
  await owner.query(
    "UPDATE \"Tenant\" SET status='disabled' WHERE id=ANY($1::uuid[])",
    [[ids.a1, ids.a2, ids.b1]],
  );
  await owner.query('UPDATE "User" SET active=false WHERE id=ANY($1::uuid[])', [
    [ids.sa, ids.admin, ids.secondAdmin, ids.user, ids.mixed],
  ]);
  await Promise.all([owner.end(), runtime.end()]);
});
describe("restricted fixtures and access graph", () => {
  it("isolates Super Admin by agency and Admin by tenant including lists", async () => {
    expect((await sa.call(`/tenants/${ids.a2}/members`)).status).toBe(200);
    for (const b of [sa, admin, user])
      expect((await b.call(`/tenants/${ids.b1}/members`)).status).toBe(404);
    expect((await admin.call(`/tenants/${ids.a2}/members`)).status).toBe(404);
    expect((await sa.call("/platform/agencies")).status).toBe(403);
    expect(
      (
        await sa.call("/platform/tenants", "POST", {
          agencyId: ids.agencyA,
          name: "Forbidden tenant",
          slug: "forbidden",
          adminEmail: email("admin"),
        })
      ).status,
    ).toBe(403);
    expect((await sa.call("/platform/access-requests")).status).toBe(403);
  });
  it("uses role in selected tenant rather than highest role in identity", async () => {
    expect((await mixed.call(`/tenants/${ids.a1}/files`)).status).toBe(200);
    expect((await mixed.call(`/tenants/${ids.a2}/files`)).status).toBe(403);
    expect((await mixed.call(`/tenants/${ids.a2}/conversations`)).status).toBe(
      200,
    );
  });
  it("clears transaction context after success and rollback on a reused connection", async () => {
    const c = await user.call(`/tenants/${ids.a1}/conversations`, "POST", {
      title: "RLS",
    });
    const client = await runtime.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [
        ids.a1,
      ]);
      expect(
        (
          await client.query('SELECT id FROM "Conversation" WHERE id=$1', [
            c.data.id,
          ])
        ).rowCount,
      ).toBe(1);
      await client.query("COMMIT");
      expect(
        (
          await client.query('SELECT id FROM "Conversation" WHERE id=$1', [
            c.data.id,
          ])
        ).rowCount,
      ).toBe(0);
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [
        ids.a1,
      ]);
      await expect(
        client.query(
          'INSERT INTO "Message" (id,"tenantId","conversationId",role,content,status,"operationId",position) VALUES ($1,$2,$3,\'user\',\'x\',\'completed\',$4,1)',
          [randomUUID(), ids.a2, c.data.id, randomUUID()],
        ),
      ).rejects.toThrow();
      await client.query("ROLLBACK");
      expect(
        (
          await client.query('SELECT id FROM "Conversation" WHERE id=$1', [
            c.data.id,
          ])
        ).rowCount,
      ).toBe(0);
    } finally {
      client.release();
    }
  });
  it("rejects crossed conversation/message foreign keys even with a valid destination RLS context", async () => {
    const c = await user.call(`/tenants/${ids.a1}/conversations`, "POST", {});
    const client = await runtime.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [
        ids.a2,
      ]);
      await expect(
        client.query(
          'INSERT INTO "Message" (id,"tenantId","conversationId",role,content,status,"operationId",position) VALUES ($1,$2,$3,\'user\',\'x\',\'completed\',$4,1)',
          [randomUUID(), ids.a2, c.data.id, randomUUID()],
        ),
      ).rejects.toThrow();
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });
  it("protects the last Admin under concurrent changes and protects last Global", async () => {
    const members = (await g.call(`/tenants/${ids.a1}/members`)).data.items as {
      id: string;
      role: string;
      user: { id: string };
    }[];
    const mixedMember = members.find((m) => m.user.id === ids.mixed)!;
    expect(
      (
        await g.call(`/tenants/${ids.a1}/members/${mixedMember.id}`, "PATCH", {
          role: "USER",
        })
      ).status,
    ).toBe(200);
    const attempts = await Promise.all(
      members
        .filter((m) => m.user.id !== ids.mixed)
        .filter((m) => m.role === "ADMIN")
        .map((m) =>
          g.call(`/tenants/${ids.a1}/members/${m.id}`, "PATCH", {
            active: false,
          }),
        ),
    );
    expect(attempts.map((r) => r.status).sort()).toEqual([200, 409]);
    const global = (await g.call("/auth/session")).data.user;
    expect(
      (
        await g.call(`/platform/users/${global.id}/global-role`, "POST", {
          global: false,
          reason: "Invariant integration test",
        })
      ).data.code,
    ).toBe("LAST_GLOBAL");
  });
  it("deduplicates public requests and completes invitation with durable SMTP without granting access early", async () => {
    const applicant = new Browser(),
      address = email("new");
    const payload = {
      name: "Fixture New",
      email: address,
      organization: "Not an automatic agency",
    };
    const results = await Promise.all([
      applicant.call("/access-requests", "POST", payload),
      applicant.call("/access-requests", "POST", payload),
    ]);
    expect(results.map((r) => r.status)).toEqual([202, 202]);
    const queue = await g.call(
      "/platform/access-requests?search=" + encodeURIComponent(address),
    );
    expect(queue.data.total).toBe(1);
    const request = queue.data.items[0];
    expect(request.tenantId).toBeNull();
    expect(
      (
        await g.call(
          `/platform/access-requests/${request.id}/classify`,
          "POST",
          { tenantId: ids.a2 },
        )
      ).status,
    ).toBe(201);
    const reviews = await Promise.all(
      [1, 2].map(() =>
        g.call(`/platform/access-requests/${request.id}/review`, "POST", {
          decision: "approved",
          role: "USER",
        }),
      ),
    );
    expect(reviews.every((r) => r.status === 201)).toBe(true);
    expect(
      (
        await owner.query(
          'SELECT count(*)::int AS count FROM "Invitation" WHERE email=$1',
          [address],
        )
      ).rows[0].count,
    ).toBe(1);
    expect((await applicant.login(address)).status).toBe(401);
    const token = await mailToken(address, "invitation");
    expect(
      (
        await applicant.call("/auth/invitations/accept", "POST", {
          token,
          password: "FixtureNew#2027",
          name: "Fixture New",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await applicant.call("/auth/invitations/accept", "POST", {
          token,
          password: "FixtureNew#2027",
          name: "Fixture New",
        })
      ).data.code,
    ).toBe("INVALID_TOKEN");
    expect((await applicant.login(address, "FixtureNew#2027")).status).toBe(
      200,
    );
    expect(
      (await applicant.call("/contexts")).data.map((x: { id: string }) => x.id),
    ).toEqual([ids.a2]);
  });
  it("recovers password once, revokes sessions and preserves preference", async () => {
    await user.call("/preferences", "PATCH", { locale: "es", theme: "dark" });
    const visitor = new Browser();
    expect(
      (await visitor.call("/auth/recover", "POST", { email: email("user") }))
        .status,
    ).toBe(202);
    const token = await mailToken(email("user"), "reset");
    const resetAttempts = await Promise.all(
      [1, 2].map(() =>
        visitor.call("/auth/reset", "POST", {
          token,
          password: "FixtureReset#2027",
        }),
      ),
    );
    expect(resetAttempts.map((r) => r.status).sort()).toEqual([201, 400]);
    expect((await user.call("/auth/session")).status).toBe(401);
    expect(
      (
        await visitor.call("/auth/reset", "POST", {
          token,
          password: "FixtureReset#2027",
        })
      ).data.code,
    ).toBe("INVALID_TOKEN");
    expect((await user.login(email("user"), "FixtureReset#2027")).status).toBe(
      200,
    );
    expect((await user.call("/preferences")).data.locale).toBe("es");
  });
  it("activates provisioning tenant only on first Admin invitation and rejects stale invite to disabled tenant", async () => {
    const address = email("bootstrap");
    const created = await g.call("/platform/tenants", "POST", {
      agencyId: ids.agencyA,
      name: "Bootstrap " + suffix,
      slug: "bootstrap-" + suffix,
      adminEmail: address,
    });
    expect(created.data.status).toBe("provisioning");
    const token = await mailToken(address, "invitation"),
      b = new Browser();
    expect(
      (
        await b.call("/auth/invitations/accept", "POST", {
          token,
          password: "FixtureAdmin#2027",
          name: "Fixture Admin",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await owner.query('SELECT status FROM "Tenant" WHERE id=$1', [
          created.data.id,
        ])
      ).rows[0].status,
    ).toBe("active");
    await g.call(`/platform/tenants/${created.data.id}`, "PATCH", {
      status: "disabled",
    });
    expect(
      (
        await b.call("/auth/invitations/accept", "POST", {
          token,
          password: "FixtureAdmin#2027",
          name: "Fixture Admin",
        })
      ).data.code,
    ).toBe("INVALID_TOKEN");
  });
  it("existing identity accepts only after authenticating and keeps password and other memberships", async () => {
    const original = (
      await owner.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
        ids.mixed,
      ])
    ).rows[0].passwordHash;
    const invite = await g.call(`/tenants/${ids.b1}/invitations`, "POST", {
      email: email("mixed"),
      role: "USER",
    });
    expect(invite.status).toBe(201);
    const token = await mailToken(email("mixed"), "invitation");
    expect(
      (
        await user.call("/auth/invitations/accept", "POST", {
          token,
          password: "DoNotChange#2027",
          name: "Wrong identity",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await mixed.call("/auth/invitations/accept", "POST", {
          token,
          password: "DoNotChange#2027",
          name: "Ignored new name",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await owner.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
          ids.mixed,
        ])
      ).rows[0].passwordHash,
    ).toBe(original);
    expect(
      (await mixed.call("/contexts")).data
        .map((x: { id: string }) => x.id)
        .sort(),
    ).toEqual([ids.a1, ids.a2, ids.b1].sort());
  });
  it("keeps notifications recipient-scoped, durable and unavailable after membership revocation", async () => {
    const inbox = (await mixed.call(`/tenants/${ids.a1}/notifications`)).data;
    const notification = inbox.items.find(
      (x: { type: string }) => x.type === "membership.changed",
    );
    expect(notification).toBeTruthy();
    expect(
      (
        await user.call(
          `/tenants/${ids.a1}/notifications/${notification.id}/read`,
          "POST",
          {},
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await mixed.call(
          `/tenants/${ids.a1}/notifications/${notification.id}/read`,
          "POST",
          {},
        )
      ).status,
    ).toBe(201);
    const another = new Browser();
    await another.login(email("mixed"));
    expect(
      (await another.call(`/tenants/${ids.a1}/notifications`)).data.items.find(
        (x: { id: string }) => x.id === notification.id,
      ).readAt,
    ).toBeTruthy();
    expect(
      (await runtime.query('SELECT id FROM "Notification"')).rowCount,
    ).toBe(0);
    const membership = (
      await owner.query(
        'SELECT id FROM "TenantMembership" WHERE "tenantId"=$1 AND "userId"=$2',
        [ids.a1, ids.mixed],
      )
    ).rows[0];
    expect(
      (
        await g.call(`/tenants/${ids.a1}/members/${membership.id}`, "PATCH", {
          active: false,
        })
      ).status,
    ).toBe(200);
    expect((await mixed.call(`/tenants/${ids.a1}/notifications`)).status).toBe(
      404,
    );
    expect((await mixed.call(`/tenants/${ids.a2}/conversations`)).status).toBe(
      200,
    );
  });
  it("cancels a live provider within five seconds of cross-process membership revocation", async () => {
    const conversation = (
      await mixed.call(`/tenants/${ids.a2}/conversations`, "POST", {})
    ).data;
    const operationId = randomUUID();
    const response = await mixed.raw(
      `/tenants/${ids.a2}/conversations/${conversation.id}/messages`,
      "POST",
      {
        content: "Revogação de acesso durante uma resposta",
        operationId,
        locale: "pt-BR",
      },
    );
    const reader = response.body!.getReader();
    await reader.read();
    const membership = (
      await owner.query(
        'SELECT id FROM "TenantMembership" WHERE "tenantId"=$1 AND "userId"=$2',
        [ids.a2, ids.mixed],
      )
    ).rows[0];
    const start = Date.now();
    await g.call(`/tenants/${ids.a2}/members/${membership.id}`, "PATCH", {
      active: false,
    });
    while (!(await reader.read()).done) {
      /* wait for provider cancellation */
    }
    expect(Date.now() - start).toBeLessThan(5000);
    expect(
      (
        await owner.query('SELECT status FROM "ChatOperation" WHERE id=$1', [
          operationId,
        ])
      ).rows[0].status,
    ).toBe("cancelled");
    expect(
      (await mixed.call(`/tenants/${ids.a2}/conversations/${conversation.id}`))
        .status,
    ).toBe(404);
  });
  it("rejects deactivating an identity responsible for other active tenants and activation without an Admin", async () => {
    const deactivation = await g.call(
      `/platform/users/${ids.secondAdmin}/status`,
      "POST",
      { active: false, reason: "Validate responsibility across tenants" },
    );
    expect(deactivation.status).toBe(409);
    expect(deactivation.data.code).toBe("LAST_ADMIN");
    const fresh = await g.call("/platform/tenants", "POST", {
      agencyId: ids.agencyA,
      name: "No administrator yet",
      slug: "needs-admin-" + suffix,
      adminEmail: email("bootstrap-pending"),
    });
    expect(fresh.status).toBe(201);
    expect(
      (
        await g.call(`/platform/tenants/${fresh.data.id}`, "PATCH", {
          status: "active",
        })
      ).data.code,
    ).toBe("LAST_ADMIN");
    await g.call(`/platform/tenants/${fresh.data.id}`, "PATCH", {
      status: "disabled",
    });
  });
  it("expired sessions and reset tokens are rejected without consuming the token", async () => {
    const b = new Browser();
    expect((await b.login(email("user"), "FixtureReset#2027")).status).toBe(
      200,
    );
    await owner.query(
      'UPDATE "Session" SET "expiresAt"=now()-interval \'1 minute\' WHERE "userId"=$1',
      [ids.user],
    );
    expect((await b.call("/auth/session")).status).toBe(401);
    const token = randomUUID().replaceAll("-", "").repeat(2),
      { createHash } = await import("node:crypto");
    const id = randomUUID();
    await owner.query(
      'INSERT INTO "PasswordReset" (id,"userId","tokenHash","expiresAt") VALUES ($1,$2,$3,now()-interval \'1 minute\')',
      [id, ids.user, createHash("sha256").update(token).digest("hex")],
    );
    const anonymous = new Browser();
    expect(
      (
        await anonymous.call("/auth/reset", "POST", {
          token,
          password: "ExpiredReset#2027",
        })
      ).data.code,
    ).toBe("INVALID_TOKEN");
    expect(
      (
        await owner.query(
          'SELECT "consumedAt" FROM "PasswordReset" WHERE id=$1',
          [id],
        )
      ).rows[0].consumedAt,
    ).toBeNull();
  });
  it("keeps an active Global when two removals race", async () => {
    const original = (await g.call("/auth/session")).data.user.id;
    try {
      expect(
        (
          await g.call(`/platform/users/${ids.sa}/global-role`, "POST", {
            global: true,
            reason: "Concurrency fixture promotion",
          })
        ).status,
      ).toBe(201);
      const attempts = await Promise.all(
        [original, ids.sa].map((id) =>
          g.call(`/platform/users/${id}/global-role`, "POST", {
            global: false,
            reason: "Concurrent Global role removal",
          }),
        ),
      );
      expect(attempts.filter((r) => r.status === 201)).toHaveLength(1);
      expect(attempts.some((r) => [403, 409].includes(r.status))).toBe(true);
      expect(
        Number(
          (
            await owner.query(
              'SELECT count(*) FROM "User" WHERE active=true AND "platformRole"=\'GLOBAL\'',
            )
          ).rows[0].count,
        ),
      ).toBe(1);
    } finally {
      await owner.query(
        'UPDATE "User" SET "platformRole"=\'GLOBAL\' WHERE id=$1',
        [original],
      );
      await owner.query('UPDATE "User" SET "platformRole"=NULL WHERE id=$1', [
        ids.sa,
      ]);
    }
  });
});
