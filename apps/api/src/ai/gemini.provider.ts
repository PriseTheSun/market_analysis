import { Inject, Injectable } from "@nestjs/common";
import {
  aiModelIdSchema,
  type AiModel,
  type AiTokenUsage,
} from "@market/contracts";
import { z } from "zod";
import sharp from "sharp";
import { AppError } from "../common/errors.js";
import type {
  AiCredential,
  AiGenerationEvent,
  AiGenerationInput,
  AiProvider,
} from "./ai.provider.js";
import { geminiCapabilities } from "./gemini-capabilities.js";

export const AI_FETCH = Symbol("AI_FETCH");
export const aiFetchProvider = {
  provide: AI_FETCH,
  useValue: globalThis.fetch,
};
const modelList = z.object({
  models: z
    .array(
      z.object({
        name: z.string(),
        displayName: z.string().optional(),
        inputTokenLimit: z.number().int().positive().optional(),
        outputTokenLimit: z.number().int().positive().optional(),
        supportedGenerationMethods: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  nextPageToken: z.string().max(4096).optional(),
});
const output = z.object({
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z
              .array(
                z.object({
                  text: z.string().optional(),
                  thought: z.boolean().optional(),
                  inlineData: z
                    .object({ mimeType: z.string(), data: z.string() })
                    .optional(),
                }),
              )
              .default([]),
          })
          .optional(),
      }),
    )
    .default([]),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().int().nonnegative().optional(),
      candidatesTokenCount: z.number().int().nonnegative().optional(),
      thoughtsTokenCount: z.number().int().nonnegative().optional(),
      totalTokenCount: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export async function* responseChunks(response: Response, limit = Infinity) {
  if (!response.body) throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
  const reader = response.body.getReader();
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
      yield value;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
async function readJson(response: Response, limit: number): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of responseChunks(response, limit)) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
  }
}
export async function* sseJson(response: Response) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of responseChunks(response)) {
    buffer += decoder.decode(chunk, { stream: true });
    let match: RegExpExecArray | null;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const event = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data || data === "[DONE]") continue;
      try {
        yield JSON.parse(data) as unknown;
      } catch {
        throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
      }
    }
  }
  if (buffer.trim()) throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
}

