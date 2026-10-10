import "dotenv/config";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { Browser, mailToken } from "../tests/integration/helpers.js";
const exec = promisify(execFile);
if (process.env.API_BASE_URL !== "http://localhost:8080/api/v1")
  throw new Error(
    "Explicit local API_BASE_URL required. This check briefly stops the local Compose SMTP/storage services.",
  );
const db = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const compose = (...args: string[]) =>
  exec("docker", ["compose", "-p", "market-analysis-local", ...args]);
async function until(fn: () => Promise<boolean>, ms = 45000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Timed out waiting for persisted recovery");
}
const admin = new Browser(),
  user = new Browser();
try {
  assert.equal((await admin.login("admin@marketanalysis.com")).status, 200);
  assert.equal((await user.login("user@marketanalysis.com")).status, 200);
  const tenant = (await admin.call("/contexts")).data[0].id;
  const userId = (await user.call("/auth/session")).data.user.id;
  const c = (
    await user.call(`/tenants/${tenant}/conversations`, "POST", {
      title: "Recovery fixture",
    })
  ).data;
  const op = randomUUID(),
    message = randomUUID();
  await db.query(
    'INSERT INTO "ChatOperation" (id,"tenantId","conversationId","userId","userMessageId",status,"updatedAt") VALUES ($1,$2,$3,$4,$5,\'streaming\',now()-interval \'2 minutes\')',
    [op, tenant, c.id, userId, message],
  );
  await db.query(
    "INSERT INTO \"Message\" (id,\"tenantId\",\"conversationId\",role,content,status,\"operationId\",position) VALUES ($1,$2,$3,'user','Recuperar resposta','completed',$4,1),($5,$2,$3,'assistant','Parcial persistida','streaming',$4,2)",
    [message, tenant, c.id, op, randomUUID()],
  );
  await until(
    async () =>
      (await db.query('SELECT status FROM "ChatOperation" WHERE id=$1', [op]))
        .rows[0].status === "interrupted",
  );
  assert.equal(
    (await user.call(`/tenants/${tenant}/conversations/${c.id}`)).data
      .messages[1].content,
    "Parcial persistida",
  );
  const r = await user.raw(
    `/tenants/${tenant}/conversations/${c.id}/messages`,
    "POST",
    {
      operationId: randomUUID(),
      retryOf: message,
      content: "Recuperar resposta",
      locale: "pt-BR",
    },
  );
  assert.match(await r.text(), /"status":"completed"/);
  assert.equal(
    (
      await user.call(`/tenants/${tenant}/conversations/${c.id}`)
    ).data.messages.filter((m: { role: string }) => m.role === "user").length,
    1,
  );
  console.log(
    "PASS stale operation recovery, partial persistence and explicit retry without duplicate question",
  );
  const email = `smtp-fault-${randomUUID()}@example.test`;
  await compose("stop", "mailpit");
  try {
    const invite = await admin.call(`/tenants/${tenant}/invitations`, "POST", {
      email,
      role: "USER",
    });
    assert.equal(invite.status, 201);
    await until(
      async () =>
        (
          await db.query(
            'SELECT status FROM "EmailDelivery" WHERE recipient=$1',
            [email],
          )
        ).rows[0]?.status === "failed",
    );
    const delivery = (
      await db.query('SELECT * FROM "EmailDelivery" WHERE recipient=$1', [
        email,
      ])
    ).rows[0];
    assert.equal(delivery.lastError, "SMTP_DELIVERY_FAILED");
    assert.ok(delivery.encryptedPayload);
    assert.ok(delivery.nextAttemptAt > new Date());
    await compose("start", "mailpit");
    // Simulate a worker dying after claiming an item; expired lease must be reclaimable.
    await db.query(
      'UPDATE "EmailDelivery" SET status=\'sending\',"lockedUntil"=now()-interval \'1 minute\',"nextAttemptAt"=now() WHERE id=$1',
      [delivery.id],
    );
    await mailToken(email, "invitation");
    await until(
      async () =>
        (
          await db.query('SELECT status FROM "EmailDelivery" WHERE id=$1', [
            delivery.id,
          ])
        ).rows[0].status === "sent",
    );
    assert.equal(
      Number(
        (
          await db.query('SELECT count(*) FROM "Invitation" WHERE email=$1', [
            email,
          ])
        ).rows[0].count,
      ),
      1,
    );
  } finally {
    await compose("start", "mailpit");
  }
  console.log(
    "PASS SMTP failure/backoff, expired worker lease and redelivery without duplicate invitation",
  );
  const content = "Persistence after restart\n";
  const reserve = (
    await admin.call(`/tenants/${tenant}/files`, "POST", {
      name: "resilience.txt",
      size: Buffer.byteLength(content),
      type: "text/plain",
    })
  ).data;
  const form = new FormData();
  for (const [k, v] of Object.entries(reserve.upload.fields))
    form.append(k, String(v));
  form.append("file", new Blob([content]), "resilience.txt");
  assert.ok(
    (await fetch(reserve.upload.url, { method: "POST", body: form })).ok,
  );
  assert.equal(
    (
      await admin.call(
        `/tenants/${tenant}/files/${reserve.file.id}/finalize`,
        "POST",
        {},
      )
    ).data.status,
    "available",
  );
  await compose("restart", "api", "storage", "mailpit");
  await until(async () => {
    try {
      return (await fetch("http://localhost:8080/api/v1/health")).ok;
    } catch {
      return false;
    }
  }, 60000);
  await until(async () => {
    try {
      const d = await admin.call(
        `/tenants/${tenant}/files/${reserve.file.id}/download`,
        "POST",
        {},
      );
      return (
        d.status === 201 && (await (await fetch(d.data.url)).text()) === content
      );
    } catch {
      return false;
    }
  }, 60000);
  assert.equal(
    (await user.call(`/tenants/${tenant}/conversations/${c.id}`)).data.messages
      .length,
    3,
  );
  console.log(
    "PASS service restart retains login session, real file bytes and chat history",
  );
  await compose("stop", "storage");
  try {
    const removal = await admin.call(
      `/tenants/${tenant}/files/${reserve.file.id}`,
      "DELETE",
    );
    assert.ok(removal.status >= 400);
    assert.equal(
      (
        await db.query('SELECT status FROM "StoredFile" WHERE id=$1', [
          reserve.file.id,
        ])
      ).rows[0].status,
      "deleting",
    );
  } finally {
    await compose("start", "storage");
  }
  await until(
    async () =>
      (
        await db.query('SELECT status FROM "StoredFile" WHERE id=$1', [
          reserve.file.id,
        ])
      ).rows[0].status === "deleted",
    90000,
  );
  const abandoned = (
    await admin.call(`/tenants/${tenant}/files`, "POST", {
      name: "abandoned.txt",
      size: 1,
      type: "text/plain",
    })
  ).data.file;
  await db.query(
    'UPDATE "StoredFile" SET "expiresAt"=now()-interval \'1 minute\' WHERE id=$1',
    [abandoned.id],
  );
  await until(
    async () =>
      (
        await db.query('SELECT "cleanedAt" FROM "StoredFile" WHERE id=$1', [
          abandoned.id,
        ])
      ).rows[0].cleanedAt !== null,
  );
  assert.equal(
    (
      await db.query('SELECT "failureCode" FROM "StoredFile" WHERE id=$1', [
        abandoned.id,
      ])
    ).rows[0].failureCode,
    "UPLOAD_INTERRUPTED",
  );
  console.log(
    "PASS failed delete remains pending, worker resumes and abandoned quota reservation is released",
  );
} finally {
  await compose("start", "mailpit", "storage");
  await db.end();
}
