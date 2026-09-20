import "dotenv/config";

import {strict as assert} from "node:assert";
import {readFile} from "node:fs/promises";
import {BodyLimitError, BodyTimeoutError, readJsonBody} from "../src/security/body";
import {acquireAgentSlot, clientIdentity, consumeRateLimit} from "../src/security/rate-limit";
import {combinedDeadline} from "../src/security/deadline";
import {atlasReportSchema} from "../src/agent/report-schema";
import {callContextTool, parseKnowledgeBaseOutline} from "../src/agent/context-client";
import {resolveEvidenceDocuments, type ResolverLinkedDocument, type ResolverSourceDocument} from "../src/agent/evidence-resolver";
import {systemPrompt} from "../src/agent/prompts";
import {evaluationSystemPrompt} from "../evaluation/ablation-prompt";
import reviewedDecisionJson from "../corpus/adjudications/g7-closure-portability.json";
import {assertReviewedAdjudication, reviewedAdjudicationSchema} from "../src/lib/adjudication-integrity";
import {containsAffirmativeTerm, findForbiddenAssertions} from "../evaluation/polarity";
import {hasAllowedOrigin} from "../src/security/origin";
import {verifyTurnstile} from "../src/security/turnstile";
import {getReplay} from "../src/data/replays";
import {parseJudgeStep} from "../src/data/judge-mode";
import {hasZeroCreditedGrounding, isStructuredContextRetrieval} from "../evaluation/ablation-contract";
import {exactSelectedSourcePaths} from "../evaluation/lexical-resolution";
import type {PinnedSource} from "./lib/pinned-corpus";

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
  const deadline = combinedDeadline(new AbortController().signal, 20); const deadlineStarted = Date.now();
  await assert.rejects(() => new Promise((_resolve, reject) => deadline.signal.addEventListener("abort", () => reject(deadline.signal.reason), {once: true})), (error: unknown) => error instanceof DOMException && error.name === "TimeoutError");
  assert.ok(Date.now() - deadlineStarted < 500); deadline.cleanup();

  assert.deepEqual(parseKnowledgeBaseOutline("Knowledge base id: `kbExample123`\n\nalpha/one [core]\n  summary\nbeta/two\n  summary").paths, ["alpha/one", "beta/two"]);
  const originalContextUrl = process.env.SANITY_CONTEXT_MCP_URL;
  process.env.SANITY_CONTEXT_MCP_URL = "http://example.invalid/mcp";
  await assert.rejects(() => callContextTool("initial_context", {}), /must use HTTPS/);
  process.env.SANITY_CONTEXT_MCP_URL = originalContextUrl;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_input, init) => new Promise<Response>((_resolve, reject) => {
    const requestSignal = init?.signal;
    if (requestSignal?.aborted) reject(requestSignal.reason);
    else requestSignal?.addEventListener("abort", () => reject(requestSignal.reason), {once: true});
  });
  await assert.rejects(() => callContextTool("initial_context", {}, undefined, 20), (error: unknown) => error instanceof DOMException && error.name === "TimeoutError");
  globalThis.fetch = async () => new Response(new ReadableStream({start(controller) {controller.enqueue(new TextEncoder().encode("{\"jsonrpc\":\"2.0\""));}}), {status: 200, headers: {"Content-Type": "application/json"}});
  await assert.rejects(() => callContextTool("initial_context", {}, undefined, 20), (error: unknown) => error instanceof DOMException && error.name === "TimeoutError");
  globalThis.fetch = originalFetch;

  const savedCloudflare = process.env.CLOUDFLARE_DEPLOYMENT; const savedSecret = process.env.TURNSTILE_SECRET_KEY; const savedAppUrl = process.env.APP_URL;
  process.env.CLOUDFLARE_DEPLOYMENT = "true"; process.env.TURNSTILE_SECRET_KEY = "turnstile-test-secret"; process.env.APP_URL = "https://atlas.terrizoaguimor.dev";
  const turnstileFetch = globalThis.fetch;
  let turnstilePayload = {success: true, hostname: "atlas.terrizoaguimor.dev", action: "atlas-query", challenge_ts: new Date().toISOString(), "error-codes": [] as string[]};
  globalThis.fetch = async () => new Response(JSON.stringify(turnstilePayload), {status: 200, headers: {"Content-Type": "application/json"}});
  const sameOriginRequest = new Request("https://atlas.terrizoaguimor.dev/api/agent", {headers: {Origin: "https://atlas.terrizoaguimor.dev", "Sec-Fetch-Site": "same-origin", "CF-Connecting-IP": "192.0.2.1"}});
  assert.equal(hasAllowedOrigin(sameOriginRequest), true);
  const identityA = clientIdentity(new Request("https://atlas.terrizoaguimor.dev", {headers: {"CF-Connecting-IP": "192.0.2.1", "User-Agent": "agent-a"}}));
  const identityARotatedAgent = clientIdentity(new Request("https://atlas.terrizoaguimor.dev", {headers: {"CF-Connecting-IP": "192.0.2.1", "User-Agent": "agent-b"}}));
  const identityB = clientIdentity(new Request("https://atlas.terrizoaguimor.dev", {headers: {"CF-Connecting-IP": "192.0.2.2", "User-Agent": "agent-a"}}));
  assert.equal(identityA, identityARotatedAgent); assert.notEqual(identityA, identityB);
  assert.equal(hasAllowedOrigin(new Request("https://atlas.terrizoaguimor.dev/api/agent", {headers: {Origin: "https://evil.invalid"}})), false);
  assert.equal(hasAllowedOrigin(new Request("https://atlas.terrizoaguimor.dev/api/agent", {headers: {Origin: "https://atlas.terrizoaguimor.dev", "Sec-Fetch-Site": "cross-site"}})), false);
  assert.deepEqual(await verifyTurnstile("valid-test-token", sameOriginRequest, "atlas-query"), {valid: true});
  assert.deepEqual(await verifyTurnstile("valid-test-token", sameOriginRequest, "wrong-action"), {valid: false, reason: "action"});
  turnstilePayload = {...turnstilePayload, hostname: "evil.invalid"};
  assert.deepEqual(await verifyTurnstile("valid-test-token", sameOriginRequest, "atlas-query"), {valid: false, reason: "hostname"});
  turnstilePayload = {...turnstilePayload, hostname: "atlas.terrizoaguimor.dev", challenge_ts: new Date(Date.now() - 360_000).toISOString()};
  assert.deepEqual(await verifyTurnstile("valid-test-token", sameOriginRequest, "atlas-query"), {valid: false, reason: "expired"});
  turnstilePayload = {...turnstilePayload, success: false, challenge_ts: new Date().toISOString()};
  assert.deepEqual(await verifyTurnstile("invalid-test-token", sameOriginRequest, "atlas-query"), {valid: false, reason: "failed"});
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.deepEqual(await verifyTurnstile("valid-test-token", sameOriginRequest, "atlas-query"), {valid: false, reason: "configuration"});
  process.env.TURNSTILE_SECRET_KEY = "turnstile-test-secret";
  const routeSource = await readFile("src/app/api/agent/route.ts", "utf8");
  const widgetSource = await readFile("src/components/TurnstileChallenge.tsx", "utf8");
  assert.ok(widgetSource.includes("onError={() => setState(\"error\")}"));
  assert.ok(widgetSource.includes("aria-busy={state === \"waiting\"}"));
  const workbenchSource = await readFile("src/components/AtlasWorkbench.tsx", "utf8");
  assert.ok(workbenchSource.includes("key={turnstileReset}"));
  assert.ok(workbenchSource.includes("if (turnstileEnabled) resetTurnstile()"));
  assert.equal(parseJudgeStep("?judge=proof"), "proof"); assert.equal(parseJudgeStep("?judge=live"), null);
  assert.equal(isStructuredContextRetrieval("sanity-context-mcp", ["initial_context", "knowledge_base_read"]), true); assert.equal(isStructuredContextRetrieval("sanity-dataset-preview", []), false);
  assert.equal(hasZeroCreditedGrounding({suppliedContextBytes: 0, selectedSourcePaths: [], resolvedSourcePaths: [], findingSourcePaths: [[], []], findingGroundingCoverage: 0, sourceCoverage: 0}), true);
  assert.equal(hasZeroCreditedGrounding({suppliedContextBytes: 0, selectedSourcePaths: [], resolvedSourcePaths: ["guessed/path"], findingSourcePaths: [[]], findingGroundingCoverage: 0, sourceCoverage: 0}), false);
  assert.ok(workbenchSource.includes("if (judgeMode)")); assert.ok(workbenchSource.includes("addEventListener(\"popstate\""));
  const judgeLedgerSource = await readFile("src/components/EvidenceLedger.tsx", "utf8"); assert.ok(judgeLedgerSource.includes("if (!allowVerification) return"));
  const sanityContextSource = await readFile("src/agent/sanity-context.ts", "utf8"); assert.ok(sanityContextSource.includes('_id == "hyphaeAtlas.adjudication.g7-closure-portability"')); assert.ok(sanityContextSource.includes("humanReviewed == true")); assert.ok(sanityContextSource.includes("decisionDigest =="));
  const turnstileBindingPosition = routeSource.indexOf("TURNSTILE_RATE_LIMITER");
  const verificationPosition = routeSource.indexOf("const turnstile = await verifyTurnstile");
  const agentBindingPosition = routeSource.indexOf("AGENT_RATE_LIMITER");
  assert.ok(turnstileBindingPosition < verificationPosition);
  assert.ok(verificationPosition < agentBindingPosition);
  globalThis.fetch = turnstileFetch;
  if (savedCloudflare === undefined) delete process.env.CLOUDFLARE_DEPLOYMENT; else process.env.CLOUDFLARE_DEPLOYMENT = savedCloudflare;
  if (savedSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = savedSecret;
  if (savedAppUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = savedAppUrl;

  assert.equal(containsAffirmativeTerm("Hyphae is a drop-in replacement", "drop-in replacement"), true);
  assert.equal(containsAffirmativeTerm("Hyphae is not a drop-in replacement", "drop-in replacement"), false);
  assert.equal(containsAffirmativeTerm("Hyphae is not universally SQL-compatible. Hyphae is a drop-in replacement.", "drop-in replacement"), true);
  assert.equal(containsAffirmativeTerm("Explicit non-claims include universal SQL compatibility", "universal SQL compatibility"), false);
  assert.equal(containsAffirmativeTerm("A second call is rejected immediately instead of entering an unbounded queue.", "unbounded"), false);
  assert.deepEqual(findForbiddenAssertions(["Hyphae supports universal SQL compatibility", "HTTP v2", "minor 6"], ["universal SQL compatibility"]), ["universal SQL compatibility"]);

  const validReport = getReplay("en", "claim").result.report;
  assert.equal(atlasReportSchema.safeParse(validReport).success, true);
  const ungrounded = structuredClone(validReport); ungrounded.findings[0].sourceUrls = [];
  assert.equal(atlasReportSchema.safeParse(ungrounded).success, false);
  const resolverSources: ResolverSourceDocument[] = [{_id: "hyphaeAtlas.source.b335630551682c19a781afeb", title: "README.md", sourcePath: "README.md", sourceUrl: "https://example.test/repo/blob/fcccee58a96987867381a5a5fca7cb12dc3bb632/README.md", sourceCommit: "fcccee58a96987867381a5a5fca7cb12dc3bb632", contentDigest: "a".repeat(64), license: "CC-BY-SA-4.0", lifecycleStatus: "published", authorityRank: 50}];
  const forged = structuredClone(validReport); forged.findings[0].sourceUrls = ["https://example.invalid/README.md"];
  const forgedResolution = resolveEvidenceDocuments(forged, "README.md — Dataset", resolverSources, []);
  assert.equal(forgedResolution.findingSourceIds[0].length, 0, "A forged URL containing a legitimate basename must not ground a finding");
  const ambiguous = structuredClone(validReport); ambiguous.findings[0].sourceUrls = ["README.md"];
  const ambiguousResolution = resolveEvidenceDocuments(ambiguous, "README.md — Dataset", resolverSources, []);
  assert.deepEqual(ambiguousResolution.findingSourceIds[0], ["hyphaeAtlas.source.b335630551682c19a781afeb"], "README.md must resolve only to the canonical root README source");
  const linked: ResolverLinkedDocument[] = [{_id: "hyphaeAtlas.adjudication.example", sources: [{_ref: resolverSources[0]._id}]}, {_id: "hyphaeAtlas.release.example", version: "3.0.0", sourceDocuments: [{_ref: resolverSources[0]._id}]}];
  const linkedCitation = structuredClone(validReport); linkedCitation.findings[0].sourceUrls = [linked[0]._id];
  assert.equal(resolveEvidenceDocuments(linkedCitation, "unrelated retrieved text", resolverSources, linked).findingSourceIds[0].length, 0, "An unobserved structured identity must not receive transitive grounding");
  assert.deepEqual(resolveEvidenceDocuments(linkedCitation, linked[0]._id, resolverSources, linked).findingSourceIds[0], [resolverSources[0]._id], "An exact observed structured identity may follow its trusted Sanity reference to terminal provenance");
  const genericVersion = structuredClone(validReport); genericVersion.findings[0].sourceUrls = ["3.0.0"];
  assert.equal(resolveEvidenceDocuments(genericVersion, "The target is 3.0.0", resolverSources, linked).findingSourceIds[0].length, 0, "A generic scalar version must never become a structured provenance identity");
  const lexicalSource: PinnedSource = {path: "README.md", kind: "overview", format: "markdown", license: "CC-BY-SA-4.0", authorityDomains: ["overview"], authorityRank: 50, lifecycleStatus: "published", versionScope: ["current"], title: "README.md", content: "# README", contentDigest: "a".repeat(64)};
  assert.deepEqual(exactSelectedSourcePaths("README.md", [lexicalSource]), ["README.md"]);
  for (const forgedKeywordCitation of ["https://example.invalid/README.md", "https://example.invalid/?file=README.md", "https://example.invalid/#README.md", "https://example.invalid/ README.md", "README.md https://example.invalid/"]) assert.deepEqual(exactSelectedSourcePaths(forgedKeywordCitation, [lexicalSource]), [], `Keyword resolution must reject forged citation: ${forgedKeywordCitation}`);
  assert.ok(systemPrompt("test").includes("Snapshot isolation must never be called serializable"));
  for (const leakedConclusion of ["Snapshot isolation must never be called serializable", "G7 is open or portable", "PostgreSQL compatible"]) assert.equal(evaluationSystemPrompt.includes(leakedConclusion), false, `Evaluation synthesis prompt leaked benchmark conclusion: ${leakedConclusion}`);
  const reviewedDecision = assertReviewedAdjudication(reviewedAdjudicationSchema.parse(reviewedDecisionJson));
  assert.throws(() => assertReviewedAdjudication({...reviewedDecision, title: `${reviewedDecision.title} changed`}), /canonical decision digest mismatch/);

  for (const locale of ["en", "es"] as const) for (const mode of ["migration", "capability", "claim"] as const) {
    const replay = getReplay(locale, mode).result;
    assert.equal(replay.evidence.findingCoverage, 1);
    const expectedConflictCoverage = replay.report.conflicts.length ? replay.evidence.conflictSourceIds.filter((ids) => ids.length > 0).length / replay.report.conflicts.length : 1;
    assert.equal(replay.evidence.conflictCoverage, expectedConflictCoverage);
    assert.equal(replay.report.findings.every((_, index) => replay.evidence.findingSourceIds[index]?.length > 0), true);
    assert.equal(replay.retrieval.toolsUsed.includes("initial_context"), true);
    assert.equal(replay.retrieval.toolsUsed.includes("knowledge_base_read"), true);
  }

  const example = await readFile(".env.example", "utf8");
  for (const keyName of ["XAI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "MODEL_API_KEY", "TURNSTILE_SECRET_KEY", "SANITY_WRITE_TOKEN", "SANITY_DEPLOY_TOKEN", "SANITY_READ_TOKEN", "SANITY_CONTEXT_TOKEN"]) {
    const line = example.split("\n").find((item) => item.startsWith(`${keyName}=`));
    assert.equal(line, `${keyName}=`, `${keyName} must be empty in .env.example`);
  }
  console.log(JSON.stringify({ok: true, checks: ["streaming-body-limit", "body-timeout", "json-body", "rate-limit", "concurrency-release", "global-deadline", "context-outline-parse", "context-https", "context-timeout", "context-partial-timeout", "turnstile-siteverify", "turnstile-negative-branches", "turnstile-lifecycle", "judge-enum-history-no-post", "adjudication-query-closed", "turnstile-quota-order", "cloudflare-client-identity", "same-origin", "claim-polarity", "applicability-polarity", "finding-grounding-schema", "forged-citation-rejection", "canonical-readme-resolution", "observed-structured-edges", "neutral-ablation-prompt", "canonical-adjudication-digest", "six-grounded-replays", "empty-secret-template"]}, null, 2));
}

main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : "Unknown security smoke error"); process.exitCode = 1;});
