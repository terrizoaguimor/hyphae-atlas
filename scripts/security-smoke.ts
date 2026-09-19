import "dotenv/config";

import {strict as assert} from "node:assert";
import {readFile} from "node:fs/promises";
import {BodyLimitError, BodyTimeoutError, readJsonBody} from "../src/security/body";
import {acquireAgentSlot, consumeRateLimit} from "../src/security/rate-limit";
import {atlasReportSchema} from "../src/agent/report-schema";
import {observedEntryPaths} from "../src/agent/context-audit";
import {resolveEvidence} from "../src/agent/evidence-resolver";
import {containsAffirmativeTerm, findForbiddenAssertions} from "../evaluation/polarity";
import {getReplay} from "../src/data/replays";

async function main() {
  const oversized = new Request("http://local.test", {method: "POST", body: new ReadableStream({start(controller) {controller.enqueue(new TextEncoder().encode(`{"value":"${"x".repeat(2_000)}"}`)); controller.close();}}), duplex: "half"} as RequestInit);
  await assert.rejects(() => readJsonBody(oversized, 1_024), BodyLimitError);
  const stalled = new Request("http://local.test", {method: "POST", body: new ReadableStream({start() {}}), duplex: "half"} as RequestInit);
  await assert.rejects(() => readJsonBody(stalled, 1_024, 20), BodyTimeoutError);
  const valid = new Request("http://local.test", {method: "POST", body: JSON.stringify({ok: true})});
  assert.deepEqual(await readJsonBody(valid, 1_024), {ok: true});

  const key = `security-smoke-${Date.now()}`;
  assert.equal(consumeRateLimit("smoke", key, {limit: 1, windowMs: 60_000}).allowed, true);
  assert.equal(consumeRateLimit("smoke", key, {limit: 1, windowMs: 60_000}).allowed, false);
  const release = acquireAgentSlot(1); assert.ok(release); assert.equal(acquireAgentSlot(1), null); release(); const reacquired = acquireAgentSlot(1); assert.ok(reacquired); reacquired();

  assert.deepEqual(observedEntryPaths([{name: "knowledge_base_read", arguments: {path: "one"}}, {name: "knowledge_base_read", arguments: {paths: ["two"]}}, {name: "knowledge_base_read", arguments: {entryPaths: ["three"]}}]), ["one", "two", "three"]);
  assert.equal(containsAffirmativeTerm("Hyphae is a drop-in replacement", "drop-in replacement"), true);
  assert.equal(containsAffirmativeTerm("Hyphae is not a drop-in replacement", "drop-in replacement"), false);
  assert.equal(containsAffirmativeTerm("Hyphae is not universally SQL-compatible. Hyphae is a drop-in replacement.", "drop-in replacement"), true);
  assert.equal(containsAffirmativeTerm("Explicit non-claims include universal SQL compatibility", "universal SQL compatibility"), false);
  assert.deepEqual(findForbiddenAssertions(["Hyphae supports universal SQL compatibility", "HTTP v2", "minor 6"], ["universal SQL compatibility"]), ["universal SQL compatibility"]);

  const validReport = getReplay("en", "claim").result.report;
  assert.equal(atlasReportSchema.safeParse(validReport).success, true);
  const ungrounded = structuredClone(validReport); ungrounded.findings[0].sourceUrls = [];
  assert.equal(atlasReportSchema.safeParse(ungrounded).success, false);
  const forged = structuredClone(validReport); forged.findings[0].sourceUrls = ["https://example.invalid/README.md"];
  const forgedResolution = await resolveEvidence(forged, "README.md — Dataset");
  assert.equal(forgedResolution.findingSourceIds[0].length, 0, "A forged URL containing a legitimate basename must not ground a finding");
  const ambiguous = structuredClone(validReport); ambiguous.findings[0].sourceUrls = ["README.md"];
  const ambiguousResolution = await resolveEvidence(ambiguous, "README.md — Dataset");
  assert.deepEqual(ambiguousResolution.findingSourceIds[0], ["hyphaeAtlas.source.b335630551682c19a781afeb"], "README.md must resolve only to the canonical root README source");

  for (const locale of ["en", "es"] as const) for (const mode of ["migration", "capability", "claim"] as const) {
    const replay = getReplay(locale, mode).result;
    assert.equal(replay.evidence.findingCoverage, 1);
    assert.equal(replay.report.findings.every((_, index) => replay.evidence.findingSourceIds[index]?.length > 0), true);
    assert.equal(replay.retrieval.toolsUsed.includes("initial_context"), true);
    assert.equal(replay.retrieval.toolsUsed.includes("knowledge_base_read"), true);
  }

  const example = await readFile(".env.example", "utf8");
  for (const keyName of ["XAI_API_KEY", "SANITY_WRITE_TOKEN", "SANITY_DEPLOY_TOKEN", "SANITY_READ_TOKEN", "SANITY_CONTEXT_TOKEN"]) {
    const line = example.split("\n").find((item) => item.startsWith(`${keyName}=`));
    assert.equal(line, `${keyName}=`, `${keyName} must be empty in .env.example`);
  }
  console.log(JSON.stringify({ok: true, checks: ["streaming-body-limit", "body-timeout", "json-body", "rate-limit", "concurrency-release", "tool-path-shapes", "claim-polarity", "applicability-polarity", "finding-grounding-schema", "forged-citation-rejection", "canonical-readme-resolution", "six-grounded-replays", "empty-secret-template"]}, null, 2));
}

main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : "Unknown security smoke error"); process.exitCode = 1;});
