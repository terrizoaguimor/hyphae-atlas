import "dotenv/config";

import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {z} from "zod";
import {callContextTool} from "../src/agent/context-client";
import {resolveEvidence} from "../src/agent/evidence-resolver";
import {getModelProvider} from "../src/agent/providers";
import type {AtlasReport} from "../src/agent/report-schema";
import {loadPinnedSources, readCorpusManifest, sha256, type PinnedSource} from "../scripts/lib/pinned-corpus";
import {ablationArtifactSchema, ablationArmSchema, evaluationReportSchema, hasZeroCreditedGrounding, type AblationArm} from "./ablation-contract";
import {evaluationSystemPrompt} from "./ablation-prompt";
import {resolveKeywordEvidence} from "./lexical-resolution";
import {preflightContextSnapshot, type ContextSnapshot} from "./context-snapshot";
import {buildAblationRunContract} from "./run-contract";
import {evaluationCasesSchema, evaluationQuery, scoreEvaluationCase, type EvaluationCase, type EvaluationScore} from "./scoring";

const DEFAULT_SOURCE_ROOT = path.resolve(process.cwd(), "../hyphae");
const TOP_K = 6;
const MAX_TOKENS = 4_000 as const;
const armCopy = {
  context: {label: {en: "Structured Context", es: "Context estructurado"}, description: {en: "Sanity Context retrieval with structured provenance resolution over a receipt-bound Knowledge Base snapshot.", es: "Recuperación de Sanity Context con resolución de procedencia estructurada sobre un snapshot verificado."}, resolutionMode: "structured-provenance" as const},
  keyword: {label: {en: "Keyword retrieval", es: "Recuperación léxica"}, description: {en: "Deterministic lexical ranking with exact citation matching over the same 20 commit-pinned source documents.", es: "Ranking léxico determinista con citas exactas sobre los mismos 20 documentos fijados por commit."}, resolutionMode: "exact-selected-source" as const},
  none: {label: {en: "No-evidence control", es: "Control sin evidencia"}, description: {en: "Pass-ineligible evidence-compliance control: zero supplied corpus and zero credited source or citation resolution.", es: "Control de cumplimiento no elegible para aprobar: sin corpus y sin crédito de fuentes o resolución de citas."}, resolutionMode: "none" as const},
} as const;
const stopWords = new Set("a an and are as at be by can does for from had has have how in into is it may of on or our that the this to under was what when where which with without y de del el en es la las los o para por que se sin un una".split(" "));

function parseJson(text: string): unknown {const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""); try {return JSON.parse(cleaned);} catch {const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}"); if (start < 0 || end <= start) throw new Error("Model output did not contain JSON"); return JSON.parse(cleaned.slice(start, end + 1));}}
function normalize(value: string): string {return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9./_-]+/g, " ").replace(/\s+/g, " ").trim();}
function tokens(value: string): string[] {return normalize(value).split(/[\s/_.-]+/).filter((token) => token.length > 1 && !stopWords.has(token));}
function occurrences(text: string, token: string): number {let count = 0; let offset = 0; while ((offset = text.indexOf(token, offset)) >= 0) {count += 1; offset += token.length;} return count;}
function lexicalRetrieve(query: EvaluationCase, sources: PinnedSource[]): PinnedSource[] {const queryTokens = [...new Set(tokens(JSON.stringify(evaluationQuery(query))))]; return sources.map((source) => {const heading = normalize(`${source.title} ${source.path} ${source.kind} ${source.authorityDomains.join(" ")}`); const body = normalize(source.content); const score = queryTokens.reduce((sum, token) => sum + Math.min(occurrences(body, token), 8) + occurrences(heading, token) * 6, 0); return {source, score};}).sort((a, b) => b.score - a.score || b.source.authorityRank - a.source.authorityRank || a.source.path.localeCompare(b.source.path, "en")).slice(0, TOP_K).map(({source}) => source);}
function contextFor(sources: PinnedSource[], commit: string): string {return sources.map((source) => `SOURCE_PATH: ${source.path}\nSOURCE_TITLE: ${source.title}\nSOURCE_COMMIT: ${commit}\nLIFECYCLE: ${source.lifecycleStatus}\nAUTHORITY_RANK: ${source.authorityRank}\nCONTENT:\n${source.content}`).join("\n\n---\n\n");}
function selectedCases(cases: EvaluationCase[]): EvaluationCase[] {const id = process.argv.find((argument) => argument.startsWith("--case="))?.slice(7); if (id) {const selected = cases.filter((item) => item.id === id); if (!selected.length) throw new Error(`Unknown evaluation case: ${id}`); return selected;} if (!process.argv.includes("--smoke")) return cases; const byMode = new Map<string, EvaluationCase>(); for (const item of cases) if (!byMode.has(item.mode)) byMode.set(item.mode, item); return [...byMode.values()];}
function selectedArms(): AblationArm[] {const value = process.argv.find((argument) => argument.startsWith("--arm="))?.slice(6); return value ? [ablationArmSchema.parse(value)] : ablationArmSchema.options;}
function persistedSnapshot(snapshot: ContextSnapshot) {return {version: snapshot.version, corpusCommit: snapshot.corpusCommit, corpusSnapshotDigest: snapshot.corpusSnapshotDigest, sanityProjectId: snapshot.sanityProjectId, sanityDataset: snapshot.sanityDataset, atlasDocumentCount: snapshot.atlasDocumentCount, sourceDocumentCount: snapshot.sourceDocumentCount, knowledgeBaseId: snapshot.knowledgeBaseId, markerPath: snapshot.markerPath, markerContentDigest: snapshot.markerContentDigest, reviewedAt: snapshot.reviewedAt, reviewer: snapshot.reviewer};}
function aggregate(arm: AblationArm, results: Array<EvaluationScore & {durationMs: number}>) {const total = results.length; return {total, passed: results.filter((result) => result.passed).length, passRate: results.filter((result) => result.passed).length / total, verdictAccuracy: results.filter((result) => result.expectedVerdicts.includes(result.verdict)).length / total, sourceCoverage: results.reduce((sum, result) => sum + result.sourceCoverage, 0) / total, termCoverage: results.reduce((sum, result) => sum + result.termCoverage, 0) / total, findingGrounding: results.reduce((sum, result) => sum + result.findingGroundingCoverage, 0) / total, forbiddenAssertionCount: results.reduce((sum, result) => sum + result.forbiddenAssertions.length, 0), contextToolCompliance: arm === "context" ? results.filter((result) => result.contextToolPass).length / total : null, averageDurationMs: Math.round(results.reduce((sum, result) => sum + result.durationMs, 0) / total)};}

