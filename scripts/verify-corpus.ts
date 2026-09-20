import "dotenv/config";

import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {createClient} from "@sanity/client";
import {assertReviewedAdjudication, canonicalAdjudicationDigest, reviewedAdjudicationSchema, type CanonicalAdjudication} from "../src/lib/adjudication-integrity";
import {atlasCorpusSnapshotDigest} from "./lib/atlas-corpus-integrity";
import {deterministicSourceId, readCorpusManifest} from "./lib/pinned-corpus";

type AtlasDocument = Record<string, unknown> & {_id: string; _type: string};
type SourceDocument = AtlasDocument & {title?: string; sourcePath?: string; sourceUrl?: string; sourceRef?: string; sourceCommit?: string; contentDigest?: string; content?: string; license?: string; lifecycleStatus?: string; authorityRank?: number; authorityDomains?: string[]; versionScope?: string[]};
type Reference = {_ref?: string};

const expectedStructuredIds = [
  "hyphaeAtlas.release.3-0-0", "hyphaeAtlas.evidence.g7-c60", "hyphaeAtlas.evidence.g8-3-0-0", "hyphaeAtlas.capability.snapshot-isolation", "hyphaeAtlas.capability.bounded-sql", "hyphaeAtlas.capability.native-mcp", "hyphaeAtlas.compatibility.native-2x-to-3", "hyphaeAtlas.compatibility.format2-to-native", "hyphaeAtlas.claim.serializable", "hyphaeAtlas.claim.universal-sql", "hyphaeAtlas.claim.g7-portable-latency", "hyphaeAtlas.adjudication.g7-closure-portability", "hyphaeAtlas.contract.native-mcp-v2", "hyphaeAtlas.contract.http-v2",
];
const expectedTypeCounts: Record<string, number> = {sourceDocument: 20, hyphaeRelease: 1, capability: 3, compatibilityRule: 2, productClaim: 3, evidenceArtifact: 2, conflictAdjudication: 1, publicContract: 2};
function digest(value: string): string {return createHash("sha256").update(value).digest("hex");}
function refs(value: unknown, found = new Set<string>()): Set<string> {if (Array.isArray(value)) for (const item of value) refs(item, found); else if (value && typeof value === "object") {const object = value as Record<string, unknown>; if (typeof object._ref === "string") found.add(object._ref); for (const [key, item] of Object.entries(object)) if (!key.startsWith("_")) refs(item, found);} return found;}
function orderedSnapshots(value: unknown, sourceById: Map<string, SourceDocument>): Array<{path: string; digest: string}> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {const id = (item as Reference)?._ref; const source = id ? sourceById.get(id) : undefined; return {path: source?.sourcePath ?? `MISSING:${id ?? "reference"}`, digest: source?.contentDigest ?? "MISSING"};});
}

