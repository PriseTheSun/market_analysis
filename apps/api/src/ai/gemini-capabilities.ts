import type { AiFeature } from "@market/contracts";

// Reviewed 2026-10-11. See docs/ai-settings.md for the model cards and budget rationale.
interface Capability {
  features: AiFeature[];
  thinking: "off" | "low";
  strictBudgetSupported: boolean;
}
export const geminiCapabilities: Readonly<Record<string, Capability>> = {
  "models/gemini-2.5-flash": {
    features: ["chatText"],
    thinking: "off",
    strictBudgetSupported: true,
  },
  "models/gemini-3.5-flash-lite": {
    features: ["chatText"],
    thinking: "low",
    strictBudgetSupported: false,
  },
  "models/gemini-3.8-flash": {
    features: ["chatText"],
    thinking: "low",
    strictBudgetSupported: false,
  },
  "models/gemini-3.1-flash-image": {
    features: ["imageGeneration"],
    thinking: "low",
    strictBudgetSupported: false,
  },
};
