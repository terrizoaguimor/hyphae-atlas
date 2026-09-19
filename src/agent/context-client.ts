type RpcEnvelope = {result?: {content?: Array<{text?: string}>}; error?: {message?: string}};
const MAX_CONTEXT_BYTES = 1_000_000;

function parseRpc(body: string): RpcEnvelope {for (const line of body.split("\n")) if (line.startsWith("data:")) return JSON.parse(line.slice(5).trim()) as RpcEnvelope; return JSON.parse(body) as RpcEnvelope;}
async function readBounded(response: Response, signal?: AbortSignal): Promise<string> {
  if (!response.body) throw new Error("Context returned no body"); const reader = response.body.getReader(); const decoder = new TextDecoder(); let total = 0; let text = "";
  const abort = () => void reader.cancel(signal?.reason).catch(() => undefined); signal?.addEventListener("abort", abort, {once: true});
  try {while (true) {const {done, value} = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_CONTEXT_BYTES) {await reader.cancel(); throw new Error("Context response exceeded its limit");} text += decoder.decode(value, {stream: true});} return text + decoder.decode();}
  finally {signal?.removeEventListener("abort", abort); reader.releaseLock();}
}
export async function callContextTool(name: "initial_context" | "knowledge_base_read", argumentsValue: Record<string, unknown>, signal?: AbortSignal, timeoutMs = 30_000): Promise<string> {
  const rawUrl = process.env.SANITY_CONTEXT_MCP_URL; const token = process.env.SANITY_CONTEXT_TOKEN; if (!rawUrl || !token) throw new Error("Sanity Context MCP is not configured");
  const endpoint = new URL(rawUrl); const local = endpoint.hostname === "localhost" || endpoint.hostname === "127.0.0.1" || endpoint.hostname === "::1";
  if (endpoint.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local && endpoint.protocol === "http:")) throw new Error("Sanity Context MCP URL must use HTTPS outside local development");
  const controller = new AbortController(); const relayAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) relayAbort(); else signal?.addEventListener("abort", relayAbort, {once: true});
  const timeout = setTimeout(() => controller.abort(new DOMException(`Context tool ${name} timed out`, "TimeoutError")), timeoutMs);
  try {
    const response = await fetch(endpoint.toString(), {method: "POST", headers: {Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-06-18"}, body: JSON.stringify({jsonrpc: "2.0", id: `${name}-${Date.now()}`, method: "tools/call", params: {name, arguments: argumentsValue}}), signal: controller.signal, cache: "no-store"});
    const body = await readBounded(response, controller.signal);
    if (controller.signal.aborted) throw controller.signal.reason;
    const envelope = parseRpc(body); if (!response.ok || envelope.error) throw new Error(envelope.error?.message ?? `Context tool ${name} failed with HTTP ${response.status}`);
    const text = (envelope.result?.content ?? []).flatMap((part) => typeof part.text === "string" ? [part.text] : []).join("\n"); if (!text.trim()) throw new Error(`Context tool ${name} returned no text`); return text;
  } finally {clearTimeout(timeout); signal?.removeEventListener("abort", relayAbort);}
}

export function parseKnowledgeBaseOutline(text: string): {knowledgeBase: string; paths: string[]} {
  const knowledgeBase = text.match(/Knowledge base id:\s*`(kb[A-Za-z0-9_-]+)`/)?.[1]; if (!knowledgeBase) throw new Error("Knowledge Base ID was not found in initial_context");
  const paths = [...new Set(text.split("\n").flatMap((line) => {const match = line.match(/^([a-z0-9][a-z0-9_./-]*)(?: \[(?:core|peripheral)\])?$/); return match ? [match[1]] : [];}))];
  if (!paths.length) throw new Error("Knowledge Base outline contains no entry paths"); return {knowledgeBase, paths};
}
