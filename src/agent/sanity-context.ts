import {getSanityClient} from "@/sanity/client";
import {resolveEvidence} from "./evidence-resolver";
import {runInlinePreviewAgent, runProviderAgnosticAgent} from "./provider-agent";
import {providerConfiguration} from "./providers";
import type {AgentResult, AgentTraceStep, AtlasQuery, AtlasReport, RetrievalMode} from "./report-schema";

const PREVIEW_CONTEXT_LIMIT = 48_000;
function contextConfigured(): boolean {return Boolean(process.env.SANITY_CONTEXT_MCP_URL && process.env.SANITY_CONTEXT_TOKEN);}
function compactContext(value: unknown): unknown {const serialized = JSON.stringify(value); return serialized.length <= PREVIEW_CONTEXT_LIMIT ? value : {warning: "Context cropped for preview mode", content: serialized.slice(0, PREVIEW_CONTEXT_LIMIT)};}

async function previewContext(query: AtlasQuery, signal?: AbortSignal): Promise<unknown> {
  const client = getSanityClient(); const typeByMode = {migration: "compatibilityRule", capability: "capability", claim: "productClaim"} as const;
  const records = await client.fetch<unknown[]>(`*[_type == $type]{...,"sources":sources[]->{title,sourcePath,sourceUrl,sourceCommit,lifecycleStatus,authorityRank,authorityDomains,versionScope},"source":source->{title,sourcePath,sourceUrl,sourceCommit,lifecycleStatus,authorityRank},"evidence":evidence[]->{name,artifactType,commit,environment,assertions,limitations,digest,"source":source->{title,sourcePath,sourceUrl,sourceCommit}},"introducedIn":introducedIn->{version,releaseDate,commit,status},"removedIn":removedIn->{version,releaseDate,commit,status}}`, {type: typeByMode[query.mode]}, {signal});
  const authority = await client.fetch<unknown[]>(`*[_type == "sourceDocument" && documentKind in ["claims-authority", "capability-matrix", "gate-status", "publication-receipt"]]{title,sourcePath,sourceUrl,sourceCommit,lifecycleStatus,authorityRank,authorityDomains,versionScope}`, {}, {signal});
  return compactContext({records, authority});
}

async function finalResult(report: AtlasReport, retrieval: AgentResult["retrieval"], mode: RetrievalMode, retrievedText: string, entries: string[], signal?: AbortSignal): Promise<AgentResult> {
  const resolution = await resolveEvidence(report, retrievedText, signal);
  if (mode === "sanity-context-mcp" && resolution.findingCoverage < 1) throw new Error(`Only ${Math.round(resolution.findingCoverage * 100)}% of findings resolved from citations observed in Knowledge Base output`);
  const trace: AgentTraceStep[] = mode === "sanity-context-mcp" ? [
    {id: "orient", kind: "tool", name: "initial_context", status: "complete", detail: "Backend-owned MCP call completed before model synthesis."},
    {id: "read", kind: "tool", name: "knowledge_base_read", status: "complete", detail: `Backend retrieved ${entries.length} validated Knowledge Base ${entries.length === 1 ? "entry" : "entries"}.`, entries},
    {id: "resolve", kind: "resolver", name: "evidence_resolver", status: "complete", detail: `Resolved upstream evidence for ${report.findings.length}/${report.findings.length} findings across ${resolution.sources.length} source documents.`},
    {id: "validate", kind: "validation", name: "schema_validation", status: "complete", detail: "Validated the JSON report schema and per-finding source resolution. This is not independent factual validation of the verdict."},
  ] : [
    {id: "read", kind: "tool", name: "sanity_dataset_preview", status: "complete", detail: "Read bounded structured records directly from the Sanity dataset."},
    {id: "resolve", kind: "resolver", name: "evidence_resolver", status: "complete", detail: `Resolved upstream evidence for ${report.findings.length}/${report.findings.length} findings.`},
    {id: "validate", kind: "validation", name: "schema_validation", status: "complete", detail: "Validated the JSON report schema and per-finding source resolution."},
  ];
  return {report, retrieval, evidence: {sources: resolution.sources, coverage: resolution.coverage, findingSourceIds: resolution.findingSourceIds, findingCoverage: resolution.findingCoverage, conflictSourceIds: resolution.conflictSourceIds}, trace, capturedAt: new Date().toISOString()};
}

export async function runAtlasAgent(query: AtlasQuery, signal?: AbortSignal): Promise<AgentResult> {
  const started = Date.now();
  if (contextConfigured()) {
    const run = await runProviderAgnosticAgent(query, signal);
    return finalResult(run.report, {mode: "sanity-context-mcp", toolsUsed: ["initial_context", "knowledge_base_read"], model: `${run.provider.name}/${run.provider.model}`, durationMs: Date.now() - started}, "sanity-context-mcp", run.retrievedText, run.selectedPaths, signal);
  }
  const context = await previewContext(query, signal); const run = await runInlinePreviewAgent(query, context, signal);
  return finalResult(run.report, {mode: "sanity-dataset-preview", toolsUsed: [], model: `${run.provider.name}/${run.provider.model}`, durationMs: Date.now() - started, warning: "Development preview: configure Sanity Context MCP before the challenge submission."}, "sanity-dataset-preview", "", [], signal);
}

export function agentConfiguration() {const provider = providerConfiguration(); return {modelConfigured: provider.configured, modelProvider: provider.name, model: provider.model, sanityDatasetConfigured: Boolean(process.env.SANITY_PROJECT_ID && process.env.SANITY_DATASET && process.env.SANITY_READ_TOKEN), contextConfigured: contextConfigured(), retrievalMode: contextConfigured() ? "sanity-context-mcp" : "sanity-dataset-preview"};}
