export type ProviderName = "xai" | "openai" | "anthropic" | "openai-compatible";
export type GenerateRequest = {system: string; user: string; maxTokens: number; signal?: AbortSignal};
export type ModelProvider = {name: ProviderName; model: string; generate(request: GenerateRequest): Promise<string>};

export class ModelProviderError extends Error {
  constructor(message: string, readonly provider: ProviderName, readonly status: number, readonly retryAfter?: string) {
    super(message); this.name = "ModelProviderError";
  }
}
