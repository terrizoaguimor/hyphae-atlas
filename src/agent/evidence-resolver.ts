import {getSanityClient} from "@/sanity/client";
import type {AtlasReport, ResolvedEvidenceSource} from "./report-schema";

type SourceDocument = {_id: string; title: string; sourcePath: string; sourceUrl: string; sourceCommit: string; contentDigest: string; license: string; lifecycleStatus: string; authorityRank: number};
type Reference = {_ref?: string};
type LinkedDocument = {_id: string; title?: string; name?: string; statement?: string; version?: string; source?: Reference; publicationReceipt?: Reference; sources?: Reference[]; sourceDocuments?: Reference[]};

const ENTRY_SOURCE_PATHS: Array<[string, string[]]> = [
  ["access_control", ["contracts/native-access-control-v1.json"]], ["agent_memory", ["docs/product/agent-memory.md"]], ["architecture", ["README.md", "contracts/README.md"]],
  ["capabilities/claim", ["docs/product/claims.md"]], ["capabilities/matrix", ["docs/product/native-capabilities.md", "docs/native/local-product-v1.md"]], ["capabilities/product", ["docs/product/native-capabilities.md", "docs/native/local-product-v1.md"]],
  ["evidence/gate", ["docs/gates/native-gate-status.md", "config/native-gate-status.json"]], ["performance/g7", ["docs/gates/native-gate-status.md", "docs/performance/microsecond-first.md"]], ["evidence/performance", ["docs/performance/microsecond-first.md", "docs/gates/native-gate-status.md"]],
  ["evidence/release", ["CHANGELOG.md", "docs/release/receipts/3.0.0.md", "README.md"]], ["releases/", ["CHANGELOG.md", "docs/release/receipts/3.0.0.md", "README.md"]], ["licensing/policy", ["LICENSE-POLICY.md"]],
  ["mcp_protocol_and_adapter/adapter", ["mcp/README.md"]], ["mcp_protocol_and_adapter/tool", ["contracts/native-mcp-v2.json"]], ["protocol/mcp/adapter", ["mcp/README.md"]], ["protocol/mcp/contracts", ["contracts/native-mcp-v2.json"]], ["protocols/mcp", ["mcp/README.md", "contracts/native-mcp-v2.json", "contracts/README.md"]],
  ["protocol/http", ["contracts/openapi/hyphae-v2.yaml", "contracts/README.md"]], ["search", ["README.md", "docs/product/native-capabilities.md"]], ["sql", ["docs/native/sql-semantics-v1.md", "docs/product/claims.md"]],
  ["storage/format", ["docs/native/directory-format-v1.md"]], ["storage/migration", ["docs/native/directory-format-v1.md", "compatibility/README.md", "README.md", "CHANGELOG.md"]], ["transactions", ["docs/native/mvcc-commit-v1.md", "docs/product/claims.md"]],
];

function normalize(value: string): string {return value.toLowerCase().normalize("NFKD").replace(/[—–§›]/g, " ").replace(/[^a-z0-9./_-]+/g, " ").replace(/\s+/g, " ").trim();}
function linkedRefs(document: LinkedDocument): string[] {return [document.source?._ref, document.publicationReceipt?._ref, ...(document.sources ?? []).map((item) => item._ref), ...(document.sourceDocuments ?? []).map((item) => item._ref)].filter((value): value is string => Boolean(value));}

