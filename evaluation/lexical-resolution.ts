import type {AtlasReport} from "../src/agent/report-schema";
import type {PinnedSource} from "../scripts/lib/pinned-corpus";

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9./_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function exactSelectedSourcePaths(value: string, selected: PinnedSource[]): string[] {
  const candidate = normalize(value);
  if (!candidate) return [];
  return selected.filter((source) => [source.path, source.title].some((identity) => {
    const exact = normalize(identity);
    return candidate === exact;
  })).map((source) => source.path);
}

export function resolveKeywordEvidence(report: AtlasReport, selected: PinnedSource[]) {
  const resolved = new Set<string>();
  const findingSourcePaths = report.findings.map((finding) => [...new Set(finding.sourceUrls.flatMap((citation) => exactSelectedSourcePaths(citation, selected)))].sort());
  for (const source of report.sources) for (const identity of [source.title, source.url, source.path]) for (const sourcePath of exactSelectedSourcePaths(identity, selected)) resolved.add(sourcePath);
  for (const paths of findingSourcePaths) for (const sourcePath of paths) resolved.add(sourcePath);
  return {
    resolvedSourcePaths: [...resolved].sort(),
    findingSourcePaths,
    findingGroundingCoverage: report.findings.length ? findingSourcePaths.filter((paths) => paths.length > 0).length / report.findings.length : 0,
  };
}