@Injectable()
export class GeminiProvider implements AiProvider {
  constructor(@Inject(AI_FETCH) private fetcher: typeof fetch) {}
  private async request(
    credential: AiCredential,
    path: string,
    signal: AbortSignal,
    body?: unknown,
    query?: URLSearchParams,
  ) {
    if (
      path !== "models" &&
      !/^models\/[\w.-]+:(countTokens|generateContent|streamGenerateContent)$/.test(
        path,
      )
    )
      throw new AppError(400, "AI_MODEL_INCOMPATIBLE");
    if (credential.expiresAt <= Date.now() || credential.signal.aborted)
      throw new AppError(409, "AI_CONNECTION_EXPIRED");
    const timeout = AbortSignal.timeout(body === undefined ? 15000 : 120000);
    try {
      const response = await this.fetcher(
        `https://generativelanguage.googleapis.com/v1beta/${path}${query ? `?${query}` : ""}`,
        {
          method: body === undefined ? "GET" : "POST",
          redirect: "error",
          headers: {
            "x-goog-api-key": credential.key,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.any([signal, credential.signal, timeout]),
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if ([401, 403].includes(response.status))
          throw new AppError(422, "AI_CREDENTIAL_REJECTED");
        if (response.status === 429)
          throw new AppError(429, "AI_PROVIDER_QUOTA");
        if ([400, 404].includes(response.status))
          throw new AppError(422, "AI_MODEL_INCOMPATIBLE");
        throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
      }
      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (credential.signal.aborted)
        throw new AppError(409, "AI_CONNECTION_EXPIRED");
      if (signal.aborted || timeout.aborted)
        throw new AppError(408, "AI_TIMEOUT");
      throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
    }
  }
  async models(
    credential: AiCredential,
    signal: AbortSignal,
  ): Promise<AiModel[]> {
    const models = new Map<string, AiModel>();
    const pages = new Set<string>();
    let token = "";
    do {
      if (pages.size >= 10 || pages.has(token))
        throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
      pages.add(token);
      const query = new URLSearchParams({
        pageSize: "100",
        ...(token ? { pageToken: token } : {}),
      });
      const parsed = modelList.safeParse(
        await readJson(
          await this.request(credential, "models", signal, undefined, query),
          1024 * 1024,
        ),
      );
      if (!parsed.success) throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
      for (const item of parsed.data.models) {
        const capability = geminiCapabilities[item.name];
        if (
          !capability ||
          !item.inputTokenLimit ||
          !item.outputTokenLimit ||
          !item.supportedGenerationMethods.includes("generateContent")
        )
          continue;
        models.set(item.name, {
          id: item.name,
          label: (item.displayName || item.name.slice(7)).slice(0, 200),
          features: capability.features,
          inputTokenLimit: item.inputTokenLimit,
          outputTokenLimit: item.outputTokenLimit,
          strictBudgetSupported: capability.strictBudgetSupported,
        });
      }
      token = parsed.data.nextPageToken ?? "";
    } while (token);
    return [...models.values()];
  }
  private validate(input: AiGenerationInput) {
    if (
      !aiModelIdSchema.safeParse(input.model.id).success ||
      !geminiCapabilities[input.model.id]?.features.includes(input.feature)
    )
      throw new AppError(422, "AI_MODEL_INCOMPATIBLE");
    if (!input.contents.length) throw new AppError(422, "AI_CONTEXT_TOO_LARGE");
  }
  async countTokens(
    credential: AiCredential,
    input: AiGenerationInput,
    signal: AbortSignal,
  ) {
    this.validate(input);
    const parsed = z
      .object({ totalTokens: z.number().int().nonnegative().safe() })
      .safeParse(
        await readJson(
          await this.request(
            credential,
            `${input.model.id}:countTokens`,
            signal,
            { contents: input.contents },
          ),
          65536,
        ),
      );
    if (!parsed.success) throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
    if (parsed.data.totalTokens > input.model.inputTokenLimit)
      throw new AppError(422, "AI_CONTEXT_TOO_LARGE");
    return parsed.data.totalTokens;
  }
  async *generate(
    credential: AiCredential,
    input: AiGenerationInput,
    signal: AbortSignal,
  ): AsyncIterable<AiGenerationEvent> {
    this.validate(input);
    const capability = geminiCapabilities[input.model.id]!;
    const image = input.feature === "imageGeneration";
    const generationConfig = {
      candidateCount: 1,
      maxOutputTokens: Math.min(
        input.maxOutputTokens,
        input.model.outputTokenLimit,
      ),
      thinkingConfig:
        capability.thinking === "off"
          ? { thinkingBudget: 0, includeThoughts: false }
          : { thinkingLevel: "LOW", includeThoughts: false },
      ...(image
        ? {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
          }
        : { responseModalities: ["TEXT"] }),
    };
    const response = await this.request(
      credential,
      `${input.model.id}:${image ? "generateContent" : "streamGenerateContent"}`,
      signal,
      { contents: input.contents, generationConfig },
      image ? undefined : new URLSearchParams({ alt: "sse" }),
    );
    const events = image
      ? (async function* () {
          yield await readJson(response, 16 * 1024 * 1024);
        })()
      : sseJson(response);
    let content = false,
      images = 0,
      finished = false;
    for await (const raw of events) {
      if (signal.aborted || credential.signal.aborted)
        throw new AppError(409, "AI_CONNECTION_EXPIRED");
      const parsed = output.safeParse(raw);
      if (!parsed.success) throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
      const value = parsed.data;
      if (value.usageMetadata) {
        const u = value.usageMetadata;
        const usage: AiTokenUsage = {
          input: u.promptTokenCount ?? null,
          output: u.candidatesTokenCount ?? null,
          thinking: u.thoughtsTokenCount ?? null,
          total: u.totalTokenCount ?? null,
        };
        yield { type: "usage", usage };
      }
      if (value.promptFeedback?.blockReason)
        throw new AppError(422, "AI_CONTENT_BLOCKED");
      for (const candidate of value.candidates) {
        if (
          candidate.finishReason &&
          !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)
        )
          throw new AppError(422, "AI_CONTENT_BLOCKED");
        finished ||= !!candidate.finishReason;
        for (const part of candidate.content?.parts ?? []) {
          if (part.thought) continue;
          if (part.text) {
            content = true;
            yield { type: "text", text: part.text };
          }
          if (part.inlineData) {
            if (
              !image ||
              ++images > 1 ||
              !["image/png", "image/jpeg", "image/webp"].includes(
                part.inlineData.mimeType,
              )
            )
              throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
            const bytes = Buffer.from(part.inlineData.data, "base64");
            if (!bytes.length || bytes.length > 8 * 1024 * 1024)
              throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
            try {
              const metadata = await sharp(bytes, {
                limitInputPixels: 4096 * 4096,
              }).metadata();
              if (
                !["png", "jpeg", "webp"].includes(metadata.format) ||
                metadata.width > 2048 ||
                metadata.height > 2048 ||
                (metadata.pages ?? 1) > 1
              )
                throw new Error();
              const safe = await sharp(bytes, { limitInputPixels: 4096 * 4096 })
                .png()
                .toBuffer();
              content = true;
              yield { type: "image", bytes: safe, mimeType: "image/png" };
            } catch {
              throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
            }
          }
        }
      }
    }
    if (!content || !finished || (image && images !== 1))
      throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
  }
}
