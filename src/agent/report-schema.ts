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
});
export type AtlasQuery = z.infer<typeof atlasQuerySchema>;

const sourceSchema = z.object({
  title: z.string().min(1).max(300),
  url: z.string().min(1).max(2_000),
  path: z.string().min(1).max(500),
  commit: z.string().max(100).nullable().optional(),
});

const findingSchema = z.object({
  statement: z.string().min(1).max(2_000),
  status: z.enum(["confirmed", "conditional", "rejected", "unknown"]),
  qualifiers: z.array(z.string().max(1_000)).max(12),
  sourceUrls: z.array(z.string().min(1).max(2_000)).min(1).max(12),
});

const conflictSchema = z.object({
  description: z.string().min(1).max(2_000),
  resolution: z.string().min(1).max(2_000),
  sourceUrls: z.array(z.string().min(1).max(2_000)).min(1).max(12),
});

export const atlasReportSchema = z.object({
  mode: queryModeSchema,
  verdict: z.enum(["supported", "unsupported", "conditional", "unknown", "unproven"]),
  summary: z.string().min(1).max(4_000),
  applicability: z.object({
    version: z.string().max(300).nullable(),
    surface: z.string().max(300).nullable(),
    protocolMinor: z.string().max(150).nullable(),
  }),
  findings: z.array(findingSchema).min(1).max(16),
  conflicts: z.array(conflictSchema).max(10),
  recommendedActions: z.array(z.string().max(1_000)).max(12),
  limitations: z.array(z.string().max(1_000)).max(12),
  sources: z.array(sourceSchema).min(1).max(24),
});
export type AtlasReport = z.infer<typeof atlasReportSchema>;

export type ResolvedEvidenceSource = {
  id: string;
  title: string;
  path: string;
  url: string;
  commit: string;
  digest: string;
  license: string;
  lifecycleStatus: string;
  authorityRank: number;
  matchedBy: string[];
  supportsFindings: number[];
};

export type AgentTraceStep = {
  id: "orient" | "read" | "resolve" | "validate";
  kind: "tool" | "resolver" | "validation";
  name: string;
  status: "complete";
  detail: string;
  entries?: string[];
};

export type RetrievalMode = "sanity-context-mcp" | "sanity-dataset-preview";
export type AgentResult = {
  report: AtlasReport;
  retrieval: {
    mode: RetrievalMode;
    toolsUsed: string[];
    model: string;
    durationMs: number;
    warning?: string;
  };
  evidence: {
    sources: ResolvedEvidenceSource[];
    coverage: number;
    findingSourceIds: string[][];
    findingCoverage: number;
    conflictSourceIds: string[][];
  };
  trace: AgentTraceStep[];
  capturedAt: string;
};
