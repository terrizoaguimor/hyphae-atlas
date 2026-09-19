import {providerJson} from "./http";
import type {ModelProvider} from "./types";

export function openAiProvider(apiKey: string, model: string): ModelProvider {
  return {name: "openai", model, async generate({system, user, maxTokens, signal}) {
    const payload = await providerJson("https://api.openai.com/v1/responses", "openai", apiKey, {model, instructions: system, input: user, max_output_tokens: maxTokens, store: false}, signal);
    const root = payload as {output_text?: string; output?: Array<{content?: Array<{text?: string}>}>};
    const text = root.output_text ?? root.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("\n");
    if (!text) throw new Error("OpenAI returned no text"); return text;
  }};
}
