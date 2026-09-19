import {z} from "zod";
import {atlasReportSchema, type AtlasQuery} from "./report-schema";
import {callContextTool, parseKnowledgeBaseOutline} from "./context-client";
import {getModelProvider} from "./providers";
import {systemPrompt, userPrompt} from "./prompts";

const selectionSchema = z.object({paths: z.array(z.string()).min(1).max(8), rationale: z.string().max(1_000).optional()});
function parseJson(text: string): unknown {const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""); try {return JSON.parse(cleaned);} catch {const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}"); if (start < 0 || end <= start) throw new Error("Model output did not contain JSON"); return JSON.parse(cleaned.slice(start, end + 1));}}

export async function runProviderAgnosticAgent(query: AtlasQuery, signal?: AbortSignal) {
  const provider = getModelProvider();
  const initialContext = await callContextTool("initial_context", {}, signal);
  const outline = parseKnowledgeBaseOutline(initialContext);
  const selectionText = await provider.generate({
    system: "You select the smallest sufficient set of Sanity Knowledge Base entries for a technical evidence question. Return JSON only: {\"paths\":[\"exact/path\"],\"rationale\":\"short\"}. Select 1-8 paths copied exactly from AVAILABLE_PATHS. Never invent a path.",
    user: `${userPrompt(query)}\nAVAILABLE_PATHS:\n${outline.paths.join("\n")}`,
    maxTokens: 500,
    signal,
  });
  const selection = selectionSchema.parse(parseJson(selectionText));
  const allowed = new Set(outline.paths); const selectedPaths = [...new Set(selection.paths)];
  if (selectedPaths.some((entry) => !allowed.has(entry))) throw new Error("Model selected a Knowledge Base path outside initial_context");
  const readArguments = {knowledgeBase: outline.knowledgeBase, paths: selectedPaths};
  const retrievedText = await callContextTool("knowledge_base_read", readArguments, signal);
  const reportText = await provider.generate({
    system: systemPrompt("The backend already called initial_context and knowledge_base_read. Use only the KNOWLEDGE_BASE_CONTENT below. Citation references must be copied exactly from that content. Do not claim to call tools yourself."),
    user: `${userPrompt(query)}\n\nSELECTED_PATHS:\n${selectedPaths.join("\n")}\n\nKNOWLEDGE_BASE_CONTENT:\n${retrievedText}`,
    maxTokens: 4_000,
    signal,
  });
  return {report: atlasReportSchema.parse(parseJson(reportText)), provider, selectedPaths, retrievedText, toolCalls: [{name: "initial_context", arguments: {}}, {name: "knowledge_base_read", arguments: readArguments}]};
}


export async function runInlinePreviewAgent(query: AtlasQuery, context: unknown, signal?: AbortSignal) {
  const provider = getModelProvider();
  const reportText = await provider.generate({
    system: systemPrompt("You are in a labeled dataset preview. Use only SANITY_DATASET_PREVIEW_CONTEXT. Citation references must be copied exactly from that context."),
    user: `${userPrompt(query)}\n\nSANITY_DATASET_PREVIEW_CONTEXT:\n${JSON.stringify(context)}`,
    maxTokens: 4_000,
    signal,
  });
  return {report: atlasReportSchema.parse(parseJson(reportText)), provider};
}
