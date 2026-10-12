import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { LocalConnections } from "./local-connections.js";
import { AiCatalogService } from "./ai-catalog.js";
import type { AiProvider } from "./ai.provider.js";
afterEach(() => vi.useRealTimers());
describe("temporary AI connections", () => {
  it("isolates sessions and actors, expires absolutely and aborts active operations", async () => {
    vi.useFakeTimers();
    const store = new LocalConnections();
    const c = store.activate("session-a", "actor-a", randomUUID());
    expect(() => store.get("session-b", "actor-a")).toThrow(
      "AI_CONNECTION_EXPIRED",
    );
    expect(() => store.get("session-a", "actor-b")).toThrow(
      "AI_CONNECTION_EXPIRED",
    );
    await vi.advanceTimersByTimeAsync(3599999);
    expect(store.get("session-a", "actor-a")).toBe(c);
    await vi.advanceTimersByTimeAsync(1);
    expect(c.signal.aborted).toBe(true);
    expect(() => store.get("session-a", "actor-a")).toThrow(
      "AI_CONNECTION_EXPIRED",
    );
  });
  it("revokes old revision on replacement and never restores a token after restart", () => {
    const store = new LocalConnections();
    const a = store.activate("s", "a", randomUUID());
    const b = store.activate("s", "a", randomUUID());
    expect(a.signal.aborted).toBe(true);
    expect(b.revision).not.toBe(a.revision);
    expect(() => new LocalConnections().get("s", "a")).toThrow(
      "AI_CONNECTION_EXPIRED",
    );
    store.clear();
    expect(b.signal.aborted).toBe(true);
  });
  it("separates catalog caches by origin, session and revision with bounded lifetime", async () => {
    vi.useFakeTimers();
    const models = vi.fn().mockResolvedValue([]);
    const catalog = new AiCatalogService({ models } as unknown as AiProvider);
    const store = new LocalConnections();
    const a = store.activate("a", "actor", randomUUID());
    await catalog.get("temporary", "a", a);
    await catalog.get("temporary", "a", a);
    expect(models).toHaveBeenCalledTimes(1);
    await catalog.get("temporary", "b", a);
    await catalog.get("managed", "managed", a);
    expect(models).toHaveBeenCalledTimes(3);
    const b = store.activate("a", "actor", randomUUID());
    await catalog.get("temporary", "a", b);
    await vi.advanceTimersByTimeAsync(300001);
    await catalog.get("temporary", "a", b);
    expect(models).toHaveBeenCalledTimes(5);
    store.clear();
  });
});
