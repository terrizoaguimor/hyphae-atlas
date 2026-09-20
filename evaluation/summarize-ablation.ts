import {readFile} from "node:fs/promises";
import path from "node:path";
import {ablationArtifactSchema} from "./ablation-contract";

const requested = process.argv.find((argument) => argument.startsWith("--file="))?.slice(7);
if (!requested) throw new Error("Usage: tsx evaluation/summarize-ablation.ts --file=<candidate-or-summary>");
const artifact = ablationArtifactSchema.parse(JSON.parse(await readFile(path.resolve(process.cwd(), requested), "utf8")));
console.log(JSON.stringify({
  status: artifact.status,
  scope: artifact.scope,
  generatedAt: artifact.generatedAt,
  harnessDigest: artifact.runContract?.harnessDigest ?? null,
  arms: artifact.arms.map((arm) => ({
    id: arm.id,
    resolutionMode: arm.resolutionMode,
    metrics: arm.metrics,
    failures: arm.results?.filter((result) => !result.passed).map((result) => ({
      id: result.id,
      verdict: result.verdict,
      missingSources: result.missingSources,
      missingTerms: result.missingTerms,
      forbiddenAssertions: result.forbiddenAssertions,
      findingGroundingCoverage: result.findingGroundingCoverage,
      error: result.error ?? null,
    })) ?? [],
  })),
}, null, 2));
