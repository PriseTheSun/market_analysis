import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { ManagedConnection, type SecretReader } from "./managed-connection.js";
import type { Config } from "../common/config.js";
const config = {
  AI_GEMINI_ENABLED: "true",
  AI_GEMINI_SECRET_REGION: "us-east-1",
  AI_GEMINI_SECRET_ID: "test/ai",
  AI_GEMINI_SECRET_KEY_FIELD: "apiKey",
} as Config;
afterEach(() => vi.useRealTimers());
describe("managed AI credential", () => {
  it("does not require AWS or a credential at startup", async () => {
    const send = vi.fn(),
      destroy = vi.fn();
    const connection = new ManagedConnection(
      { ...config, AI_GEMINI_SECRET_ID: "" },
      { send, destroy } as SecretReader,
    );
    expect(send).not.toHaveBeenCalled();
    await expect(connection.resolve()).rejects.toThrow("AI_NOT_CONFIGURED");
    expect(send).not.toHaveBeenCalled();
    connection.onModuleDestroy();
  });
  it("deduplicates reads, caches for five minutes and changes revision after rotation", async () => {
    vi.useFakeTimers();
    const first = randomUUID(),
      second = randomUUID();
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({ apiKey: first }),
        VersionId: "v1",
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({ apiKey: second }),
        VersionId: "v2",
      });
    const connection = new ManagedConnection(config, {
      send,
      destroy: vi.fn(),
    } as SecretReader);
    const [a, b] = await Promise.all([
      connection.resolve(),
      connection.resolve(),
    ]);
    expect(a).toBe(b);
    expect(a.key).toBe(first);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300001);
    expect((await connection.resolve()).revision).toBe("aws:v2");
    expect(a.signal.aborted).toBe(true);
    connection.onModuleDestroy();
  });
  it("does not use stale credentials after refresh failure or expose SDK errors", async () => {
    vi.useFakeTimers();
    const token = randomUUID();
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({ apiKey: token }),
        VersionId: "v1",
      })
      .mockRejectedValue(new Error(token));
    const connection = new ManagedConnection(config, {
      send,
      destroy: vi.fn(),
    } as SecretReader);
    await connection.resolve();
    await vi.advanceTimersByTimeAsync(300001);
    await expect(connection.resolve()).rejects.toThrow(
      "AI_PROVIDER_UNAVAILABLE",
    );
    connection.onModuleDestroy();
  });
  it("rejects missing fields, non-JSON and invalid keys safely", async () => {
    for (const SecretString of [
      "not-json",
      JSON.stringify({ wrong: randomUUID() }),
      JSON.stringify({ apiKey: 123 }),
    ]) {
      const connection = new ManagedConnection(config, {
        send: vi.fn().mockResolvedValue({ SecretString, VersionId: "v1" }),
        destroy: vi.fn(),
      } as SecretReader);
      await expect(connection.resolve()).rejects.toThrow(
        "AI_PROVIDER_UNAVAILABLE",
      );
      connection.onModuleDestroy();
    }
  });
});
