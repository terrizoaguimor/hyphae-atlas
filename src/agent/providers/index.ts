import {anthropicProvider} from "./anthropic";
import {openAiProvider} from "./openai";
import {openAiCompatibleProvider} from "./openai-compatible";
import type {ModelProvider, ProviderName} from "./types";
export {ModelProviderError} from "./types";

function required(name: string, value: string | undefined): string {if (!value) throw new Error(`${name} is required for the selected model provider`); return value;}
export function configuredProviderName(): ProviderName {const value = process.env.MODEL_PROVIDER ?? "xai"; if (!["xai", "openai", "anthropic", "openai-compatible"].includes(value)) throw new Error(`Unsupported MODEL_PROVIDER: ${value}`); return value as ProviderName;}

export function getModelProvider(): ModelProvider {
  const provider = configuredProviderName();
  if (provider === "xai") return openAiCompatibleProvider({name: "xai", apiKey: required("XAI_API_KEY", process.env.XAI_API_KEY), model: required("XAI_MODEL", process.env.XAI_MODEL), baseUrl: "https://api.x.ai/v1", includeStore: true});
  if (provider === "openai") return openAiProvider(required("OPENAI_API_KEY", process.env.OPENAI_API_KEY), required("OPENAI_MODEL", process.env.OPENAI_MODEL));
  if (provider === "anthropic") return anthropicProvider(required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY), required("ANTHROPIC_MODEL", process.env.ANTHROPIC_MODEL));
  return openAiCompatibleProvider({name: provider, apiKey: required("MODEL_API_KEY", process.env.MODEL_API_KEY), model: required("MODEL_NAME", process.env.MODEL_NAME), baseUrl: required("MODEL_BASE_URL", process.env.MODEL_BASE_URL)});
}

export function providerConfiguration() {try {const provider = getModelProvider(); return {configured: true, name: provider.name, model: provider.model};} catch {return {configured: false, name: configuredProviderName(), model: null};}}
