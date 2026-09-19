import "dotenv/config";

import {strict as assert} from "node:assert";
import {POST} from "../src/app/api/agent/route";
import {acquireAgentSlot} from "../src/security/rate-limit";

async function main() {
  const controller = new AbortController();
  const request = new Request("http://local.test/api/agent", {
    method: "POST",
    headers: {"Content-Type": "application/json", "User-Agent": "cancellation-smoke"},
    body: JSON.stringify({mode: "claim", locale: "en", question: "Can G7 certify portable dedicated-hardware latency for Hyphae 3.0.0?", targetVersion: "3.0.0"}),
    signal: controller.signal,
  });
  const started = Date.now();
  const responsePromise = POST(request);
  setTimeout(() => controller.abort(new DOMException("Smoke cancellation", "AbortError")), 150);
  const response = await responsePromise;
  const elapsedMs = Date.now() - started;
  assert.equal(response.status, 499);
  assert.ok(elapsedMs < 5_000, `Cancellation took ${elapsedMs}ms`);
  const first = acquireAgentSlot(2); const second = acquireAgentSlot(2); const third = acquireAgentSlot(2);
  assert.ok(first); assert.ok(second); assert.equal(third, null); first(); second();
  console.log(JSON.stringify({ok: true, responseStatus: response.status, elapsedMs, slotReleased: true}, null, 2));
}

main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : "Unknown cancellation smoke error"); process.exitCode = 1;});
