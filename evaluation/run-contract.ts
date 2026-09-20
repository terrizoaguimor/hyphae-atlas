import {readFile} from "node:fs/promises";
import path from "node:path";
import {sha256} from "../scripts/lib/pinned-corpus";
import {evaluationOutputContract, evaluationSystemPrompt} from "./ablation-prompt";

const groups = {
  parser: ["evaluation/ablation-contract.ts"],
  scorer: ["evaluation/scoring.ts", "evaluation/polarity.ts"],
  resolver: ["src/agent/evidence-resolver.ts"],
  retrieval: ["evaluation/ablation.ts", "evaluation/context-snapshot.ts", "evaluation/lexical-resolution.ts", "evaluation/run-contract.ts", "scripts/lib/pinned-corpus.ts"],
  provider: ["src/agent/providers/index.ts", "src/agent/providers/openai-compatible.ts", "src/agent/providers/types.ts", "src/agent/providers/http.ts"],
} as const;

async function digestFiles(files: readonly string[]): Promise<string> {
  const contents = await Promise.all([...files].sort().map(async (file) => `${file}\0${await readFile(path.resolve(process.cwd(), file), "utf8")}`));
  return sha256(contents.join("\0"));
}

export async function buildAblationRunContract(model: string) {
  const [parserDigest, scorerDigest, resolverDigest, retrievalDigest, providerDigest, casesRaw, manifestRaw] = await Promise.all([
    digestFiles(groups.parser),
    digestFiles(groups.scorer),
    digestFiles(groups.resolver),
    digestFiles(groups.retrieval),
    digestFiles(groups.provider),
    readFile(path.resolve(process.cwd(), "evaluation/cases.json"), "utf8"),
    readFile(path.resolve(process.cwd(), "corpus/manifest.json"), "utf8"),
  ]);
  const casesDigest = sha256(casesRaw);
  const manifestDigest = sha256(manifestRaw);
  const promptDigest = sha256(evaluationSystemPrompt);
  const outputSchemaDigest = sha256(evaluationOutputContract);
  const harnessDigest = sha256(JSON.stringify({parserDigest, scorerDigest, resolverDigest, retrievalDigest, providerDigest, casesDigest, manifestDigest, promptDigest, outputSchemaDigest}));
  return {
    model,
    promptDigest,
    outputSchemaDigest,
    parserDigest,
    scorerDigest,
    resolverDigest,
    retrievalDigest,
    providerDigest,
    casesDigest,
    manifestDigest,
    harnessDigest,
    temperature: 0 as const,
    maxTokens: 4_000 as const,
    answerCallsPerCase: 1 as const,
    selectorCallsPerContextCase: 1 as const,
    retryPolicy: "none" as const,
  };
}
