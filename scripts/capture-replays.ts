import "dotenv/config";

import {readFile, rename, writeFile} from "node:fs/promises";
import path from "node:path";
import {z} from "zod";
import {runAtlasAgent} from "../src/agent/sanity-context";
import {agentResultSchema, atlasQuerySchema, type AtlasQuery} from "../src/agent/report-schema";

const scenarios: Array<{key: string; label: string; query: AtlasQuery}> = [
  {key: "en.migration", label: "Native 2.x → 3.0 migration", query: {mode: "migration", locale: "en", question: "Can a Hyphae 2.x Native directory be opened with 3.0, when does it change, and is downgrade safety established?", currentVersion: "2.x Native", targetVersion: "3.0.0"}},
  {key: "en.capability", label: "Native MCP default authority", query: {mode: "capability", locale: "en", question: "Does the Hyphae Native MCP adapter allow mutation tools by default, and what bounds apply?", targetVersion: "3.0.0", surface: "Native MCP", protocolMinor: 2}},
  {key: "en.claim", label: "G7 latency claim", query: {mode: "claim", locale: "en", question: "Can G7 be cited as dedicated-hardware or portable latency certification for Hyphae 3.0.0?", targetVersion: "3.0.0"}},
  {key: "es.migration", label: "Migración Native 2.x → 3.0", query: {mode: "migration", locale: "es", question: "¿Se puede abrir un directorio Native de Hyphae 2.x con 3.0, cuándo cambia y está demostrada la seguridad de un downgrade?", currentVersion: "2.x Native", targetVersion: "3.0.0"}},
  {key: "es.capability", label: "Autoridad predeterminada de Native MCP", query: {mode: "capability", locale: "es", question: "¿El adaptador MCP Native de Hyphae permite herramientas de escritura por defecto y qué límites aplica?", targetVersion: "3.0.0", surface: "Native MCP", protocolMinor: 2}},
  {key: "es.claim", label: "Afirmación de latencia G7", query: {mode: "claim", locale: "es", question: "¿Podemos citar G7 como certificación de latencia portable o en hardware dedicado para Hyphae 3.0.0?", targetVersion: "3.0.0"}},
];

const replaySchema = z.object({label: z.string().min(1), query: atlasQuerySchema, result: agentResultSchema}).strict();
const replayDataSchema = z.object({version: z.literal(1), generatedAt: z.string().datetime(), replays: z.record(z.string(), replaySchema)}).strict();
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function selectedScenarios() {
  const argument = process.argv.find((item) => item.startsWith("--keys="))?.slice(7);
  if (!argument) return scenarios;
  const requested = new Set(argument.split(",").map((item) => item.trim()).filter(Boolean));
  const selected = scenarios.filter((scenario) => requested.has(scenario.key));
  const unknown = [...requested].filter((key) => !scenarios.some((scenario) => scenario.key === key));
  if (unknown.length) throw new Error(`Unknown replay keys: ${unknown.join(", ")}`);
  if (!selected.length) throw new Error("No replay keys selected");
  return selected;
}

async function main() {
  const outputPath = path.resolve(process.cwd(), "src/data/replays.json");
  const selected = selectedScenarios();
  const existing = replayDataSchema.parse(JSON.parse(await readFile(outputPath, "utf8")));
  const output = {...existing.replays};
  for (const scenario of selected) {
    process.stdout.write(`Capturing ${scenario.key}... `);
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await runAtlasAgent(scenario.query);
        output[scenario.key] = replaySchema.parse({label: scenario.label, query: scenario.query, result});
        console.log(`PASS (${result.report.verdict}, ${result.evidence.sources.length} upstream sources)`);
        lastError = undefined;
        break;
      } catch (error: unknown) {
        lastError = error;
        if (attempt < 2) {process.stdout.write("retrying... "); await sleep(15_000);}
      }
    }
    if (lastError) throw lastError;
  }
  const complete = replayDataSchema.parse({version: 1, generatedAt: new Date().toISOString(), replays: output});
  if (Object.keys(complete.replays).length !== scenarios.length) throw new Error(`Replay set must contain all ${scenarios.length} scenarios`);
  const temporary = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(complete, null, 2) + "\n", {mode: 0o600});
  await rename(temporary, outputPath);
  console.log(JSON.stringify({captured: selected.map((scenario) => scenario.key), preserved: scenarios.map((scenario) => scenario.key).filter((key) => !selected.some((scenario) => scenario.key === key)), outputPath}, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown replay capture error");
  process.exitCode = 1;
});
