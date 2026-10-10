// Clears only transient throttle counters in the explicitly local test database.
import pg from "pg";
const url = new URL(process.env.MIGRATION_DATABASE_URL ?? "");
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/market_analysis"
)
  throw new Error("Local test database required");
const db = new pg.Pool({ connectionString: url.toString() });
try {
  await db.query('DELETE FROM "RateLimit"');
  console.log(
    "Local transient rate counters cleared; application data preserved.",
  );
} finally {
  await db.end();
}
