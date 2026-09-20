import {z} from "zod";
import data from "./replays.json";
import type {Locale} from "@/agent/modes";
import {agentResultSchema, atlasQuerySchema, queryModeSchema, type QueryMode} from "@/agent/report-schema";

const replaySchema = z.object({label: z.string().min(1), query: atlasQuerySchema, result: agentResultSchema}).strict();
export const replayDataSchema = z.object({version: z.literal(1), generatedAt: z.string().datetime(), replays: z.record(z.string(), replaySchema)}).strict();
const replayData = replayDataSchema.parse(data);
type Replay = z.infer<typeof replaySchema>;

export function getReplay(locale: Locale, mode: QueryMode): Replay {
  const validatedMode = queryModeSchema.parse(mode);
  const replay = replayData.replays[`${locale}.${validatedMode}`];
  if (!replay) throw new Error(`Replay not found for ${locale}.${validatedMode}`);
  return replay;
}

export const replayGeneratedAt = replayData.generatedAt;
