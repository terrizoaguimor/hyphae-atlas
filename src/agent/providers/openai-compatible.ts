import {providerJson, requireHttpsBase} from "./http";
import type {ModelProvider, ProviderName} from "./types";

type Config = {name: ProviderName; apiKey: string; model: string; baseUrl: string; includeStore?: boolean};
export function openAiCompatibleProvider(config: Config): ModelProvider {
  const baseUrl = requireHttpsBase(config.baseUrl);
  return {name: config.name, model: config.model, async generate({system, user, maxTokens, signal}) {
    const payload = await providerJson(`${baseUrl}/chat/completions`, config.name, config.apiKey, {model: config.model, ...(config.includeStore ? {store: false} : {}), temperature: 0, max_tokens: maxTokens, messages: [{role: "system", content: system}, {role: "user", content: user}]}, signal);
    const root = payload as {choices?: Array<{message?: {content?: string}}>}; const text = root.choices?.[0]?.message?.content;
    if (!text) throw new Error(`${config.name} returned no text`); return text;
  }};
}
