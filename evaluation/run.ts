import "dotenv/config";

import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {runAtlasAgent} from "../src/agent/sanity-context";
import {ModelProviderError} from "../src/agent/providers";
import {evaluationCasesSchema, evaluationQuery, scoreAgentResult, type EvaluationCase, type EvaluationScore} from "./scoring";

type CaseResult = EvaluationScore & {id: string; attempts: number; durationMs: number; error?: string};
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function selectedCases(cases: EvaluationCase[]): EvaluationCase[] {
  const caseArgument = process.argv.find((argument) => argument.startsWith("--case="));
  if (caseArgument) {const caseId = caseArgument.slice("--case=".length); const selected = cases.filter((item) => item.id === caseId); if (!selected.length) throw new Error(`Unknown evaluation case: ${caseId}`); return selected;}
  if (!process.argv.includes("--smoke")) return cases;
  const selected = new Map<string, EvaluationCase>(); for (const item of cases) if (!selected.has(item.mode)) selected.set(item.mode, item); return [...selected.values()];
}
function transient(error: unknown): boolean {return error instanceof ModelProviderError && error.status === 429 || error instanceof DOMException && error.name === "TimeoutError" || error instanceof Error && /timed out|rate limit/i.test(error.message);}

async function evaluate(item: EvaluationCase): Promise<CaseResult> {
  const started = Date.now(); let lastError: unknown;
  for (let attempts = 1; attempts <= 2; attempts++) {
    try {
      const result = await runAtlasAgent(evaluationQuery(item));
      return {id: item.id, attempts, durationMs: Date.now() - started, ...scoreAgentResult(item, result)};
    } catch (error: unknown) {
      lastError = error;
      if (attempts === 1 && transient(error)) {process.stdout.write("transient retry... "); await sleep(10_000); continue;}
      return {id: item.id, passed: false, attempts, verdict: "error", expectedVerdicts: item.expectedVerdicts, missingSources: item.requiredSourcePaths, sourceCoverage: 0, missingTerms: item.requiredTerms, termCoverage: 0, forbiddenAssertions: [], findingGroundingCoverage: 0, retrievalMode: "error", toolsUsed: [], contextToolPass: false, durationMs: Date.now() - started, error: error instanceof Error ? error.message.slice(0, 500) : "Unknown evaluation error"};
    }
  }
  throw lastError;
}

async function main() {
  const allCases = evaluationCasesSchema.parse(JSON.parse(await readFile(path.resolve(process.cwd(), "evaluation/cases.json"), "utf8"))); const cases = selectedCases(allCases); const results: CaseResult[] = [];
  for (const item of cases) {process.stdout.write(`Evaluating ${item.id}... `); const result = await evaluate(item); results.push(result); console.log(result.passed ? `PASS${result.attempts > 1 ? ` (${result.attempts} attempts)` : ""}` : "FAIL");}
  const scope = process.argv.includes("--smoke") ? "smoke" : process.argv.some((argument) => argument.startsWith("--case=")) ? "single" : "full";
  const summary = {
    generatedAt: new Date().toISOString(), scope, total: results.length, passed: results.filter((result) => result.passed).length, failed: results.filter((result) => !result.passed).length,
    totalAttempts: results.reduce((sum, result) => sum + result.attempts, 0), retryCount: results.reduce((sum, result) => sum + Math.max(0, result.attempts - 1), 0),
    verdictAccuracy: results.filter((result) => result.expectedVerdicts.includes(result.verdict)).length / results.length,
    averageSourceCoverage: results.reduce((sum, result) => sum + result.sourceCoverage, 0) / results.length,
    averageTermCoverage: results.reduce((sum, result) => sum + result.termCoverage, 0) / results.length,
    averageFindingGrounding: results.reduce((sum, result) => sum + result.findingGroundingCoverage, 0) / results.length,
    forbiddenAssertionCount: results.reduce((sum, result) => sum + result.forbiddenAssertions.length, 0), contextToolCompliance: results.filter((result) => result.contextToolPass).length / results.length,
    retrievalModes: [...new Set(results.map((result) => result.retrievalMode))], averageDurationMs: Math.round(results.reduce((sum, result) => sum + result.durationMs, 0) / results.length), results,
  };
  const outputDirectory = path.resolve(process.cwd(), "evaluation/results"); await mkdir(outputDirectory, {recursive: true}); const serialized = JSON.stringify(summary, null, 2) + "\n"; const timestamp = summary.generatedAt.replace(/[:.]/g, "-");
  await Promise.all([writeFile(path.join(outputDirectory, "latest.json"), serialized, {mode: 0o600}), writeFile(path.join(outputDirectory, `${timestamp}-${scope}.json`), serialized, {mode: 0o600})]);
  console.log(JSON.stringify({scope: summary.scope, total: summary.total, passed: summary.passed, failed: summary.failed, attempts: summary.totalAttempts, retries: summary.retryCount, verdictAccuracy: summary.verdictAccuracy, sourceCoverage: summary.averageSourceCoverage, termCoverage: summary.averageTermCoverage, findingGrounding: summary.averageFindingGrounding, forbiddenAssertions: summary.forbiddenAssertionCount, contextToolCompliance: summary.contextToolCompliance, averageDurationMs: summary.averageDurationMs}, null, 2));
  if (summary.failed) process.exitCode = 1;
}

main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : "Unknown evaluation error"); process.exitCode = 1;});
