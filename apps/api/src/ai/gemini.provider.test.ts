import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { GeminiProvider } from "./gemini.provider.js";
import type { AiCredential, AiGenerationInput } from "./ai.provider.js";
const credential = (): AiCredential => ({
  key: randomUUID(),
  revision: randomUUID(),
  expiresAt: Date.now() + 60000,
  signal: new AbortController().signal,
});
const model = {
  id: "models/gemini-2.5-flash",
  label: "Flash",
  features: ["chatText" as const],
  inputTokenLimit: 10000,
  outputTokenLimit: 2048,
  strictBudgetSupported: true,
};
const input: AiGenerationInput = {
  model,
  feature: "chatText",
  contents: [{ role: "user", parts: [{ text: "Hello" }] }],
  maxOutputTokens: 512,
};
async function collect(
  provider: GeminiProvider,
  value = input,
  key = credential(),
) {
  const events = [];
  for await (const event of provider.generate(
    key,
    value,
    new AbortController().signal,
  ))
    events.push(event);
  return events;
}
afterEach(() => vi.restoreAllMocks());
describe("Gemini transport", () => {
  it("uses a fixed HTTPS host, header auth and redirect rejection; handles all catalog pages", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          models: [
            {
              name: model.id,
              displayName: "Flash",
              inputTokenLimit: 10000,
              outputTokenLimit: 2048,
              supportedGenerationMethods: ["generateContent"],
            },
          ],
          nextPageToken: "page+/2",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          models: [
            {
              name: "models/unknown-image",
              inputTokenLimit: 10000,
              outputTokenLimit: 2048,
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }),
      );
    const key = credential();
    expect(
      await new GeminiProvider(fetcher).models(
        key,
        new AbortController().signal,
      ),
    ).toEqual([model]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetcher.mock.calls) {
      expect(new URL(String(url)).origin).toBe(
        "https://generativelanguage.googleapis.com",
      );
      expect(String(url)).not.toContain(key.key);
      expect(options?.redirect).toBe("error");
      expect(options?.headers).toMatchObject({ "x-goog-api-key": key.key });
    }
    expect(String(fetcher.mock.calls[1]?.[0])).toContain(
      "pageToken=page%2B%2F2",
    );
  });
  it("rejects unknown paths before fetching and does not infer images from a name", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const provider = new GeminiProvider(fetcher);
    await expect(
      collect(provider, {
        ...input,
        model: { ...model, id: "models/../../metadata" },
      }),
    ).rejects.toThrow("AI_MODEL_INCOMPATIBLE");
    await expect(
      collect(provider, { ...input, feature: "imageGeneration" }),
    ).rejects.toThrow("AI_MODEL_INCOMPATIBLE");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("normalizes auth, quota and transport failures without revealing credentials or retrying", async () => {
    const key = credential();
    for (const [status, code] of [
      [403, "AI_CREDENTIAL_REJECTED"],
      [429, "AI_PROVIDER_QUOTA"],
      [500, "AI_PROVIDER_UNAVAILABLE"],
    ] as const) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(key.key, { status }));
      await expect(
        new GeminiProvider(fetcher).models(key, new AbortController().signal),
      ).rejects.toThrow(code);
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error(key.key));
    await expect(
      new GeminiProvider(fetcher).models(key, new AbortController().signal),
    ).rejects.toThrow("AI_PROVIDER_UNAVAILABLE");
  });
  it("parses fragmented SSE and reports cumulative usage as snapshots without exposing thoughts", async () => {
    const events = [
      {
        candidates: [
          {
            content: {
              parts: [{ text: "private", thought: true }, { text: "Olá" }],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 4, totalTokenCount: 5 },
      },
      {
        candidates: [
          { finishReason: "STOP", content: { parts: [{ text: "!" }] } },
        ],
        usageMetadata: {
          promptTokenCount: 4,
          candidatesTokenCount: 2,
          thoughtsTokenCount: 3,
          totalTokenCount: 9,
        },
      },
    ];
    const raw = new TextEncoder().encode(
      events.map((v) => `data: ${JSON.stringify(v)}\r\n\r\n`).join(""),
    );
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (let i = 0; i < raw.length; i += 7)
            controller.enqueue(raw.slice(i, i + 7));
          controller.close();
        },
      }),
    );
    const output = await collect(
      new GeminiProvider(vi.fn<typeof fetch>().mockResolvedValue(response)),
    );
    expect(output.filter((e) => e.type === "text")).toEqual([
      { type: "text", text: "Olá" },
      { type: "text", text: "!" },
    ]);
    expect(output.filter((e) => e.type === "usage").at(-1)).toEqual({
      type: "usage",
      usage: { input: 4, output: 2, thinking: 3, total: 9 },
    });
  });
  it("does not treat blocked content, broken streams or unknown usage as successful output", async () => {
    for (const value of [
      { promptFeedback: { blockReason: "SAFETY" } },
      { candidates: [{ finishReason: "SAFETY" }] },
    ]) {
      await expect(
        collect(
          new GeminiProvider(
            vi
              .fn<typeof fetch>()
              .mockResolvedValue(
                new Response(`data: ${JSON.stringify(value)}\n\n`),
              ),
          ),
        ),
      ).rejects.toThrow("AI_CONTENT_BLOCKED");
    }
    await expect(
      collect(
        new GeminiProvider(
          vi
            .fn<typeof fetch>()
            .mockResolvedValue(new Response('data: {"candidates":[')),
        ),
      ),
    ).rejects.toThrow("AI_PROVIDER_UNAVAILABLE");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          'data: {"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":"OK"}]}}],"usageMetadata":{}}\n\n',
        ),
      );
    expect((await collect(new GeminiProvider(fetcher)))[0]).toEqual({
      type: "usage",
      usage: { input: null, output: null, thinking: null, total: null },
    });
  });
  it("streams text beyond the old response cap and accepts long input without truncation", async () => {
    const text = "x".repeat(1100000);
    const longInput = {
      ...input,
      contents: [
        { role: "user" as const, parts: [{ text: "y".repeat(270000) }] },
      ],
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          "data: " +
            JSON.stringify({
              candidates: [
                { content: { parts: [{ text }] }, finishReason: "STOP" },
              ],
            }) +
            "\n\n",
        ),
      );
    const provider = new GeminiProvider(fetcher);
    let result = "";
    for await (const event of provider.generate(
      credential(),
      longInput,
      new AbortController().signal,
    ))
      if (event.type === "text") result += event.text;
    expect(result).toBe(text);
    expect(JSON.parse(fetcher.mock.calls[0]![1].body).contents).toEqual(
      longInput.contents,
    );
  });
  it("checks expiry before sending and enforces input count limits", async () => {
    const key = { ...credential(), expiresAt: Date.now() - 1 };
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      new GeminiProvider(fetcher).models(key, new AbortController().signal),
    ).rejects.toThrow("AI_CONNECTION_EXPIRED");
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(Response.json({ totalTokens: 10001 }));
    await expect(
      new GeminiProvider(fetcher).countTokens(
        credential(),
        input,
        new AbortController().signal,
      ),
    ).rejects.toThrow("AI_CONTEXT_TOO_LARGE");
  });
  it("validates and re-encodes one image, rejecting malformed and multiple images", async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const part = {
      inlineData: { mimeType: "image/png", data: png.toString("base64") },
    };
    const imageInput: AiGenerationInput = {
      ...input,
      feature: "imageGeneration",
      model: {
        ...model,
        id: "models/gemini-3.1-flash-image",
        features: ["imageGeneration"],
        strictBudgetSupported: false,
      },
    };
    const make = (parts: unknown[]) =>
      new GeminiProvider(
        vi.fn<typeof fetch>().mockResolvedValue(
          Response.json({
            candidates: [{ finishReason: "STOP", content: { parts } }],
          }),
        ),
      );
    const result = await collect(make([part]), imageInput);
    expect(result[0]?.type).toBe("image");
    await expect(collect(make([part, part]), imageInput)).rejects.toThrow(
      "AI_PROVIDER_UNAVAILABLE",
    );
    await expect(
      collect(
        make([{ inlineData: { mimeType: "image/svg+xml", data: "bad" } }]),
        imageInput,
      ),
    ).rejects.toThrow("AI_PROVIDER_UNAVAILABLE");
    await expect(
      collect(
        make([{ inlineData: { mimeType: "image/png", data: "bad" } }]),
        imageInput,
      ),
    ).rejects.toThrow("AI_PROVIDER_UNAVAILABLE");
  });
});

