import {atlasReportSchema, type AtlasReport} from "./report-schema";

const XAI_BASE_URL = "https://api.x.ai/v1";
const REQUEST_TIMEOUT_MS = 180_000;

export type ObservedToolCall = {name: string; arguments: Record<string, unknown>};
type XaiResult = {report: AtlasReport; toolsUsed: string[]; toolCalls: ObservedToolCall[]; model: string};

export class XaiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfter?: string) {
    super(message);
    this.name = "XaiRequestError";
  }
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("The model response did not contain a JSON object");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function extractResponsesText(payload: unknown): {text: string; toolsUsed: string[]; toolCalls: ObservedToolCall[]} {
  const root = asRecord(payload);
  if (!root) throw new Error("xAI returned an invalid response envelope");
  const direct = typeof root.output_text === "string" ? root.output_text : "";
  const toolsUsed: string[] = [];
  const toolCalls: ObservedToolCall[] = [];
  const chunks: string[] = direct ? [direct] : [];
  const output = Array.isArray(root.output) ? root.output : [];
  for (const rawItem of output) {
    const item = asRecord(rawItem);
    if (!item) continue;
    const type = typeof item.type === "string" ? item.type : "";
    if (type.includes("mcp") || type.includes("tool")) {
      const name = typeof item.name === "string" ? item.name : typeof item.tool_name === "string" ? item.tool_name : type;
      toolsUsed.push(name);
      const rawArguments = item.arguments ?? item.input;
      let argumentsValue: Record<string, unknown> = {};
      if (typeof rawArguments === "string") {
        try {argumentsValue = asRecord(JSON.parse(rawArguments)) ?? {};} catch {argumentsValue = {};}
      } else argumentsValue = asRecord(rawArguments) ?? {};
      toolCalls.push({name, arguments: argumentsValue});
    }
    const content = Array.isArray(item.content) ? item.content : [];
    for (const rawPart of content) {
      const part = asRecord(rawPart);
      if (!part) continue;
      if (typeof part.text === "string") chunks.push(part.text);
      if (typeof part.output_text === "string") chunks.push(part.output_text);
    }
  }
  const text = chunks.join("\n").trim();
  if (!text) throw new Error("xAI returned no textual report");
  return {text, toolsUsed: [...new Set(toolsUsed)], toolCalls};
}

async function xaiRequest(path: string, body: UnknownRecord, externalSignal?: AbortSignal): Promise<unknown> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");
  const controller = new AbortController();
  const abortFromExternal = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromExternal(); else externalSignal?.addEventListener("abort", abortFromExternal, {once: true});
  const timeout = setTimeout(() => controller.abort(new DOMException("xAI request timed out", "TimeoutError")), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${XAI_BASE_URL}${path}`, {
      method: "POST",
      headers: {Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json"},
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const record = asRecord(payload);
      const rawError = record?.error;
      const error = asRecord(rawError);
      const message = typeof rawError === "string"
        ? rawError
        : typeof error?.message === "string"
          ? error.message
          : typeof record?.message === "string"
            ? record.message
            : `xAI request failed with HTTP ${response.status}`;
      const retryAfter = response.headers.get("retry-after") ?? response.headers.get("x-ratelimit-reset-requests") ?? undefined;
      throw new XaiRequestError(message.slice(0, 500), response.status, retryAfter);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

export async function runWithRemoteMcp(system: string, user: string, signal?: AbortSignal): Promise<XaiResult> {
  const model = process.env.XAI_MODEL ?? "grok-4.6";
  const serverUrl = process.env.SANITY_CONTEXT_MCP_URL;
  const token = process.env.SANITY_CONTEXT_TOKEN;
  if (!serverUrl || !token) throw new Error("Sanity Context MCP is not configured");
  const payload = await xaiRequest("/responses", {
    model,
    store: false,
    max_output_tokens: 2_400,
    instructions: system,
    input: user,
    tools: [{
      type: "mcp",
      server_label: "sanity_context",
      server_description: "Read-only Hyphae Atlas Knowledge Base in Sanity Context",
      server_url: serverUrl,
      authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      allowed_tools: ["initial_context", "knowledge_base_read"],
    }],
  }, signal);
  const {text, toolsUsed, toolCalls} = extractResponsesText(payload);
  return {report: atlasReportSchema.parse(extractJson(text)), toolsUsed, toolCalls, model};
}

export async function runWithInlineContext(system: string, user: string, signal?: AbortSignal): Promise<XaiResult> {
  const model = process.env.XAI_MODEL ?? "grok-4.6";
  const payload = await xaiRequest("/chat/completions", {
    model,
    store: false,
    temperature: 0,
    max_tokens: 2_400,
    messages: [{role: "system", content: system}, {role: "user", content: user}],
  }, signal);
  const root = asRecord(payload);
  const choices = Array.isArray(root?.choices) ? root.choices : [];
  const first = asRecord(choices[0]);
  const message = asRecord(first?.message);
  const text = typeof message?.content === "string" ? message.content : "";
  if (!text) throw new Error("xAI returned no textual report");
  return {report: atlasReportSchema.parse(extractJson(text)), toolsUsed: [], toolCalls: [], model};
}
