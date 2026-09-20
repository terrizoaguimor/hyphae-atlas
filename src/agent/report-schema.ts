import {z} from "zod";

export const queryModeSchema = z.enum(["migration", "capability", "claim"]);
export type QueryMode = z.infer<typeof queryModeSchema>;

export const atlasQuerySchema = z.object({
  mode: queryModeSchema,
  question: z.string().trim().min(10).max(2_000),
  currentVersion: z.string().trim().max(80).optional(),
  targetVersion: z.string().trim().max(80).optional(),
  surface: z.string().trim().max(120).optional(),
  protocolMinor: z.coerce.number().int().min(0).max(1_000).optional(),
  locale: z.enum(["en", "es"]).optional(),
}).strict();
export type AtlasQuery = z.infer<typeof atlasQuerySchema>;

const sourceSchema = z.object({title: z.string().min(1).max(300), url: z.string().min(1).max(2_000), path: z.string().min(1).max(500), commit: z.string().max(100).nullable().optional()}).strict();
const findingSchema = z.object({statement: z.string().min(1).max(2_000), status: z.enum(["confirmed", "conditional", "rejected", "unknown"]), qualifiers: z.array(z.string().max(1_000)).max(12), sourceUrls: z.array(z.string().min(1).max(2_000)).min(1).max(12)}).strict();
const conflictSchema = z.object({description: z.string().min(1).max(2_000), resolution: z.string().min(1).max(2_000), sourceUrls: z.array(z.string().min(1).max(2_000)).min(1).max(12)}).strict();
export const atlasReportSchema = z.object({
  mode: queryModeSchema,
  verdict: z.enum(["supported", "unsupported", "conditional", "unknown", "unproven"]),
  summary: z.string().min(1).max(4_000),
  applicability: z.object({version: z.string().max(300).nullable(), surface: z.string().max(300).nullable(), protocolMinor: z.string().max(150).nullable()}).strict(),
  findings: z.array(findingSchema).min(1).max(16),
  conflicts: z.array(conflictSchema).max(10),
  recommendedActions: z.array(z.string().max(1_000)).max(12),
  limitations: z.array(z.string().max(1_000)).max(12),
  sources: z.array(sourceSchema).min(1).max(24),
}).strict();
export type AtlasReport = z.infer<typeof atlasReportSchema>;

export const resolvedEvidenceSourceSchema = z.object({
  id: z.string().min(1), title: z.string().min(1), path: z.string().min(1), url: z.string().min(1), commit: z.string().min(1), digest: z.string().regex(/^[a-f0-9]{64}$/), license: z.string().min(1), lifecycleStatus: z.string().min(1), authorityRank: z.number(), matchedBy: z.array(z.string()), supportsFindings: z.array(z.number().int().nonnegative()),
}).strict();
export type ResolvedEvidenceSource = z.infer<typeof resolvedEvidenceSourceSchema>;

export const agentTraceStepSchema = z.object({
  id: z.enum(["orient", "read", "resolve", "validate"]), kind: z.enum(["tool", "resolver", "validation"]), name: z.string().min(1), status: z.literal("complete"), detail: z.string().min(1), entries: z.array(z.string()).optional(),
}).strict();
export type AgentTraceStep = z.infer<typeof agentTraceStepSchema>;
export const retrievalModeSchema = z.enum(["sanity-context-mcp", "sanity-dataset-preview"]);
export type RetrievalMode = z.infer<typeof retrievalModeSchema>;
export const agentResultSchema = z.object({
  report: atlasReportSchema,
  retrieval: z.object({mode: retrievalModeSchema, toolsUsed: z.array(z.string()), model: z.string().min(1), durationMs: z.number().int().nonnegative(), warning: z.string().optional()}).strict(),
  evidence: z.object({sources: z.array(resolvedEvidenceSourceSchema), coverage: z.number().min(0).max(1), findingSourceIds: z.array(z.array(z.string())), findingCoverage: z.number().min(0).max(1), conflictSourceIds: z.array(z.array(z.string())), conflictCoverage: z.number().min(0).max(1)}).strict(),
  trace: z.array(agentTraceStepSchema),
  capturedAt: z.string().datetime(),
}).strict();
export type AgentResult = z.infer<typeof agentResultSchema>;
