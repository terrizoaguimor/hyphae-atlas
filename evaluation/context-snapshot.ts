import {readFile} from "node:fs/promises";
import path from "node:path";
import {z} from "zod";
import {getSanityClient} from "../src/sanity/client";
import {callContextTool, parseKnowledgeBaseOutline} from "../src/agent/context-client";
import {atlasCorpusSnapshotDigest} from "../scripts/lib/atlas-corpus-integrity";
import {sha256, type CorpusManifest} from "../scripts/lib/pinned-corpus";

const receiptSchema = z.object({
  version: z.literal(1),
  corpusCommit: z.string().regex(/^[a-f0-9]{40}$/),
  corpusSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
  sanityProjectId: z.string().min(1),
  sanityDataset: z.string().min(1),
  atlasDocumentCount: z.literal(34),
  sourceDocumentCount: z.literal(20),
  knowledgeBaseId: z.string().regex(/^kb[A-Za-z0-9_-]+$/),
  markerPath: z.string().min(1),
  markerContentDigest: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedAt: z.string().datetime(),
  reviewer: z.string().min(1),
}).strict();
export type ContextSnapshotReceipt = z.infer<typeof receiptSchema>;
export type ContextSnapshot = ContextSnapshotReceipt & {outlinePaths: string[]; markerContentDigest: string};

type AtlasDocument = Record<string, unknown> & {_id: string; _type: string; sourceCommit?: string; sourcePath?: string; content?: string; contentDigest?: string};

export async function preflightContextSnapshot(manifest: CorpusManifest, receiptArgument?: string): Promise<ContextSnapshot> {
  const receiptPath = receiptArgument ?? process.env.ATLAS_CONTEXT_SNAPSHOT_RECEIPT;
  if (!receiptPath) throw new Error("Context ablation requires --snapshot-receipt=<reviewed JSON> or ATLAS_CONTEXT_SNAPSHOT_RECEIPT");
  const receipt = receiptSchema.parse(JSON.parse(await readFile(path.resolve(process.cwd(), receiptPath), "utf8")));
  if (receipt.corpusCommit !== manifest.commit) throw new Error("Context snapshot receipt does not match the reviewed manifest commit");
  if (process.env.SANITY_PROJECT_ID !== receipt.sanityProjectId || process.env.SANITY_DATASET !== receipt.sanityDataset) throw new Error("Configured Sanity dataset does not match the reviewed Context snapshot receipt");

  const documents = await getSanityClient().fetch<AtlasDocument[]>(`*[_id in path("hyphaeAtlas.**")]{...}`, {}, {perspective: "published"});
  const sources = documents.filter((document) => document._type === "sourceDocument");
  if (documents.length !== receipt.atlasDocumentCount || sources.length !== receipt.sourceDocumentCount) throw new Error("Published Atlas corpus cardinality does not match the reviewed Context snapshot receipt");
  for (const source of sources) {
    if (source.sourceCommit !== manifest.commit || typeof source.content !== "string" || source.contentDigest !== sha256(source.content)) throw new Error(`Published source snapshot mismatch: ${source.sourcePath ?? source._id}`);
  }
  const corpusSnapshotDigest = atlasCorpusSnapshotDigest(documents);
  if (corpusSnapshotDigest !== receipt.corpusSnapshotDigest) throw new Error("Published Atlas corpus digest does not match the reviewed Context snapshot receipt");

  const initialContext = await callContextTool("initial_context", {});
  const outline = parseKnowledgeBaseOutline(initialContext);
  if (outline.knowledgeBase !== receipt.knowledgeBaseId) throw new Error("Context Knowledge Base ID does not match the reviewed snapshot receipt");
  if (!outline.paths.includes(receipt.markerPath)) throw new Error("Context snapshot marker path is absent from the Knowledge Base outline");
  const marker = await callContextTool("knowledge_base_read", {knowledgeBase: outline.knowledgeBase, paths: [receipt.markerPath]});
  if (sha256(marker) !== receipt.markerContentDigest) throw new Error("Context snapshot marker content does not match the reviewed receipt");
  return {...receipt, outlinePaths: outline.paths};
}