async function selectContext(item: EvaluationCase, snapshot: ContextSnapshot, provider: ReturnType<typeof getModelProvider>) {
  const selectionSchema = z.object({paths: z.array(z.string()).min(1).max(8)}).passthrough();
  const text = await provider.generate({system: "Select 1-8 exact paths from AVAILABLE_PATHS that are most relevant to the question. Return JSON only: {\"paths\":[\"exact/path\"]}.", user: `${JSON.stringify(evaluationQuery(item))}\nAVAILABLE_PATHS:\n${snapshot.outlinePaths.join("\n")}`, maxTokens: 500});
  const paths = [...new Set(selectionSchema.parse(parseJson(text)).paths)]; const allowed = new Set(snapshot.outlinePaths);
  if (paths.some((entry) => !allowed.has(entry))) throw new Error("Context selector returned an unavailable path");
  const content = await callContextTool("knowledge_base_read", {knowledgeBase: snapshot.knowledgeBaseId, paths});
  return {paths, content};
}

async function main() {
  const manifest = await readCorpusManifest();
  const allCases = evaluationCasesSchema.parse(JSON.parse(await readFile(path.resolve(process.cwd(), "evaluation/cases.json"), "utf8")));
  const cases = selectedCases(allCases); const scope = process.argv.includes("--smoke") ? "smoke" : process.argv.some((argument) => argument.startsWith("--case=")) ? "single" : "full"; const arms = selectedArms();
  const allSources = arms.includes("keyword") ? loadPinnedSources(path.resolve(process.env.HYPHAE_SOURCE_PATH ?? DEFAULT_SOURCE_ROOT), manifest) : [];
  if (arms.includes("keyword") && allSources.length !== 20) throw new Error(`Expected 20 pinned source documents, received ${allSources.length}`);
  const receiptArgument = process.argv.find((argument) => argument.startsWith("--snapshot-receipt="))?.slice(19);
  const contextSnapshot = arms.includes("context") ? await preflightContextSnapshot(manifest, receiptArgument) : null;
  const provider = getModelProvider(); const model = `${provider.name}/${provider.model}`; const runContract = await buildAblationRunContract(model); const {promptDigest, outputSchemaDigest} = runContract;
  const armResults = [];
  for (const arm of arms) {
    const results = [];
    for (const item of cases) {
      process.stdout.write(`${arm}/${item.id}... `); const started = Date.now();
      try {
        let suppliedContext = ""; let selectedSourcePaths: string[] = []; let selectedRetrievalEntries: string[] = []; let selectorCalls = 0;
        if (arm === "keyword") {const selected = lexicalRetrieve(item, allSources); selectedSourcePaths = selected.map((source) => source.path); selectedRetrievalEntries = selectedSourcePaths; suppliedContext = contextFor(selected, manifest.commit);}
        if (arm === "context") {if (!contextSnapshot) throw new Error("Context snapshot preflight was not completed"); const selected = await selectContext(item, contextSnapshot, provider); selectedRetrievalEntries = selected.paths; suppliedContext = selected.content; selectorCalls = 1;}
        const user = `${JSON.stringify({task: "Produce an evidence report", ...evaluationQuery(item)})}\n\nEVIDENCE:\n${suppliedContext}`;
        const report = evaluationReportSchema.parse(parseJson(await provider.generate({system: evaluationSystemPrompt, user, maxTokens: MAX_TOKENS}))) as AtlasReport;
        let resolution: {resolvedSourcePaths: string[]; findingSourcePaths: string[][]; findingGroundingCoverage: number}; let retrievalMode: string; let toolsUsed: string[];
        if (arm === "context") {const evidence = await resolveEvidence(report, suppliedContext); const pathById = new Map(evidence.sources.map((source) => [source.id, source.path])); resolution = {resolvedSourcePaths: evidence.sources.map((source) => source.path), findingSourcePaths: evidence.findingSourceIds.map((ids) => ids.flatMap((id) => pathById.get(id) ? [pathById.get(id)!] : [])), findingGroundingCoverage: evidence.findingCoverage}; retrievalMode = "sanity-context-mcp"; toolsUsed = ["initial_context", "knowledge_base_read"];}
        else if (arm === "keyword") {resolution = resolveKeywordEvidence(report, allSources.filter((source) => selectedSourcePaths.includes(source.path))); retrievalMode = "keyword"; toolsUsed = [];}
        else {resolution = {resolvedSourcePaths: [], findingSourcePaths: report.findings.map(() => []), findingGroundingCoverage: 0}; retrievalMode = "none"; toolsUsed = [];}
        const observation = {report, ...resolution, retrievalMode, toolsUsed}; const score = scoreEvaluationCase(item, observation); const suppliedContextBytes = Buffer.byteLength(suppliedContext);
        const result = {...score, id: item.id, durationMs: Date.now() - started, selectedRetrievalEntries, selectedSourcePaths, suppliedContextBytes, suppliedContextDigest: sha256(suppliedContext), resolvedSourcePaths: resolution.resolvedSourcePaths, findingSourcePaths: resolution.findingSourcePaths, model, promptDigest, outputSchemaDigest, maxTokens: MAX_TOKENS, answerCalls: 1 as const, selectorCalls, observation};
        if (arm === "none" && !hasZeroCreditedGrounding(result)) throw new Error("No-retrieval arm violated its zero-grounding invariant");
        results.push(result); console.log("done");
      } catch (error) {
        console.log("error"); results.push({id: item.id, passed: false, verdict: "error", expectedVerdicts: item.expectedVerdicts, missingSources: item.requiredSourcePaths, sourceCoverage: 0, missingTerms: item.requiredTerms, termCoverage: 0, forbiddenAssertions: [], findingGroundingCoverage: 0, retrievalMode: "error", toolsUsed: [], contextToolPass: false, durationMs: Date.now() - started, selectedRetrievalEntries: [], selectedSourcePaths: [], suppliedContextBytes: 0, suppliedContextDigest: sha256(""), resolvedSourcePaths: [], findingSourcePaths: [], model, promptDigest, outputSchemaDigest, maxTokens: MAX_TOKENS, answerCalls: 1 as const, selectorCalls: 0, error: error instanceof Error ? error.message.slice(0, 500) : "Unknown ablation error"});
      }
    }
    armResults.push({id: arm, ...armCopy[arm], status: "complete" as const, metrics: aggregate(arm, results), results});
  }
  const generatedAt = new Date().toISOString();
  const artifact = ablationArtifactSchema.parse({version: 3, status: "complete", scope, publishable: false, generatedAt, corpusCommit: manifest.commit, sourceDocumentCount: 20, caseCount: 12, selectedCaseCount: cases.length, scoring: "evaluation/scoring.ts@2", contextSnapshot: contextSnapshot ? persistedSnapshot(contextSnapshot) : null, runContract, review: null, note: {en: "Unreviewed candidate. Verify and explicitly promote before displaying public metrics.", es: "Candidato sin revisar. Verifícalo y promuévelo explícitamente antes de mostrar métricas públicas."}, arms: armResults});
  const directory = path.resolve(process.cwd(), "evaluation/results/ablation"); await mkdir(directory, {recursive: true}); const timestamp = generatedAt.replace(/[:.]/g, "-"); const candidatePath = path.join(directory, `${timestamp}-${scope}.candidate.json`); await writeFile(candidatePath, JSON.stringify(artifact, null, 2) + "\n", {mode: 0o600});
  console.log(JSON.stringify({status: artifact.status, scope, publishable: false, candidate: path.relative(process.cwd(), candidatePath), corpusCommit: artifact.corpusCommit, arms: artifact.arms.map((arm) => ({id: arm.id, metrics: arm.metrics}))}, null, 2));
}

main().catch((error) => {console.error(error instanceof Error ? error.message : "Unknown ablation error"); process.exitCode = 1;});
