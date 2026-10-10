// Run inside the isolated validation API container, which has only runtime credentials.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire("/app/apps/api/package.json");
const { Pool } = require("pg");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const r = (
  await db.query(
    "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
  )
).rows[0];
assert.equal(r.rolsuper, false);
assert.equal(r.rolbypassrls, false);
assert.equal(process.env.MIGRATION_DATABASE_URL, undefined);
assert.equal(
  Number((await db.query('SELECT count(*) FROM "User"')).rows[0].count),
  4,
);
assert.equal(
  Number((await db.query('SELECT count(*) FROM "Agency"')).rows[0].count),
  2,
);
assert.equal(
  Number((await db.query('SELECT count(*) FROM "Tenant"')).rows[0].count),
  4,
);
assert.equal(
  Number(
    (await db.query('SELECT count(*) FROM "TenantMembership"')).rows[0].count,
  ),
  8,
);
assert.equal(
  Number(
    (await db.query('SELECT count(*) FROM "AgencyMembership"')).rows[0].count,
  ),
  2,
);
assert.equal(
  Number(
    (await db.query('SELECT count(*) FROM "EmailDelivery"')).rows[0].count,
  ),
  0,
);
for (const role of ["global", "superadmin", "admin", "user"]) {
  const pre = await fetch("http://localhost:3000/api/v1/auth/csrf");
  const { token } = await pre.json();
  const cookie = pre.headers.getSetCookie()[0].split(";")[0];
  const response = await fetch("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: {
      Origin: "http://localhost:8080",
      "X-CSRF-Token": token,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: role + "@marketanalysis.com",
      password: "MarketGlobal#2027",
    }),
  });
  assert.equal(response.status, 200, role + " login");
  const session = response.headers
    .getSetCookie()
    .find((x) => x.startsWith("ma_session="))
    .split(";")[0];
  const contexts = await (
    await fetch("http://localhost:3000/api/v1/contexts", {
      headers: { Cookie: session },
    })
  ).json();
  assert.equal(contexts.length, 4);
}
const pre = await fetch("http://localhost:3000/api/v1/auth/csrf");
const csrf = await pre.json();
const cookie = pre.headers.getSetCookie()[0].split(";")[0];
const attempt = (origin = "http://localhost:8080") =>
  fetch("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: {
      Origin: origin,
      "X-CSRF-Token": csrf.token,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "limited@example.test",
      password: "invalid-but-long-password",
    }),
  });
assert.equal((await attempt("https://untrusted.example")).status, 403);
for (let i = 0; i < 20; i++) assert.equal((await attempt()).status, 401);
assert.equal((await attempt()).status, 429);
console.log(
  "PASS direct API rejects forged Origin and enforces configured login rate limit",
);
await db.end();
console.log(
  "PASS empty DB: four migrations, exact seed graph, no email, runtime role and all four demo logins",
);
