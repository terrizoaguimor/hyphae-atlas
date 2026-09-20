import {z} from "zod";
import {atlasQuerySchema, type AgentResult, type AtlasQuery, type AtlasReport} from "../src/agent/report-schema";
import {findForbiddenAssertions} from "./polarity";

export const evaluationCaseSchema = atlasQuerySchema.extend({
  id: z.string().min(1),
  expectedVerdicts: z.array(z.enum(["supported", "unsupported", "conditional", "unknown", "unproven"])).min(1),
  requiredSourcePaths: z.array(z.string()).min(1),
  requiredTerms: z.array(z.string()),
  forbiddenTerms: z.array(z.string()),
});
export const evaluationCasesSchema = z.array(evaluationCaseSchema).length(12);
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;

export function evaluationQuery(item: EvaluationCase): AtlasQuery {
  return atlasQuerySchema.parse({
    mode: item.mode,
    question: item.question,
    ...(item.currentVersion !== undefined ? {currentVersion: item.currentVersion} : {}),
    ...(item.targetVersion !== undefined ? {targetVersion: item.targetVersion} : {}),
    ...(item.surface !== undefined ? {surface: item.surface} : {}),
    ...(item.protocolMinor !== undefined ? {protocolMinor: item.protocolMinor} : {}),
    ...(item.locale !== undefined ? {locale: item.locale} : {}),
  });
}

export type ScoringInput = {
  report: AtlasReport;
  resolvedSourcePaths: string[];
  findingGroundingCoverage: number;
  retrievalMode: string;
  toolsUsed: string[];
};
export type EvaluationScore = {
  passed: boolean;
  verdict: string;
  expectedVerdicts: string[];
  missingSources: string[];
  sourceCoverage: number;
  missingTerms: string[];
  termCoverage: number;
  forbiddenAssertions: string[];
  findingGroundingCoverage: number;
  retrievalMode: string;
  toolsUsed: string[];
  contextToolPass: boolean;
};

export function scoreEvaluationCase(item: EvaluationCase, input: ScoringInput): EvaluationScore {
  const corpus = JSON.stringify(input.report).toLowerCase();
  const resolvedPaths = new Set(input.resolvedSourcePaths);
  const missingSources = item.requiredSourcePaths.filter((requiredPath) => !resolvedPaths.has(requiredPath));
  const missingTerms = item.requiredTerms.filter((termGroup) => !termGroup.split("|").some((term) => corpus.includes(term.trim().toLowerCase())));
  const assertiveFields = [input.report.summary, input.report.applicability.version ?? "", input.report.applicability.surface ?? "", input.report.applicability.protocolMinor ?? "", ...input.report.findings.filter((finding) => finding.status === "confirmed" || finding.status === "conditional").flatMap((finding) => [finding.statement, ...finding.qualifiers]), ...input.report.conflicts.flatMap((conflict) => [conflict.description, conflict.resolution]), ...input.report.recommendedActions, ...input.report.limitations];
  const forbiddenAssertions = findForbiddenAssertions(assertiveFields, item.forbiddenTerms);
  const sourceCoverage = (item.requiredSourcePaths.length - missingSources.length) / item.requiredSourcePaths.length;
  const termCoverage = item.requiredTerms.length ? (item.requiredTerms.length - missingTerms.length) / item.requiredTerms.length : 1;
  const verdictPass = item.expectedVerdicts.includes(input.report.verdict);
  const contextToolPass = input.retrievalMode !== "sanity-context-mcp" || ["initial_context", "knowledge_base_read"].every((tool) => input.toolsUsed.includes(tool));
  const passed = verdictPass && sourceCoverage === 1 && termCoverage === 1 && forbiddenAssertions.length === 0 && input.findingGroundingCoverage === 1 && contextToolPass;
  return {passed, verdict: input.report.verdict, expectedVerdicts: item.expectedVerdicts, missingSources, sourceCoverage, missingTerms, termCoverage, forbiddenAssertions, findingGroundingCoverage: input.findingGroundingCoverage, retrievalMode: input.retrievalMode, toolsUsed: input.toolsUsed, contextToolPass};
}

export function scoreAgentResult(item: EvaluationCase, result: AgentResult): EvaluationScore {
  return scoreEvaluationCase(item, {report: result.report, resolvedSourcePaths: result.evidence.sources.map((source) => source.path), findingGroundingCoverage: result.evidence.findingCoverage, retrievalMode: result.retrieval.mode, toolsUsed: result.retrieval.toolsUsed});
}
