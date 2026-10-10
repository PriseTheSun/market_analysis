import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { AVATAR_MAX_BYTES } from "../../packages/contracts/src/index.js";
import { Browser, root } from "./helpers";

const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const runtime = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const people = [randomUUID(), randomUUID()];
const accounts = [new Browser(), new Browser()];
const email = (index: number) => `avatar-${people[index]}@fixture.example.test`;
const endpoint = "/preferences/avatar";
const image = (format: string) =>
  readFile(new URL(`../fixtures/avatars/photo.${format}`, import.meta.url));
let version: string;

async function upload(
  browser: Browser,
  bytes: Uint8Array,
  type = "image/png",
  csrf = true,
  userId?: string,
) {
  if (!browser.csrf) await browser.call("/auth/csrf");
  const body = new FormData();
  body.append(
    "image",
    new Blob([new Uint8Array(bytes)], { type }),
    "photo.png",
  );
  if (userId) body.append("userId", userId);
  return fetch(root + endpoint, {
    method: "POST",
    body,
    headers: {
      Origin: "http://localhost:8080",
      Cookie: [...browser.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      ...(csrf ? { "X-CSRF-Token": browser.csrf } : {}),
    },
  });
}

beforeAll(async () => {
  const hash = (
    await owner.query('SELECT "passwordHash" FROM "User" WHERE email=$1', [
      "global@marketanalysis.com",
    ])
  ).rows[0].passwordHash;
  for (let index = 0; index < people.length; index++) {
    await owner.query(
      'INSERT INTO "User" (id, email, name, "passwordHash", "updatedAt") VALUES ($1,$2,$3,$4,now())',
      [people[index], email(index), "Avatar fixture", hash],
    );
    expect((await accounts[index]!.login(email(index))).status).toBe(200);
  }
});
afterAll(async () => {
  for (const browser of accounts) await browser.call(endpoint, "DELETE");
  await owner.query(
    'UPDATE "User" SET active=false,"archivedAt"=now() WHERE id=ANY($1::uuid[])',
    [people],
  );
  await owner.end();
  await runtime.end();
});

describe("private profile photo", () => {
  it.each(["png", "jpeg", "webp"])(
    "uploads and normalizes %s, returning a versioned photo in the session",
    async (format) => {
      const response = await upload(
        accounts[0]!,
        await image(format),
        `image/${format}`,
      );
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.avatarUrl).toMatch(/^\/api\/v1\/preferences\/avatar\?v=/);
      expect(data.avatarUrl).not.toBe(version);
      version = data.avatarUrl;
      expect(
        (await accounts[0]!.call("/auth/session")).data.user.avatarUrl,
      ).toBe(version);
      const photo = await accounts[0]!.raw(endpoint);
      expect(photo.status).toBe(200);
      expect(photo.headers.get("content-type")).toContain("image/webp");
      expect(photo.headers.get("cache-control")).toBe("private, no-store");
      const bytes = Buffer.from(await photo.arrayBuffer());
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      expect(bytes.length).toBeLessThanOrEqual(262144);
      expect(
        (
          await owner.query(
            'SELECT count(*)::int AS count FROM "UserAvatar" WHERE "userId"=$1',
            [people[0]],
          )
        ).rows[0].count,
      ).toBe(1);
    },
  );
  it("keeps the photo after logout and a new login", async () => {
    await accounts[0]!.call("/auth/logout", "POST", {});
    accounts[0] = new Browser();
    expect((await accounts[0]!.login(email(0))).status).toBe(200);
    expect((await accounts[0]!.call("/auth/session")).data.user.avatarUrl).toBe(
      version,
    );
  });
  it("isolates the photo from another account and enforces row-level access", async () => {
    expect(
      (await accounts[1]!.raw(`${endpoint}?userId=${people[0]}`)).status,
    ).toBe(404);
    expect(
      (
        await upload(
          accounts[1]!,
          await image("png"),
          "image/png",
          true,
          people[0],
        )
      ).status,
    ).toBe(400);
    expect(
      (await accounts[1]!.call("/auth/session")).data.user.avatarUrl,
    ).toBeNull();
    const tx = await runtime.connect();
    try {
      await tx.query("BEGIN");
      await tx.query("SELECT set_config('app.actor_id', $1, true)", [
        people[1],
      ]);
      expect(
        (
          await tx.query(
            'SELECT "userId" FROM "UserAvatar" WHERE "userId"=$1',
            [people[0]],
          )
        ).rows,
      ).toHaveLength(0);
    } finally {
      await tx.query("ROLLBACK");
      tx.release();
    }
  });
  it("rejects oversized, unsupported and corrupt images without replacing the saved photo", async () => {
    const oversized = await upload(
      accounts[0]!,
      new Uint8Array(AVATAR_MAX_BYTES + 1),
    );
    expect(oversized.status).toBe(413);
    expect((await oversized.json()).code).toBe("UPLOAD_TOO_LARGE");
    for (const bytes of [
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      ),
      Buffer.from("broken png"),
      new Uint8Array(),
    ]) {
      const response = await upload(accounts[0]!, bytes);
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("UPLOAD_INVALID");
    }
    expect(
      (await upload(accounts[0]!, await image("png"), "text/plain")).status,
    ).toBe(400);
    expect((await accounts[0]!.call("/auth/session")).data.user.avatarUrl).toBe(
      version,
    );
    expect((await accounts[0]!.raw(endpoint)).status).toBe(200);
  });
  it("requires an authenticated session and CSRF token", async () => {
    const anonymous = new Browser();
    expect((await anonymous.raw(endpoint)).status).toBe(401);
    expect((await upload(anonymous, await image("png"))).status).toBe(401);
    expect(
      (await upload(accounts[0]!, await image("png"), "image/png", false))
        .status,
    ).toBe(403);
  });
  it("removes only the current account's photo and clears its session URL", async () => {
    expect((await accounts[1]!.call(endpoint, "DELETE")).status).toBe(200);
    expect((await accounts[0]!.raw(endpoint)).status).toBe(200);
    expect(
      (await accounts[0]!.call(endpoint, "DELETE")).data.avatarUrl,
    ).toBeNull();
    expect((await accounts[0]!.raw(endpoint)).status).toBe(404);
    expect(
      (await accounts[0]!.call("/auth/session")).data.user.avatarUrl,
    ).toBeNull();
  });
});
