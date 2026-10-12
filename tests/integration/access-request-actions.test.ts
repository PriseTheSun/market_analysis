import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import type {
  AccessRequestOptions,
  AccessRequestRecord,
} from "@market/contracts";
import { Browser } from "./helpers";

const global = new Browser(),
  regular = new Browser(),
  visitor = new Browser();
const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const prefix = `request-actions-${randomUUID().slice(0, 8)}`;
const base = "/platform/access-requests";
const requests: string[] = [];
const invitations: string[] = [];
let a: AccessRequestOptions["clients"][number],
  b: AccessRequestOptions["clients"][number];

async function create(suffix: string) {
  const email = `${prefix}-${suffix}@fixture.example.test`;
  expect(
    (
      await visitor.call("/access-requests", "POST", {
        name: `Solicitante ${suffix}`,
        email,
        organization: "Nome informado, não é a agência atribuída",
      })
    ).status,
  ).toBe(202);
  const item = (await global.call(`${base}?search=${email}`)).data
    .items[0] as AccessRequestRecord;
  requests.push(item.id);
  return item;
}
async function get(item: AccessRequestRecord, status = "") {
  return (
    await global.call(
      `${base}?search=${item.email}${status ? "&status=" + status : ""}`,
    )
  ).data;
}
async function assign(item: AccessRequestRecord, client = a) {
  return global.call(`${base}/${item.id}/assignment`, "PATCH", {
    agencyId: client.agencyId,
    tenantId: client.id,
    role: "USER",
    approve: true,
  });
}
async function rememberInvitation(item: AccessRequestRecord) {
  const row = (await get(item)).items[0] as AccessRequestRecord;
  if (row.invitationId) invitations.push(row.invitationId);
  return row;
}
beforeAll(async () => {
  expect((await global.login("global@marketanalysis.com")).status).toBe(200);
  expect((await regular.login("user@marketanalysis.com")).status).toBe(200);
  const options = (await global.call(`${base}/options`))
    .data as AccessRequestOptions;
  a = options.clients[0]!;
  b = options.clients.find((client) => client.agencyId !== a.agencyId)!;
  expect(a).toBeTruthy();
  expect(b).toBeTruthy();
});
afterAll(async () => {
  // Keep audit records; close only the disposable requests and invites from this run.
  await owner.query(
    "UPDATE \"AccessRequest\" SET status='rejected' WHERE id=ANY($1::uuid[])",
    [requests],
  );
  await owner.query(
    'UPDATE "Invitation" SET "revokedAt"=now() WHERE id=ANY($1::uuid[]) AND "consumedAt" IS NULL',
    [invitations],
  );
  await owner.query(
    'UPDATE "EmailDelivery" SET status=\'expired\', "encryptedPayload"=NULL WHERE "eventKey"=ANY($1::text[])',
    [invitations.map((id) => "invitation:" + id)],
  );
  await owner.end();
});

