import type { Locale } from "@market/contracts";
import { setTimeout as delay } from "node:timers/promises";
export interface ChatProvider {
  readonly mode: "demo" | "unavailable";
  stream(
    input: { content: string; locale: Locale },
    signal: AbortSignal,
  ): AsyncIterable<string>;
}
export class DemoProvider implements ChatProvider {
  readonly mode = "demo";
  async *stream(
    input: { content: string; locale: Locale },
    signal: AbortSignal,
  ) {
    const responses = {
      "pt-BR": `**Ambiente demonstrativo**\n\nRecebi sua pergunta: “${input.content.replace(/[<>\[\]`]/g, "").slice(0, 300)}”.\n\nPara estruturar uma análise, comece por três pontos:\n\n1. **Objetivo:** qual decisão você precisa tomar?\n2. **Evidência:** quais dados você já tem e a que período se referem?\n3. **Comparação:** qual referência permite avaliar o resultado?\n\nEsta resposta é um exemplo determinístico. Não consultei dados de mercado nem analisei os arquivos enviados.`,
      en: `**Demo environment**\n\nI received your question: “${input.content.replace(/[<>\[\]`]/g, "").slice(0, 300)}”.\n\nStart your analysis with three points:\n\n1. **Objective:** what decision do you need to make?\n2. **Evidence:** what data do you have, and for which period?\n3. **Comparison:** what benchmark will help evaluate the result?\n\nThis is a deterministic example. I have not consulted market data or analyzed uploaded files.`,
      es: `**Entorno de demostración**\n\nRecibí tu pregunta: «${input.content.replace(/[<>\[\]`]/g, "").slice(0, 300)}».\n\nEstructura el análisis con tres puntos:\n\n1. **Objetivo:** ¿qué decisión necesitas tomar?\n2. **Evidencia:** ¿qué datos tienes y a qué período corresponden?\n3. **Comparación:** ¿qué referencia permite evaluar el resultado?\n\nEsta respuesta es un ejemplo determinista. No consulté datos de mercado ni analicé los archivos enviados.`,
    };
    for (const part of responses[input.locale].match(/\S+\s*/g) ?? []) {
      await delay(55, undefined, { signal });
      yield part;
    }
  }
}
export class UnavailableProvider implements ChatProvider {
  readonly mode = "unavailable";
  async *stream(): AsyncIterable<string> {
    throw new Error("provider unavailable");
    yield "";
  }
}

export function createProvider(
  mode: "demo" | "unavailable",
  environment: string,
): ChatProvider {
  return mode === "demo" && environment !== "production"
    ? new DemoProvider()
    : new UnavailableProvider();
}
