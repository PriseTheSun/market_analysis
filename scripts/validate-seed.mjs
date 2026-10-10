import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
if (process.env.VALIDATION_ONLY !== "true")
  throw new Error("Use only with isolated validation Compose project");
const require = createRequire("/app/apps/api/package.json");
const { Pool } = require("pg");
const db = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
const old = (
  await db.query('SELECT "passwordHash" FROM "User" WHERE email=$1', [
    "user@marketanalysis.com",
  ])
).rows[0].passwordHash;
try {
  await db.query('UPDATE "User" SET "passwordHash"=$1 WHERE email=$2', [
    "seed-must-preserve-existing-hash",
    "user@marketanalysis.com",
  ]);
  await db.query(
    'UPDATE "UserPreference" SET locale=\'es\',theme=\'dark\' WHERE "userId"=(SELECT id FROM "User" WHERE email=$1)',
    ["user@marketanalysis.com"],
  );
  execFileSync(
    "pnpm",
    ["--filter", "@market/api", "exec", "tsx", "prisma/seed.ts"],
    { stdio: "pipe" },
  );
  const row = (
    await db.query(
      'SELECT u."passwordHash",p.locale,p.theme FROM "User" u JOIN "UserPreference" p ON p."userId"=u.id WHERE email=$1',
      ["user@marketanalysis.com"],
    )
  ).rows[0];
  assert.equal(row.passwordHash, "seed-must-preserve-existing-hash");
  assert.equal(row.locale, "es");
  assert.equal(row.theme, "dark");
  assert.equal(
    Number((await db.query('SELECT count(*) FROM "User"')).rows[0].count),
    4,
  );
  assert.equal(
    Number(
      (await db.query('SELECT count(*) FROM "EmailDelivery"')).rows[0].count,
    ),
    0,
  );
  const production = spawnSync(
    "pnpm",
    ["--filter", "@market/api", "exec", "tsx", "prisma/seed.ts"],
    { env: { ...process.env, NODE_ENV: "production" } },
  );
  assert.notEqual(production.status, 0);
  assert.match(production.stderr.toString(), /disabled in production/);
  console.log(
    "PASS repeated seed preserves hash/preferences/memberships; production guard blocks demo seed",
  );
} finally {
  await db.query('UPDATE "User" SET "passwordHash"=$1 WHERE email=$2', [
    old,
    "user@marketanalysis.com",
  ]);
  await db.query(
    'UPDATE "UserPreference" SET locale=\'pt-BR\',theme=\'light\' WHERE "userId"=(SELECT id FROM "User" WHERE email=$1)',
    ["user@marketanalysis.com"],
  );
  await db.end();
}
