import {readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {ablationArtifactSchema, hasZeroCreditedGrounding, isReviewedPublicAblation, isStructuredContextRetrieval, type AblationArtifact, type CompleteAblationResult} from "./ablation-contract";
import {evaluationCasesSchema, scoreEvaluationCase, type EvaluationCase} from "./scoring";
import {buildAblationRunContract} from "./run-contract";

type CompleteArm = AblationArtifact["arms"][number] & {metrics: NonNullable<AblationArtifact["arms"][number]["metrics"]>; results: CompleteAblationResult[]};
function metricsFor(arm: CompleteArm): CompleteArm["metrics"] {const results = arm.results; const total = results.length; const passed = results.filter((result) => result.passed).length; return {total, passed, passRate: passed / total, verdictAccuracy: results.filter((result) => result.expectedVerdicts.includes(result.verdict)).length / total, sourceCoverage: results.reduce((sum, result) => sum + result.sourceCoverage, 0) / total, termCoverage: results.reduce((sum, result) => sum + result.termCoverage, 0) / total, findingGrounding: results.reduce((sum, result) => sum + result.findingGroundingCoverage, 0) / total, forbiddenAssertionCount: results.reduce((sum, result) => sum + result.forbiddenAssertions.length, 0), contextToolCompliance: arm.id === "context" ? results.filter((result) => result.contextToolPass).length / total : null, averageDurationMs: Math.round(results.reduce((sum, result) => sum + result.durationMs, 0) / total)};}
function equal(actual: unknown, expected: unknown): boolean {return JSON.stringify(actual) === JSON.stringify(expected);}
function sameMetrics(actual: CompleteArm["metrics"], expected: CompleteArm["metrics"]): boolean {return (Object.keys(expected) as Array<keyof typeof expected>).every((key) => expected[key] === null || actual[key] === null ? actual[key] === expected[key] : Math.abs(actual[key] - expected[key]) < 1e-12);}

export function verifyAblationArtifact(artifact: AblationArtifact, cases: EvaluationCase[], publicSummary = false): void {
  if (artifact.caseCount !== cases.length || artifact.sourceDocumentCount !== 20) throw new Error("Ablation corpus cardinality does not match the 12-case/20-source contract");
  const armIds = artifact.arms.map((arm) => arm.id); const allArmIds = armIds.join(",") === "context,keyword,none";
  const expectedSelection = artifact.scope === "full" ? cases.map((item) => item.id) : artifact.scope === "smoke" ? [...new Map(cases.map((item) => [item.mode, item])).values()].map((item) => item.id) : null;
  const expectedCount = artifact.scope === "full" ? 12 : artifact.scope === "smoke" ? 3 : 1;
  if (artifact.selectedCaseCount !== expectedCount) throw new Error(`${artifact.scope} artifacts require ${expectedCount} selected case(s)`);
  if (publicSummary && artifact.status !== "pending" && !isReviewedPublicAblation(artifact)) throw new Error("Public ablation metrics require a reviewed, full, three-arm promoted summary");
  if (artifact.status === "pending") {
    if (artifact.publishable || artifact.generatedAt !== null || artifact.contextSnapshot || artifact.runContract || artifact.review || artifact.arms.some((arm) => arm.status !== "pending" || arm.metrics !== null || arm.results)) throw new Error("Pending artifacts cannot contain generated or reviewed data");
    return;
  }
  if (!artifact.generatedAt || !artifact.runContract) throw new Error("Generated artifacts require timestamp and common run contract");
  if (artifact.status === "reviewed") {
    if (!isReviewedPublicAblation(artifact)) throw new Error("Reviewed artifacts must be full, publishable, receipt-bound public summaries without raw results");
    return;
  }
  if (artifact.publishable || artifact.review) throw new Error("Complete candidates must remain unreviewed and non-publishable");
  if (artifact.arms.some((arm) => arm.status !== "complete" || !arm.metrics || !arm.results)) throw new Error("Complete candidates require raw results and metrics for every selected arm");
  if (armIds.includes("context") && (!artifact.contextSnapshot || artifact.contextSnapshot.corpusCommit !== artifact.corpusCommit)) throw new Error("Context candidates require a matching reviewed corpus/Knowledge Base snapshot receipt");

  let commonIds: string[] | null = null;
  for (const arm of artifact.arms as CompleteArm[]) {
    const expectedResolutionMode = arm.id === "context" ? "structured-provenance" : arm.id === "keyword" ? "exact-selected-source" : "none";
    if (arm.resolutionMode !== expectedResolutionMode) throw new Error(`Arm ${arm.id} has an invalid resolution policy`);
    const ids = arm.results.map((result) => result.id); const unique = new Set(ids);
    if (ids.length !== artifact.selectedCaseCount || unique.size !== ids.length || ids.some((id) => !cases.some((item) => item.id === id))) throw new Error(`Arm ${arm.id} has invalid case membership`);
    if (expectedSelection && !equal(ids, expectedSelection)) throw new Error(`Arm ${arm.id} does not contain the canonical ${artifact.scope} case selection in order`);
    if (commonIds && !equal(ids, commonIds)) throw new Error("All selected arms must evaluate identical cases in identical order"); commonIds = ids;
    if (!sameMetrics(arm.metrics, metricsFor(arm))) throw new Error(`Arm ${arm.id} aggregate metrics do not match its case results`);
    for (const result of arm.results) {
      if (result.model !== artifact.runContract.model || result.promptDigest !== artifact.runContract.promptDigest || result.outputSchemaDigest !== artifact.runContract.outputSchemaDigest || result.maxTokens !== artifact.runContract.maxTokens || result.answerCalls !== artifact.runContract.answerCallsPerCase) throw new Error(`Arm ${arm.id}/${result.id} violates the common synthesis contract`);
      if (result.error) continue;
      if (!result.observation) throw new Error(`Arm ${arm.id}/${result.id} is missing raw scoring observations`);
      const item = cases.find((candidate) => candidate.id === result.id)!; const rescored = scoreEvaluationCase(item, result.observation);
      const derivedKeys = ["passed", "verdict", "expectedVerdicts", "missingSources", "sourceCoverage", "missingTerms", "termCoverage", "forbiddenAssertions", "findingGroundingCoverage", "retrievalMode", "toolsUsed", "contextToolPass"] as const;
      for (const key of derivedKeys) if (!equal(result[key], rescored[key])) throw new Error(`Arm ${arm.id}/${result.id} has non-recomputable score field: ${key}`);
      if (!equal(result.resolvedSourcePaths, result.observation.resolvedSourcePaths) || !equal(result.findingSourcePaths, result.observation.findingSourcePaths)) throw new Error(`Arm ${arm.id}/${result.id} resolution observations were altered`);
      if (arm.id === "context" && (!isStructuredContextRetrieval(result.retrievalMode, result.toolsUsed) || result.selectorCalls !== artifact.runContract.selectorCallsPerContextCase || !result.selectedRetrievalEntries.length || result.selectedSourcePaths.length)) throw new Error(`Structured Context invariant failed for ${result.id}`);
      if (arm.id === "keyword" && (result.retrievalMode !== "keyword" || result.selectorCalls !== 0 || !equal(result.selectedRetrievalEntries, result.selectedSourcePaths))) throw new Error(`Keyword retrieval invariant failed for ${result.id}`);
      if (arm.id === "none" && (result.retrievalMode !== "none" || result.selectorCalls !== 0 || !hasZeroCreditedGrounding(result))) throw new Error(`No-retrieval zero-grounding invariant failed for ${result.id}`);
    }
  }
  if (artifact.scope === "full" && (!allArmIds || artifact.arms.some((arm) => arm.results?.some((result) => result.error)))) throw new Error("A promotable full candidate requires all three arms and no execution errors");
}

export async function verifyCurrentRunContract(artifact: AblationArtifact): Promise<void> {
  if (artifact.status === "pending" || artifact.status === "reviewed" || !artifact.runContract) return;
  const expected = await buildAblationRunContract(artifact.runContract.model);
  if (!equal(artifact.runContract, expected)) throw new Error("Ablation candidate does not match the current frozen evaluator/provider revision");
}

async function main() {
  const requested = process.argv.find((argument) => argument.startsWith("--file="))?.slice(7); const artifactPath = path.resolve(process.cwd(), requested || "evaluation/ablation-summary.json");
  const [artifactRaw, casesRaw] = await Promise.all([readFile(artifactPath, "utf8"), readFile(path.resolve(process.cwd(), "evaluation/cases.json"), "utf8")]);
  const artifact = ablationArtifactSchema.parse(JSON.parse(artifactRaw)); const cases = evaluationCasesSchema.parse(JSON.parse(casesRaw));
  verifyAblationArtifact(artifact, cases, !requested);
  await verifyCurrentRunContract(artifact);
  console.log(JSON.stringify({valid: true, artifact: path.relative(process.cwd(), artifactPath), status: artifact.status, scope: artifact.scope, publishable: artifact.publishable, arms: artifact.arms.map((arm) => arm.id), selectedCases: artifact.selectedCaseCount, sourceDocuments: artifact.sourceDocumentCount}, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((error) => {console.error(error instanceof Error ? error.message : "Unknown ablation verification error"); process.exitCode = 1;});
