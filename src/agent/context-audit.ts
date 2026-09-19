import type {ObservedToolCall} from "./xai";

type RpcEnvelope = {result?: {content?: Array<{text?: string}>}; error?: {message?: string}};
const MAX_AUDIT_BYTES = 1_000_000;

function parseRpc(body: string): RpcEnvelope {
  for (const line of body.split("\n")) if (line.startsWith("data:")) return JSON.parse(line.slice(5).trim()) as RpcEnvelope;
  return JSON.parse(body) as RpcEnvelope;
}

async function readBounded(response: Response, signal?: AbortSignal): Promise<string> {
  if (!response.body) throw new Error("Context audit returned no body");
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let total = 0; let text = "";
  const abort = () => void reader.cancel(signal?.reason).catch(() => undefined);
  signal?.addEventListener("abort", abort, {once: true});
  try {
    while (true) {const {done, value} = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_AUDIT_BYTES) {await reader.cancel(); throw new Error("Context audit response exceeded its limit");} text += decoder.decode(value, {stream: true});}
    text += decoder.decode(); return text;
  } finally {signal?.removeEventListener("abort", abort); reader.releaseLock();}
}

export function observedEntryPaths(toolCalls: ObservedToolCall[]): string[] {
  const paths = new Set<string>();
  for (const call of toolCalls.filter((item) => item.name === "knowledge_base_read")) {
    for (const candidate of [call.arguments.paths, call.arguments.entryPaths, call.arguments.path]) {
      if (Array.isArray(candidate)) {
        for (const value of candidate) if (typeof value === "string") paths.add(value);
      } else if (typeof candidate === "string") paths.add(candidate);
    }
  }
  return [...paths];
}

export async function auditKnowledgeBaseReads(toolCalls: ObservedToolCall[], signal?: AbortSignal): Promise<{entryPaths: string[]; retrievedText: string}> {
  const url = process.env.SANITY_CONTEXT_MCP_URL; const token = process.env.SANITY_CONTEXT_TOKEN;
  if (!url || !token) throw new Error("Context audit environment is incomplete");
  const readCalls = toolCalls.filter((call) => call.name === "knowledge_base_read");
  if (!readCalls.length) throw new Error("No observed knowledge_base_read call to audit");
  const outputs: string[] = [];
  for (const [index, call] of readCalls.entries()) {
    const response = await fetch(url, {method: "POST", headers: {Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-06-18"}, body: JSON.stringify({jsonrpc: "2.0", id: `audit-${index}`, method: "tools/call", params: {name: "knowledge_base_read", arguments: call.arguments}}), signal, cache: "no-store"});
    const envelope = parseRpc(await readBounded(response, signal));
    if (!response.ok || envelope.error) throw new Error(envelope.error?.message ?? `Context audit failed with HTTP ${response.status}`);
    outputs.push(...(envelope.result?.content ?? []).flatMap((part) => typeof part.text === "string" ? [part.text] : []));
  }
  const retrievedText = outputs.join("\n");
  if (!retrievedText.trim()) throw new Error("Observed Knowledge Base calls returned no auditable text");
  return {entryPaths: observedEntryPaths(toolCalls), retrievedText};
}