describe("Gemini bounded failures", () => {
  it("aborts timeout and cancellation once, without upstream details", async () => {
    for (const timeout of [true, false]) {
      const control = new AbortController(),
        key = credential();
      const originalTimeout = AbortSignal.timeout;
      if (timeout)
        vi.spyOn(AbortSignal, "timeout").mockReturnValue(control.signal);
      const fetcher = vi.fn<typeof fetch>().mockImplementation(
        async (_url, options) =>
          new Promise((_resolve, reject) => {
            options!.signal!.addEventListener(
              "abort",
              () => reject(new Error(key.key)),
              { once: true },
            );
          }),
      );
      const pending = new GeminiProvider(fetcher).models(
        key,
        timeout ? new AbortController().signal : control.signal,
      );
      control.abort();
      await expect(pending).rejects.toThrow("AI_TIMEOUT");
      expect(fetcher).toHaveBeenCalledTimes(1);
      if (timeout) {
        vi.restoreAllMocks();
        expect(AbortSignal.timeout).toBe(originalTimeout);
      }
    }
  });
  it("rejects oversized image bytes and dimensions before returning a preview", async () => {
    const tooWide = await sharp({
      create: { width: 2049, height: 1, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const imageInput: AiGenerationInput = {
      ...input,
      feature: "imageGeneration",
      model: {
        ...model,
        id: "models/gemini-3.1-flash-image",
        features: ["imageGeneration"],
        strictBudgetSupported: false,
      },
    };
    for (const data of [
      tooWide.toString("base64"),
      Buffer.alloc(8 * 1024 * 1024 + 1).toString("base64"),
    ]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [{ inlineData: { mimeType: "image/png", data } }],
              },
            },
          ],
        }),
      );
      await expect(
        collect(new GeminiProvider(fetcher), imageInput),
      ).rejects.toThrow("AI_PROVIDER_UNAVAILABLE");
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
});
