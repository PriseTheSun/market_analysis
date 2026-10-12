import type { AiFeature, AiModel, AiTokenUsage } from "@market/contracts";

export interface AiCredential {
  readonly key: string;
  readonly revision: string;
  readonly expiresAt: number;
  readonly signal: AbortSignal;
}
export interface AiContent {
  role: "user" | "model";
  parts: { text: string }[];
}
export interface AiGenerationInput {
  model: AiModel;
  feature: AiFeature;
  contents: AiContent[];
  maxOutputTokens: number;
}
export type AiGenerationEvent =
  | { type: "text"; text: string }
  | { type: "usage"; usage: AiTokenUsage }
  | { type: "image"; bytes: Uint8Array; mimeType: string };
export interface AiProvider {
  models(credential: AiCredential, signal: AbortSignal): Promise<AiModel[]>;
  countTokens(
    credential: AiCredential,
    input: AiGenerationInput,
    signal: AbortSignal,
  ): Promise<number>;
  generate(
    credential: AiCredential,
    input: AiGenerationInput,
    signal: AbortSignal,
  ): AsyncIterable<AiGenerationEvent>;
}
export const AI_PROVIDER = Symbol("AI_PROVIDER");
