import { describe, it, expect } from "vitest";
import {
  DemoProvider,
  UnavailableProvider,
  createProvider,
} from "./chat.provider.js";
describe("provider mode and cancellation", () => {
  it("never enables the demo adapter in production", () => {
    expect(createProvider("demo", "production")).toBeInstanceOf(
      UnavailableProvider,
    );
    expect(createProvider("demo", "development")).toBeInstanceOf(DemoProvider);
    expect(createProvider("unavailable", "development")).toBeInstanceOf(
      UnavailableProvider,
    );
  });
  it("aborts generation before publishing another token", async () => {
    const control = new AbortController();
    const iterator = new DemoProvider().stream(
      { content: "Hello", locale: "en" },
      control.signal,
    );
    await iterator.next();
    control.abort();
    await expect(iterator.next()).rejects.toThrow();
  });
});
