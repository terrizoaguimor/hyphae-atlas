import {providerJson} from "./http";
import type {ModelProvider} from "./types";

export function anthropicProvider(apiKey: string, model: string): ModelProvider {
  return {name: "anthropic", model, async generate({system, user, maxTokens, signal}) {
    const payload = await providerJson("https://api.anthropic.com/v1/messages", "anthropic", null, {model, system, max_tokens: maxTokens, messages: [{role: "user", content: user}]}, signal, {"x-api-key": apiKey, "anthropic-version": "2023-06-01"});
    const root = payload as {content?: Array<{type?: string; text?: string}>}; const text = root.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
    if (!text) throw new Error("Anthropic returned no text"); return text;
  }};
}
