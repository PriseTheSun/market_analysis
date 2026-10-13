import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// pnpm runs the API in a background process group when starting it alongside
// Vite. Prisma must not read that terminal, which would suspend it with SIGTTIN.
const result = spawnSync(
  process.execPath,
  [require.resolve("prisma/build/index.js"), "generate"],
  { stdio: ["ignore", "inherit", "inherit"] },
);
if (result.error) {
  console.error("Prisma generation could not start.");
  process.exit(1);
}
process.exit(result.status ?? 1);
