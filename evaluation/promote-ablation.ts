import {createHash} from "node:crypto";
import {readFile, rename, writeFile} from "node:fs/promises";
import path from "node:path";
import {ablationArtifactSchema} from "./ablation-contract";
import {evaluationCasesSchema} from "./scoring";
import {verifyAblationArtifact, verifyCurrentRunContract} from "./verify-ablation";

async function atomicJson(target: string, value: unknown) {const temporary = `${target}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", {mode: 0o600}); await rename(temporary, target);}
async function main() {
  const requested = process.argv.find((argument) => argument.startsWith("--file="))?.slice(7); const reviewer = process.argv.find((argument) => argument.startsWith("--reviewer="))?.slice(11)?.trim();
  if (!requested || !reviewer) throw new Error("Promotion requires --file=<timestamped candidate> and --reviewer=<human reviewer>");
  const candidatePath = path.resolve(process.cwd(), requested); const candidateRoot = path.resolve(process.cwd(), "evaluation/results/ablation");
  if (!candidatePath.startsWith(`${candidateRoot}${path.sep}`) || !candidatePath.endsWith(".candidate.json")) throw new Error("Only timestamped candidates under evaluation/results/ablation may be promoted");
  const [raw, casesRaw] = await Promise.all([readFile(candidatePath, "utf8"), readFile(path.resolve(process.cwd(), "evaluation/cases.json"), "utf8")]);
  const candidate = ablationArtifactSchema.parse(JSON.parse(raw)); const cases = evaluationCasesSchema.parse(JSON.parse(casesRaw)); verifyAblationArtifact(candidate, cases); await verifyCurrentRunContract(candidate);
  if (candidate.status !== "complete" || candidate.scope !== "full" || candidate.arms.map((arm) => arm.id).join(",") !== "context,keyword,none" || !candidate.contextSnapshot) throw new Error("Only a complete receipt-bound full three-arm candidate may be promoted");
  const candidateDigest = createHash("sha256").update(raw).digest("hex"); const approvedAt = new Date().toISOString();
  const metrics = Object.fromEntries(candidate.arms.map((arm) => [arm.id, arm.metrics]));
  const context = metrics.context!; const keyword = metrics.keyword!; const none = metrics.none!;
  const accepted = (metric: typeof context) => Math.round(metric.verdictAccuracy * metric.total);
  const summary = ablationArtifactSchema.parse({...candidate, status: "reviewed", publishable: true, review: {reviewer, approvedAt, candidateDigest}, note: {en: `Reviewed frozen 12-case evidence-compliance ablation. Strict passes: Structured Context ${context.passed}/${context.total}, keyword ${keyword.passed}/${keyword.total}, no-evidence control ${none.passed}/${none.total}. Retrieval-arm accepted verdicts: Context ${accepted(context)}/${context.total}, keyword ${accepted(keyword)}/${keyword.total}; the pass-ineligible control matched ${accepted(none)}/${none.total}. Resolution policies differ and are labeled.`, es: `Ablación congelada de 12 casos revisada. Cumplimiento estricto: Context estructurado ${context.passed}/${context.total}, léxico ${keyword.passed}/${keyword.total}, control sin evidencia ${none.passed}/${none.total}. Veredictos aceptados: Context ${accepted(context)}/${context.total}, léxico ${accepted(keyword)}/${keyword.total}; el control no elegible acertó ${accepted(none)}/${none.total}. Las políticas de resolución son distintas y están identificadas.`}, arms: candidate.arms.map((arm) => ({...arm, status: "reviewed", results: undefined}))});
  const latest = path.join(candidateRoot, "latest.json"); const publicSummary = path.resolve(process.cwd(), "evaluation/ablation-summary.json");
  await atomicJson(latest, summary); await atomicJson(publicSummary, summary);
  console.log(JSON.stringify({promoted: path.relative(process.cwd(), candidatePath), candidateDigest, reviewer, approvedAt, outputs: [path.relative(process.cwd(), latest), path.relative(process.cwd(), publicSummary)], rawResultsPublished: false}, null, 2));
}
main().catch((error) => {console.error(error instanceof Error ? error.message : "Unknown ablation promotion error"); process.exitCode = 1;});
