import data from "./replays.json";
import type {Locale} from "@/agent/modes";
import type {AgentResult, AtlasQuery, QueryMode} from "@/agent/report-schema";

type Replay = {label: string; query: AtlasQuery; result: AgentResult};
type ReplayData = {version: number; generatedAt: string; replays: Record<string, Replay>};
const replayData = data as unknown as ReplayData;

export function getReplay(locale: Locale, mode: QueryMode): Replay {
  const replay = replayData.replays[`${locale}.${mode}`];
  if (!replay) throw new Error(`Replay not found for ${locale}.${mode}`);
  return replay;
}

export const replayGeneratedAt = replayData.generatedAt;