export async function resolveEvidence(report: AtlasReport, retrievedText = "", signal?: AbortSignal): Promise<{sources: ResolvedEvidenceSource[]; coverage: number; findingSourceIds: string[][]; findingCoverage: number; conflictSourceIds: string[][]}> {
  const client = getSanityClient();
  const [sourceDocuments, linkedDocuments] = await Promise.all([
    client.fetch<SourceDocument[]>(`*[_type == "sourceDocument" && _id in path("hyphaeAtlas.**")]{_id,title,sourcePath,sourceUrl,sourceCommit,contentDigest,license,lifecycleStatus,authorityRank}`, {}, {signal}),
    client.fetch<LinkedDocument[]>(`*[_type != "sourceDocument" && _id in path("hyphaeAtlas.**")]{_id,title,name,statement,version,source,publicationReceipt,sources,sourceDocuments}`, {}, {signal}),
  ]);
  const byId = new Map(sourceDocuments.map((source) => [source._id, source]));
  const byPath = new Map(sourceDocuments.map((source) => [source.sourcePath, source]));
  const sourceAliases = new Map<string, SourceDocument[]>();
  for (const source of sourceDocuments) for (const alias of [source.title, source.sourcePath, source.sourceUrl].map(normalize).filter((value) => value.length >= 5)) {
    const owners = sourceAliases.get(alias) ?? [];
    if (!owners.some((owner) => owner._id === source._id)) owners.push(source);
    sourceAliases.set(alias, owners);
  }
  const linkedAliases = linkedDocuments.map((document) => ({aliases: [document._id, document.title, document.name, document.statement, document.version].filter((value): value is string => Boolean(value)).map(normalize), refs: linkedRefs(document)}));
  const globalMatches = new Map<string, {source: SourceDocument; reasons: Set<string>; findingIndexes: Set<number>}>();

  const canonicalCitationCorpus = normalize(retrievedText);
  function candidateMatches(raw: string, entryPath?: string, requireObserved = false): Map<string, string> {
    const matches = new Map<string, string>();
    const candidate = normalize(raw);
    if (requireObserved && (!candidate || !canonicalCitationCorpus.includes(candidate))) return matches;
    for (const [alias, owners] of sourceAliases) {
      const canonicalMatch = candidate === alias || candidate.startsWith(`${alias} `) || candidate.endsWith(` ${alias}`);
      if (owners.length === 1 && canonicalMatch) matches.set(owners[0]._id, "canonical-citation");
    }
    for (const linked of linkedAliases) if (linked.aliases.some((alias) => alias.length >= 5 && (candidate === alias || candidate.startsWith(`${alias} `) || candidate.endsWith(` ${alias}`)))) for (const id of linked.refs) if (byId.has(id)) matches.set(id, "structured-reference");
    const normalizedPath = normalize(entryPath ?? "");
    if (!requireObserved) for (const [prefix, sourcePaths] of ENTRY_SOURCE_PATHS) if (normalizedPath.includes(prefix) || candidate.includes(prefix)) for (const sourcePath of sourcePaths) {const source = byPath.get(sourcePath); if (source) matches.set(source._id, "knowledge-base-entry");}
    return matches;
  }

  function merge(matches: Map<string, string>, findingIndex?: number) {
    for (const [id, reason] of matches) {
      const source = byId.get(id); if (!source) continue;
      const existing = globalMatches.get(id) ?? {source, reasons: new Set<string>(), findingIndexes: new Set<number>()};
      existing.reasons.add(reason); if (findingIndex !== undefined) existing.findingIndexes.add(findingIndex); globalMatches.set(id, existing);
    }
  }

  let matchedModelSources = 0;
  for (const modelSource of report.sources) {const matches = candidateMatches(`${modelSource.title} ${modelSource.url}`, modelSource.path); if (matches.size) matchedModelSources += 1; merge(matches);}
  const findingSourceIds = report.findings.map((finding, index) => {
    const ids = new Set<string>();
    for (const citation of finding.sourceUrls) {const matches = candidateMatches(citation, undefined, Boolean(retrievedText)); for (const id of matches.keys()) ids.add(id); merge(matches, index);}
    return [...ids];
  });
  const conflictSourceIds = report.conflicts.map((conflict) => {
    const ids = new Set<string>();
    for (const citation of conflict.sourceUrls) {const matches = candidateMatches(citation, undefined, Boolean(retrievedText)); for (const id of matches.keys()) ids.add(id); merge(matches);}
    return [...ids];
  });

  const sources = [...globalMatches.values()].sort((a, b) => b.source.authorityRank - a.source.authorityRank || a.source.sourcePath.localeCompare(b.source.sourcePath)).slice(0, 16).map(({source, reasons, findingIndexes}) => ({
    id: source._id, title: source.title, path: source.sourcePath, url: source.sourceUrl, commit: source.sourceCommit, digest: source.contentDigest, license: source.license, lifecycleStatus: source.lifecycleStatus, authorityRank: source.authorityRank, matchedBy: [...reasons].sort(), supportsFindings: [...findingIndexes].sort((a, b) => a - b),
  }));
  const findingCoverage = findingSourceIds.filter((ids) => ids.length > 0).length / report.findings.length;
  return {sources, coverage: report.sources.length ? matchedModelSources / report.sources.length : 0, findingSourceIds, findingCoverage, conflictSourceIds};
}
