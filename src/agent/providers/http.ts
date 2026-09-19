import {ModelProviderError, type ProviderName} from "./types";

export async function providerJson(url: string, provider: ProviderName, apiKey: string | null, body: unknown, signal?: AbortSignal, extraHeaders: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const relayAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) relayAbort(); else signal?.addEventListener("abort", relayAbort, {once: true});
  const timeout = setTimeout(() => controller.abort(new DOMException(`${provider} request timed out`, "TimeoutError")), 180_000);
  try {
    const headers: Record<string, string> = {"Content-Type": "application/json", Accept: "application/json", ...extraHeaders};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const response = await fetch(url, {method: "POST", headers, body: JSON.stringify(body), signal: controller.signal, cache: "no-store"});
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const record = typeof payload === "object" && payload ? payload as Record<string, unknown> : {};
      const rawError = record.error; const nested = typeof rawError === "object" && rawError ? rawError as Record<string, unknown> : {};
      const message = typeof rawError === "string" ? rawError : typeof nested.message === "string" ? nested.message : typeof record.message === "string" ? record.message : `${provider} request failed with HTTP ${response.status}`;
      throw new ModelProviderError(message.slice(0, 500), provider, response.status, response.headers.get("retry-after") ?? undefined);
    }
    return payload;
  } finally {clearTimeout(timeout); signal?.removeEventListener("abort", relayAbort);}
}

export function requireHttpsBase(value: string): string {
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local && url.protocol === "http:")) throw new Error("Custom model base URL must use HTTPS outside local development");
  return value.replace(/\/$/, "");
}