describe("access request actions", () => {
  it("assigns and approves atomically, uses the actual agency, reassigns only unaccepted invitations", async () => {
    const item = await create("assignment");
    expect((await regular.call(`${base}/options`)).status).toBe(403);
    expect(
      (
        await regular.call(`${base}/${item.id}/assignment`, "PATCH", {
          agencyId: a.agencyId,
          tenantId: a.id,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await global.call(`${base}/${item.id}/assignment`, "PATCH", {
          agencyId: b.agencyId,
          tenantId: a.id,
          approve: true,
        })
      ).status,
    ).toBe(404);
    expect((await get(item)).items[0]).toMatchObject({
      status: "pending",
      tenantId: null,
      invitationId: null,
    });
    expect((await assign(item)).status).toBe(200);
    const first = await rememberInvitation(item);
    expect(first).toMatchObject({
      status: "approved",
      tenantId: a.id,
      agencyId: a.agencyId,
    });
    expect(first.tenant?.agency.name).toBeTruthy();
    expect(first.tenant?.agency.name).not.toBe(item.organization);
    expect(first.invitation).not.toHaveProperty("tokenHash");
    expect((await assign(item)).status).toBe(200);
    expect((await get(item)).items[0].invitationId).toBe(first.invitationId);
    expect((await assign(item, b)).status).toBe(200);
    const second = await rememberInvitation(item);
    expect(second.tenantId).toBe(b.id);
    expect(second.invitationId).not.toBe(first.invitationId);
    expect(
      (
        await owner.query('SELECT "revokedAt" FROM "Invitation" WHERE id=$1', [
          first.invitationId,
        ])
      ).rows[0].revokedAt,
    ).not.toBeNull();
    expect(
      (
        await owner.query(
          'SELECT "encryptedPayload" FROM "EmailDelivery" WHERE "eventKey"=$1',
          ["invitation:" + first.invitationId],
        )
      ).rows[0].encryptedPayload,
    ).toBeNull();
    expect(
      (
        await owner.query(
          'SELECT count(*)::int AS n FROM "User" WHERE email=$1',
          [item.email],
        )
      ).rows[0].n,
    ).toBe(0);
    await owner.query(
      'UPDATE "Invitation" SET "consumedAt"=now() WHERE id=$1',
      [second.invitationId],
    );
    expect((await assign(item)).status).toBe(409);
    expect(
      (await global.call(`${base}/${item.id}/resend`, "POST", {})).status,
    ).toBe(409);
    expect(
      (
        await global.call(`${base}/${item.id}/review`, "POST", {
          decision: "rejected",
        })
      ).status,
    ).toBe(409);
    expect((await get(item)).items[0].tenantId).toBe(b.id);
  });
  it("resends valid invitations and renews expired ones without granting membership", async () => {
    const item = await create("resend");
    expect(
      (await global.call(`${base}/${item.id}/resend`, "POST", {})).status,
    ).toBe(409);
    expect((await assign(item)).status).toBe(200);
    const first = await rememberInvitation(item);
    expect(
      (await regular.call(`${base}/${item.id}/resend`, "POST", {})).status,
    ).toBe(403);
    expect(
      (
        await global.call(
          `/tenants/${b.id}/access-requests/${item.id}/resend`,
          "POST",
          {},
        )
      ).status,
    ).toBe(404);
    expect(
      (await global.call(`${base}/${item.id}/resend`, "POST", {})).status,
    ).toBe(201);
    expect((await get(item)).items[0].invitationId).toBe(first.invitationId);
    await owner.query(
      'UPDATE "Invitation" SET "expiresAt"=now()-interval \'1 minute\' WHERE id=$1',
      [first.invitationId],
    );
    expect(
      (await global.call(`${base}/${item.id}/resend`, "POST", {})).status,
    ).toBe(201);
    const renewed = await rememberInvitation(item);
    expect(renewed.invitationId).not.toBe(first.invitationId);
    expect(new Date(renewed.invitation!.expiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );
    expect(
      (
        await owner.query('SELECT "revokedAt" FROM "Invitation" WHERE id=$1', [
          first.invitationId,
        ])
      ).rows[0].revokedAt,
    ).not.toBeNull();
  });
  it("rejects and removes requests from the main list, revokes outstanding invites and retains the rejection filter", async () => {
    for (const approved of [false, true]) {
      const item = await create(
        approved ? "reject-approved" : "reject-pending",
      );
      let invitationId: string | null = null;
      if (approved) {
        expect((await assign(item)).status).toBe(200);
        invitationId = (await rememberInvitation(item)).invitationId;
      }
      expect(
        (
          await global.call(`${base}/${item.id}/review`, "POST", {
            decision: "rejected",
            reason: "Teste de rejeição",
          })
        ).status,
      ).toBe(201);
      expect((await get(item)).total).toBe(0);
      expect((await get(item, "rejected")).items[0]).toMatchObject({
        status: "rejected",
        reason: "Teste de rejeição",
      });
      expect(
        (await global.call(`${base}/${item.id}/resend`, "POST", {})).status,
      ).toBe(409);
      expect((await assign(item)).status).toBe(409);
      if (invitationId)
        expect(
          (
            await owner.query(
              'SELECT "revokedAt" FROM "Invitation" WHERE id=$1',
              [invitationId],
            )
          ).rows[0].revokedAt,
        ).not.toBeNull();
    }
  });
});
