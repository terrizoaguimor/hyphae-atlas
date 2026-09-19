import "dotenv/config";

import {atlasQuerySchema} from "../src/agent/report-schema";
import {runAtlasAgent} from "../src/agent/sanity-context";

type RpcEnvelope = {result?: {tools?: Array<{name?: string}>; content?: Array<{text?: string}>}; error?: {message?: string}};

function parseRpc(body: string): RpcEnvelope {
  for (const line of body.split("\n")) if (line.startsWith("data:")) return JSON.parse(line.slice(5).trim()) as RpcEnvelope;
  return JSON.parse(body) as RpcEnvelope;
}

async function rpcCall(method: string, params: Record<string, unknown>): Promise<RpcEnvelope> {
  const url = process.env.SANITY_CONTEXT_MCP_URL!;
  const token = process.env.SANITY_CONTEXT_TOKEN!;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
    },
    body: JSON.stringify({jsonrpc: "2.0", id: method, method, params}),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(parseRpc(body).error?.message ?? `Context MCP returned HTTP ${response.status}`);
  return parseRpc(body);
}

async function inspectContext() {
  const toolEnvelope = await rpcCall("tools/list", {});
  const tools = toolEnvelope.result?.tools?.flatMap((tool) => tool.name ? [tool.name] : []) ?? [];
  const contextEnvelope = await rpcCall("tools/call", {name: "initial_context", arguments: {}});
  const context = contextEnvelope.result?.content?.map((part) => part.text ?? "").join("\n") ?? "";
  const entryCounts = [...context.matchAll(/\b(\d+) entries\b/g)].map((match) => Number(match[1]));
  return {tools, entryCount: entryCounts.reduce((sum, count) => sum + count, 0)};
}

async function main() {
  if (!process.env.SANITY_CONTEXT_TOKEN || !process.env.SANITY_CONTEXT_MCP_URL) {
    console.log(JSON.stringify({ok: false, blocked: true, reason: "SANITY_CONTEXT_TOKEN and SANITY_CONTEXT_MCP_URL are required", next: "Create the Knowledge Base and MCP endpoint in the Sanity Context Dashboard."}, null, 2));
    process.exitCode = 2;
    return;
  }

  const inspection = await inspectContext();
  const requiredTools = ["initial_context", "knowledge_base_read"];
  const unavailableTools = requiredTools.filter((tool) => !inspection.tools.includes(tool));
  if (unavailableTools.length || inspection.entryCount === 0) {
    console.log(JSON.stringify({ok: false, blocked: true, tools: inspection.tools, entryCount: inspection.entryCount, unavailableTools, reason: unavailableTools.length ? "The MCP is not in Knowledge Base mode" : "The attached Knowledge Base has zero built entries", next: "Add a source in the Sanity Context Dashboard, run Build entries, and wait for Entries up to date."}, null, 2));
    process.exitCode = 2;
    return;
  }

  const query = atlasQuerySchema.parse({mode: "claim", question: "Can G7 be cited as dedicated-hardware latency certification for Hyphae 3.0.0?"});
  const result = await runAtlasAgent(query);
  const toolTrace = result.retrieval.toolsUsed.join(" ").toLowerCase();
  const missingTools = requiredTools.filter((tool) => !toolTrace.includes(tool));
  const output = {ok: result.retrieval.mode === "sanity-context-mcp" && missingTools.length === 0, retrievalMode: result.retrieval.mode, entryCount: inspection.entryCount, verdict: result.report.verdict, toolsUsed: result.retrieval.toolsUsed, missingTools, sourceCount: result.report.sources.length};
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown Context smoke error");
  process.exitCode = 1;
});
