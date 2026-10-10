import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env")) {
  console.log(".env already exists; preserved.");
  process.exit(0);
}
const secret = () => randomBytes(32).toString("hex");
const migration = secret(),
  runtime = secret(),
  access = randomBytes(16).toString("hex"),
  s3 = secret();
let env = readFileSync(".env.example", "utf8")
  .replaceAll("replace-with-different-local-secret", runtime)
  .replaceAll("replace-with-local-secret", migration)
  .replace(
    "SESSION_SECRET=replace-with-64-hex-characters",
    "SESSION_SECRET=" + secret(),
  )
  .replace(
    "OUTBOX_KEY=replace-with-64-hex-characters",
    "OUTBOX_KEY=" + secret(),
  )
  .replace("S3_ACCESS_KEY=replace-with-local-key", "S3_ACCESS_KEY=" + access)
  .replace("S3_SECRET_KEY=" + migration, "S3_SECRET_KEY=" + s3);
mkdirSync("infra/local", { recursive: true });
writeFileSync(
  "infra/local/s3.json",
  JSON.stringify({
    identities: [
      {
        name: "market-app",
        credentials: [{ accessKey: access, secretKey: s3 }],
        actions: ["Admin", "Read", "Write", "List", "Tagging"],
      },
    ],
  }),
  { mode: 0o600 },
);
writeFileSync(".env", env, { mode: 0o600 });
console.log("Local environment created; secrets were not printed.");