async function main() {
  const projectId = process.env.SANITY_PROJECT_ID; const dataset = process.env.SANITY_DATASET; const apiVersion = process.env.SANITY_API_VERSION; const token = process.env.SANITY_READ_TOKEN;
  if (!projectId || !dataset || !apiVersion || !token) throw new Error("Sanity read-only environment is incomplete");
  const [manifest, adjudication] = await Promise.all([
    readCorpusManifest(),
    readFile(path.resolve(process.cwd(), "corpus/adjudications/g7-closure-portability.json"), "utf8").then((value) => assertReviewedAdjudication(reviewedAdjudicationSchema.parse(JSON.parse(value)))),
  ]);
  const client = createClient({projectId, dataset, apiVersion, token, useCdn: false, perspective: "published"});
  const documents = await client.fetch<AtlasDocument[]>("*[_id in path(\"hyphaeAtlas.**\")]{...}");
  const errors: string[] = [];
  const byId = new Map(documents.map((document) => [document._id, document]));
  if (documents.length !== 34) errors.push(`Expected 34 Atlas documents, found ${documents.length}`);
  const expectedIds = new Set([...manifest.sources.map((source) => deterministicSourceId(source.path)), ...expectedStructuredIds]);
  for (const id of expectedIds) if (!byId.has(id)) errors.push(`Missing document: ${id}`);
  for (const document of documents) if (!expectedIds.has(document._id)) errors.push(`Unexpected Atlas document: ${document._id}`);
  for (const [type, count] of Object.entries(expectedTypeCounts)) {const actual = documents.filter((document) => document._type === type).length; if (actual !== count) errors.push(`Expected ${count} ${type} documents, found ${actual}`);}

  const sourceDocuments = documents.filter((document): document is SourceDocument => document._type === "sourceDocument");
  const sourceById = new Map(sourceDocuments.map((source) => [source._id, source]));
  const sourceByPath = new Map(sourceDocuments.map((source) => [source.sourcePath, source]));
  if (sourceByPath.size !== sourceDocuments.length) errors.push("Duplicate sourceDocument paths found");
  for (const entry of manifest.sources) {
    const source = sourceByPath.get(entry.path);
    if (!source) {errors.push(`Missing source path: ${entry.path}`); continue;}
    const expectedUrl = `${manifest.repository}/blob/${manifest.commit}/${entry.path}`;
    if (source._id !== deterministicSourceId(entry.path)) errors.push(`Non-deterministic source ID: ${entry.path}`);
    if (source.sourceCommit !== manifest.commit || source.sourceRef !== manifest.commit) errors.push(`Source pin mismatch: ${entry.path}`);
    if (source.sourceUrl !== expectedUrl) errors.push(`Canonical source URL mismatch: ${entry.path}`);
    if (!source.contentDigest || !/^[a-f0-9]{64}$/.test(source.contentDigest) || typeof source.content !== "string" || digest(source.content) !== source.contentDigest) errors.push(`Content digest mismatch: ${entry.path}`);
    if (source.license !== entry.license || source.lifecycleStatus !== entry.lifecycleStatus || source.authorityRank !== entry.authorityRank) errors.push(`Source metadata mismatch: ${entry.path}`);
    if (JSON.stringify(source.authorityDomains) !== JSON.stringify(entry.authorityDomains) || JSON.stringify(source.versionScope) !== JSON.stringify(entry.versionScope)) errors.push(`Source scope mismatch: ${entry.path}`);
  }

  for (const document of documents) for (const reference of refs(document)) if (!byId.has(reference)) errors.push(`Dangling reference ${reference} from ${document._id}`);
  const decision = byId.get(adjudication.id);
  if (!decision || decision._type !== "conflictAdjudication") errors.push("G7 conflict adjudication is missing");
  else {
    const rows = Array.isArray(decision.applicability) ? decision.applicability as Array<Record<string, unknown>> : [];
    const canonical: CanonicalAdjudication = {
      version: 1,
      id: adjudication.id,
      title: decision.title as string,
      domain: decision.domain as string,
      question: decision.question as string,
      status: decision.status as "resolved",
      humanReviewed: decision.humanReviewed as true,
      reviewedAt: decision.reviewedAt as string,
      reviewer: decision.reviewer as string,
      policyVersion: decision.policyVersion as string,
      resolution: decision.resolution as string,
      versionScope: decision.versionScope as string[],
      environmentScope: decision.environmentScope as string[],
      historicalSources: orderedSnapshots(decision.historicalSources, sourceById),
      authoritativeSources: orderedSnapshots(decision.authoritativeSources, sourceById),
      scopedSources: orderedSnapshots(decision.scopedSources, sourceById),
      applicability: rows.map((row) => ({id: row.id as string, claim: row.claim as string, decision: row.decision as "supported" | "unsupported" | "not-established", scope: row.scope as string, rationale: row.rationale as string, sources: orderedSnapshots(row.sources, sourceById).map((source) => source.path)})),
    };
    try {
      const actualDecisionDigest = canonicalAdjudicationDigest(canonical);
      if (actualDecisionDigest !== adjudication.decisionDigest || decision.decisionDigest !== adjudication.decisionDigest) errors.push("G7 canonical decision digest mismatch");
    } catch (error) {errors.push(`G7 canonical decision shape mismatch: ${error instanceof Error ? error.message : "unknown error"}`);}
    const corpusSnapshotDigest = atlasCorpusSnapshotDigest(documents);
    if (decision.corpusCommit !== manifest.commit || decision.corpusDocumentCount !== 34 || decision.corpusSnapshotDigest !== corpusSnapshotDigest) errors.push("G7 corpus snapshot binding mismatch");
  }
  const smokeDocuments = documents.filter((document) => document._type === "hyphaeAtlasSmoke"); if (smokeDocuments.length) errors.push("Smoke documents remain in the Atlas namespace");
  const nonAtlasCount = await client.fetch<number>("count(*[!(_id in path(\"hyphaeAtlas.**\"))])");
  const result = {valid: errors.length === 0, corpusCommit: manifest.commit, corpusSnapshotDigest: atlasCorpusSnapshotDigest(documents), atlasDocumentCount: documents.length, sourceDocumentCount: sourceDocuments.length, structuredDocumentCount: documents.length - sourceDocuments.length, nonAtlasDocumentCount: nonAtlasCount, typeCounts: Object.fromEntries(Object.keys(expectedTypeCounts).map((type) => [type, documents.filter((document) => document._type === type).length])), errors};
  console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1;
}

main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : "Unknown verification error"); process.exitCode = 1;});
