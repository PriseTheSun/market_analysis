import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
export const randomToken = () => randomBytes(32).toString("hex");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const mac = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest("hex");
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function encrypt(value: unknown, key: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), body]
    .map((x) => x.toString("base64url"))
    .join(".");
}
export function decrypt(value: string, key: string): unknown {
  const [iv, tag, body] = value.split(".");
  if (!iv || !tag || !body) throw new Error("Invalid envelope");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "base64url"),
  );
  cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(
    Buffer.concat([
      cipher.update(Buffer.from(body, "base64url")),
      cipher.final(),
    ]).toString("utf8"),
  );
}
