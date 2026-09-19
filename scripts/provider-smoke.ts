import {strict as assert} from "node:assert";
import {anthropicProvider} from "../src/agent/providers/anthropic";
import {openAiProvider} from "../src/agent/providers/openai";
import {openAiCompatibleProvider} from "../src/agent/providers/openai-compatible";

type Captured = {url: string; headers: Headers; body: Record<string, unknown>};
async function main() {
  const originalFetch = globalThis.fetch; const requests: Captured[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input); const headers = new Headers(init?.headers); const body = JSON.parse(String(init?.body)) as Record<string, unknown>; requests.push({url, headers, body});
    if (url.includes("anthropic.com")) return new Response(JSON.stringify({content: [{type: "text", text: "anthropic-ok"}]}), {status: 200, headers: {"Content-Type": "application/json"}});
    if (url.includes("openai.com")) return new Response(JSON.stringify({output_text: "openai-ok"}), {status: 200, headers: {"Content-Type": "application/json"}});
    return new Response(JSON.stringify({choices: [{message: {content: "compatible-ok"}}]}), {status: 200, headers: {"Content-Type": "application/json"}});
  };
  try {
    const request = {system: "system", user: "user", maxTokens: 100};
    assert.equal(await openAiCompatibleProvider({name: "xai", apiKey: "xai-test", model: "xai-model", baseUrl: "https://example.test/v1"}).generate(request), "compatible-ok");
    assert.equal(await openAiProvider("openai-test", "openai-model").generate(request), "openai-ok");
    assert.equal(await anthropicProvider("anthropic-test", "anthropic-model").generate(request), "anthropic-ok");

    const compatible = requests.find((item) => item.url === "https://example.test/v1/chat/completions");
    assert.equal(compatible?.headers.get("authorization"), "Bearer xai-test"); assert.equal(compatible?.body.model, "xai-model"); assert.ok(Array.isArray(compatible?.body.messages));
    const openai = requests.find((item) => item.url === "https://api.openai.com/v1/responses");
    assert.equal(openai?.headers.get("authorization"), "Bearer openai-test"); assert.equal(openai?.body.model, "openai-model"); assert.equal(openai?.body.input, "user");
    const anthropic = requests.find((item) => item.url === "https://api.anthropic.com/v1/messages");
    assert.equal(anthropic?.headers.get("x-api-key"), "anthropic-test"); assert.equal(anthropic?.headers.get("authorization"), null); assert.equal(anthropic?.headers.get("anthropic-version"), "2023-06-01"); assert.equal(anthropic?.body.model, "anthropic-model"); assert.equal(anthropic?.body.system, "system");
    console.log(JSON.stringify({ok: true, adapters: ["xai", "openai", "anthropic", "openai-compatible"], authAndPayloadChecks: 12, requests: requests.length}, null, 2));
  } finally {globalThis.fetch = originalFetch;}
}

main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : "Unknown provider smoke error"); process.exitCode = 1;});
