import {z} from "zod";
import {queryModeSchema} from "../src/agent/report-schema";

export const ablationArmSchema = z.enum(["context", "keyword", "none"]);
export type AblationArm = z.infer<typeof ablationArmSchema>;
export function isStructuredContextRetrieval(retrievalMode: string, toolsUsed: string[]): boolean {return retrievalMode === "sanity-context-mcp" && ["initial_context", "knowledge_base_read"].every((tool) => toolsUsed.includes(tool));}
export function hasZeroCreditedGrounding(result: {suppliedContextBytes: number; selectedSourcePaths: string[]; selectedRetrievalEntries?: string[]; resolvedSourcePaths: string[]; findingSourcePaths: string[][]; findingGroundingCoverage: number; sourceCoverage: number}): boolean {return result.suppliedContextBytes === 0 && result.selectedSourcePaths.length === 0 && (result.selectedRetrievalEntries?.length ?? 0) === 0 && result.resolvedSourcePaths.length === 0 && result.findingSourcePaths.every((paths) => paths.length === 0) && result.findingGroundingCoverage === 0 && result.sourceCoverage === 0;}
export const ablationScopeSchema = z.enum(["full", "smoke", "single"]);
const nullableText = (max: number) => z.union([z.string().max(max), z.number()]).nullable().transform((value) => value === null ? null : String(value));
const citationText = (max: number) => z.string().max(max).nullable().transform((value) => value ?? "");
const stringList = (maxItems: number, maxLength: number) => z.preprocess(
  (value) => typeof value === "string" ? [value] : value === null || value === undefined ? [] : value,
  z.array(z.string().max(maxLength)).max(maxItems),
);
export const evaluationReportSchema = z.object({
  mode: queryModeSchema,
  verdict: z.enum(["supported", "unsupported", "conditional", "unknown", "unproven"]),
  summary: z.string().min(1).max(4_000),
  applicability: z.object({version: nullableText(300), surface: nullableText(300), protocolMinor: nullableText(150)}).strict(),
  findings: z.array(z.object({statement: z.string().min(1).max(2_000), status: z.enum(["confirmed", "conditional", "rejected", "unknown"]), qualifiers: stringList(12, 1_000), sourceUrls: z.preprocess((value) => typeof value === "string" ? [value] : value === null || value === undefined ? [] : value, z.array(citationText(2_000)).max(12))}).strict()).max(16),
  conflicts: z.array(z.object({description: z.string().min(1).max(2_000), resolution: z.string().min(1).max(2_000), sourceUrls: z.preprocess((value) => typeof value === "string" ? [value] : value === null || value === undefined ? [] : value, z.array(citationText(2_000)).max(12))}).strict()).max(10),
  recommendedActions: stringList(12, 1_000), limitations: stringList(12, 1_000),
  sources: z.array(z.object({title: z.string().min(1).max(300), url: citationText(2_000), path: citationText(500), commit: citationText(100).optional()}).strict()).max(24),
}).strict();
const metricsSchema = z.object({
  total: z.number().int().positive(), passed: z.number().int().nonnegative(), passRate: z.number().min(0).max(1), verdictAccuracy: z.number().min(0).max(1), sourceCoverage: z.number().min(0).max(1), termCoverage: z.number().min(0).max(1), findingGrounding: z.number().min(0).max(1), forbiddenAssertionCount: z.number().int().nonnegative(), contextToolCompliance: z.number().min(0).max(1).nullable(), averageDurationMs: z.number().int().nonnegative(),
}).strict();
const observationSchema = z.object({report: evaluationReportSchema, resolvedSourcePaths: z.array(z.string()), findingSourcePaths: z.array(z.array(z.string())), findingGroundingCoverage: z.number().min(0).max(1), retrievalMode: z.string().min(1), toolsUsed: z.array(z.string())}).strict();
const resultSchema = z.object({
  id: z.string().min(1), passed: z.boolean(), verdict: z.string().min(1), expectedVerdicts: z.array(z.string()), missingSources: z.array(z.string()), sourceCoverage: z.number().min(0).max(1), missingTerms: z.array(z.string()), termCoverage: z.number().min(0).max(1), forbiddenAssertions: z.array(z.string()), findingGroundingCoverage: z.number().min(0).max(1), retrievalMode: z.string().min(1), toolsUsed: z.array(z.string()), contextToolPass: z.boolean(), durationMs: z.number().int().nonnegative(), selectedRetrievalEntries: z.array(z.string()), selectedSourcePaths: z.array(z.string()), suppliedContextBytes: z.number().int().nonnegative(), suppliedContextDigest: z.string().regex(/^[a-f0-9]{64}$/), resolvedSourcePaths: z.array(z.string()), findingSourcePaths: z.array(z.array(z.string())), model: z.string().min(1), promptDigest: z.string().regex(/^[a-f0-9]{64}$/), outputSchemaDigest: z.string().regex(/^[a-f0-9]{64}$/), maxTokens: z.literal(4_000), answerCalls: z.literal(1), selectorCalls: z.number().int().min(0).max(1), observation: observationSchema.optional(), error: z.string().optional(),
}).strict().superRefine((result, context) => {if (Boolean(result.error) === Boolean(result.observation)) context.addIssue({code: "custom", message: "Exactly one of error or observation is required"});});
const armResultSchema = z.object({
  id: ablationArmSchema,
  label: z.object({en: z.string().min(1), es: z.string().min(1)}).strict(),
  description: z.object({en: z.string().min(1), es: z.string().min(1)}).strict(),
  resolutionMode: z.enum(["structured-provenance", "exact-selected-source", "none"]),
  status: z.enum(["pending", "complete", "reviewed"]),
  metrics: metricsSchema.nullable(),
  results: z.array(resultSchema).min(1).optional(),
}).strict();
const contextSnapshotSchema = z.object({version: z.literal(1), corpusCommit: z.string().regex(/^[a-f0-9]{40}$/), corpusSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/), sanityProjectId: z.string().min(1), sanityDataset: z.string().min(1), atlasDocumentCount: z.literal(34), sourceDocumentCount: z.literal(20), knowledgeBaseId: z.string().regex(/^kb[A-Za-z0-9_-]+$/), markerPath: z.string().min(1), markerContentDigest: z.string().regex(/^[a-f0-9]{64}$/), reviewedAt: z.string().datetime(), reviewer: z.string().min(1)}).strict();
const runContractSchema = z.object({
  model: z.string().min(1),
  promptDigest: z.string().regex(/^[a-f0-9]{64}$/),
  outputSchemaDigest: z.string().regex(/^[a-f0-9]{64}$/),
  parserDigest: z.string().regex(/^[a-f0-9]{64}$/),
  scorerDigest: z.string().regex(/^[a-f0-9]{64}$/),
  resolverDigest: z.string().regex(/^[a-f0-9]{64}$/),
  retrievalDigest: z.string().regex(/^[a-f0-9]{64}$/),
  providerDigest: z.string().regex(/^[a-f0-9]{64}$/),
  casesDigest: z.string().regex(/^[a-f0-9]{64}$/),
  manifestDigest: z.string().regex(/^[a-f0-9]{64}$/),
  harnessDigest: z.string().regex(/^[a-f0-9]{64}$/),
  temperature: z.literal(0),
  maxTokens: z.literal(4_000),
  answerCallsPerCase: z.literal(1),
  selectorCallsPerContextCase: z.literal(1),
  retryPolicy: z.literal("none"),
}).strict();
const reviewSchema = z.object({reviewer: z.string().min(1), approvedAt: z.string().datetime(), candidateDigest: z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const ablationArtifactSchema = z.object({
  version: z.literal(3), status: z.enum(["pending", "complete", "reviewed"]), scope: ablationScopeSchema, publishable: z.boolean(), generatedAt: z.string().datetime().nullable(), corpusCommit: z.string().regex(/^[a-f0-9]{40}$/), sourceDocumentCount: z.literal(20), caseCount: z.literal(12), selectedCaseCount: z.number().int().min(1).max(12), scoring: z.literal("evaluation/scoring.ts@2"), contextSnapshot: contextSnapshotSchema.nullable(), runContract: runContractSchema.nullable(), review: reviewSchema.nullable(), note: z.object({en: z.string().min(1), es: z.string().min(1)}).strict(), arms: z.array(armResultSchema).min(1).max(3),
}).strict();
export type AblationArtifact = z.infer<typeof ablationArtifactSchema>;
export type CompleteAblationResult = z.infer<typeof resultSchema>;

export function isReviewedPublicAblation(artifact: AblationArtifact): boolean {
  return artifact.status === "reviewed" && artifact.scope === "full" && artifact.publishable && artifact.selectedCaseCount === 12 && artifact.review !== null && artifact.runContract !== null && artifact.contextSnapshot !== null && artifact.arms.map((arm) => arm.id).join(",") === "context,keyword,none" && artifact.arms.every((arm) => arm.status === "reviewed" && arm.metrics !== null && arm.results === undefined);
}
