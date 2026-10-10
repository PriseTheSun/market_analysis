import { createRequire } from "node:module";
const requireApi = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { Browser } from "./helpers";
const b = new Browser();
let tenant = "";
const mime = {
  txt: "text/plain",
  csv: "text/csv",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
type Upload = { url: string; fields: Record<string, string> };
async function transfer(
  upload: Upload,
  bytes: Uint8Array,
  type = "text/plain",
) {
  const form = new FormData();
  for (const [k, v] of Object.entries(upload.fields)) form.append(k, v);
  form.append("file", new Blob([new Uint8Array(bytes)], { type }), "upload");
  return fetch(upload.url, { method: "POST", body: form });
}
beforeAll(async () => {
  await b.login("admin@marketanalysis.com");
  tenant = (await b.call("/contexts")).data[0].id;
});
describe("private S3 content validation and replay boundary", () => {
  it.each(["txt", "csv", "pdf", "xlsx"] as const)(
    "accepts real %s bytes and verifies exact downloaded bytes",
    async (ext) => {
      const bytes = await readFile(
        `tests/fixtures/${ext === "xlsx" ? "workbook" : "sample"}.${ext}`,
      );
      const r = await b.call(`/tenants/${tenant}/files`, "POST", {
        name: "content." + ext,
        type: mime[ext],
        size: bytes.length,
      });
      expect(r.status).toBe(201);
      expect((await transfer(r.data.upload, bytes, mime[ext])).ok).toBe(true);
      expect(
        (
          await b.call(
            `/tenants/${tenant}/files/${r.data.file.id}/finalize`,
            "POST",
            {},
          )
        ).data.status,
      ).toBe("available");
      const d = (
        await b.call(
          `/tenants/${tenant}/files/${r.data.file.id}/download`,
          "POST",
          {},
        )
      ).data;
      expect(Buffer.from(await (await fetch(d.url)).arrayBuffer())).toEqual(
        bytes,
      );
      if (ext === "txt") {
        const { S3Client, GetObjectCommand } = requireApi("@aws-sdk/client-s3");
        const { getSignedUrl } = requireApi("@aws-sdk/s3-request-presigner");
        const client = new S3Client({
          endpoint: process.env.S3_PUBLIC_ENDPOINT,
          region: process.env.S3_REGION,
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
          },
        });
        const key = decodeURIComponent(new URL(d.url).pathname).slice(
          ("/" + process.env.S3_BUCKET + "/").length,
        );
        const expired = await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
          { expiresIn: 1, signingDate: new Date(Date.now() - 120000) },
        );
        expect((await fetch(expired)).status).toBe(403);
        client.destroy();
      }
      expect(
        (await b.call(`/tenants/${tenant}/files/${r.data.file.id}`, "DELETE"))
          .status,
      ).toBe(200);
    },
  );
  it("blocks a forged transfer over 25 MiB and a missing object callback", async () => {
    const r = await b.call(`/tenants/${tenant}/files`, "POST", {
      name: "oversized.txt",
      type: "text/plain",
      size: 26214400,
    });
    expect(r.status).toBe(201);
    expect(
      (await transfer(r.data.upload, new Uint8Array(26214401))).status,
    ).toBe(400);
    expect(
      (
        await b.call(
          `/tenants/${tenant}/files/${r.data.file.id}/finalize`,
          "POST",
          {},
        )
      ).status,
    ).toBeGreaterThanOrEqual(400);
    expect(
      (
        await b.call(
          `/tenants/${tenant}/files/${r.data.file.id}/download`,
          "POST",
          {},
        )
      ).status,
    ).toBe(404);
  });
  it("rejects dishonest MIME content and never exposes it", async () => {
    const bytes = new TextEncoder().encode("This is not a PDF document.");
    const r = await b.call(`/tenants/${tenant}/files`, "POST", {
      name: "fake.pdf",
      type: "application/pdf",
      size: bytes.length,
    });
    expect((await transfer(r.data.upload, bytes, "application/pdf")).ok).toBe(
      true,
    );
    expect(
      (
        await b.call(
          `/tenants/${tenant}/files/${r.data.file.id}/finalize`,
          "POST",
          {},
        )
      ).data.code,
    ).toBe("UPLOAD_INVALID");
    expect(
      (
        await b.call(
          `/tenants/${tenant}/files/${r.data.file.id}/download`,
          "POST",
          {},
        )
      ).status,
    ).toBe(404);
  });
  it("replaying a temporary upload cannot replace verified final bytes", async () => {
    const r = await b.call(`/tenants/${tenant}/files`, "POST", {
      name: "immutable.txt",
      type: "text/plain",
      size: 8,
    });
    expect(
      (await transfer(r.data.upload, new TextEncoder().encode("original"))).ok,
    ).toBe(true);
    expect(
      (
        await b.call(
          `/tenants/${tenant}/files/${r.data.file.id}/finalize`,
          "POST",
          {},
        )
      ).data.status,
    ).toBe("available");
    expect(
      (await transfer(r.data.upload, new TextEncoder().encode("replaced"))).ok,
    ).toBe(true);
    await b.call(
      `/tenants/${tenant}/files/${r.data.file.id}/finalize`,
      "POST",
      {},
    );
    const d = (
      await b.call(
        `/tenants/${tenant}/files/${r.data.file.id}/download`,
        "POST",
        {},
      )
    ).data;
    expect(await (await fetch(d.url)).text()).toBe("original");
    await b.call(`/tenants/${tenant}/files/${r.data.file.id}`, "DELETE");
  });
});
