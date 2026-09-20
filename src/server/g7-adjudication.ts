import "server-only";

import {z} from "zod";
import {getSanityClient} from "@/sanity/client";
import reviewedDecisionJson from "../../corpus/adjudications/g7-closure-portability.json";
import {assertReviewedAdjudication, canonicalAdjudicationDigest, reviewedAdjudicationSchema, type CanonicalAdjudication} from "@/lib/adjudication-integrity";

const sourceSchema = z.object({title: z.string(), path: z.string(), url: z.string().url(), sourceCommit: z.string().regex(/^[a-f0-9]{40}$/), digest: z.string().regex(/^[a-f0-9]{64}$/), license: z.string(), lifecycleStatus: z.string(), authorityRank: z.number().int().min(0).max(100)}).strict();
const snapshotSourceSchema = sourceSchema.pick({path: true, digest: true});
const rowSchema = z.object({id: z.string(), claim: z.string(), decision: z.enum(["supported", "unsupported", "not-established"]), scope: z.string(), rationale: z.string(), sources: z.array(sourceSchema).min(1)}).strict();
const fetchedSchema = z.object({
  id: z.literal("hyphaeAtlas.adjudication.g7-closure-portability"), title: z.string(), domain: z.string(), question: z.string(), status: z.literal("resolved"), humanReviewed: z.literal(true), reviewedAt: z.string(), reviewer: z.string(), policyVersion: z.string(), decisionDigest: z.string().regex(/^[a-f0-9]{64}$/), resolution: z.string(), versionScope: z.array(z.string()), environmentScope: z.array(z.string()), corpusCommit: z.string().regex(/^[a-f0-9]{40}$/), corpusDocumentCount: z.literal(34), corpusSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/), historicalSources: z.array(snapshotSourceSchema).min(1), authoritativeSources: z.array(snapshotSourceSchema).min(1), scopedSources: z.array(snapshotSourceSchema).min(1), applicability: z.array(rowSchema).min(1),
}).strict();
export const g7AdjudicationDtoSchema = fetchedSchema.pick({id: true, title: true, status: true, humanReviewed: true, reviewedAt: true, reviewer: true, resolution: true, versionScope: true, environmentScope: true, applicability: true}).strip();
export type G7AdjudicationDto = z.infer<typeof g7AdjudicationDtoSchema>;
const reviewedDecision = assertReviewedAdjudication(reviewedAdjudicationSchema.parse(reviewedDecisionJson));

function canonicalFromFetched(document: z.infer<typeof fetchedSchema>): CanonicalAdjudication {
  return {
    version: 1, id: document.id, title: document.title, domain: document.domain, question: document.question, status: document.status, humanReviewed: document.humanReviewed, reviewedAt: document.reviewedAt, reviewer: document.reviewer, policyVersion: document.policyVersion, resolution: document.resolution, versionScope: document.versionScope, environmentScope: document.environmentScope, historicalSources: document.historicalSources, authoritativeSources: document.authoritativeSources, scopedSources: document.scopedSources,
    applicability: document.applicability.map((row) => ({id: row.id, claim: row.claim, decision: row.decision, scope: row.scope, rationale: row.rationale, sources: row.sources.map((source) => source.path)})),
  };
}

export async function getG7Adjudication(signal?: AbortSignal): Promise<G7AdjudicationDto | null> {
  const raw = await getSanityClient().fetch<unknown>(`*[_id == "hyphaeAtlas.adjudication.g7-closure-portability" && _type == "conflictAdjudication"][0]{"id":_id,title,domain,question,status,humanReviewed,reviewedAt,reviewer,policyVersion,decisionDigest,resolution,versionScope,environmentScope,corpusCommit,corpusDocumentCount,corpusSnapshotDigest,"historicalSources":historicalSources[]->{"path":sourcePath,"digest":contentDigest},"authoritativeSources":authoritativeSources[]->{"path":sourcePath,"digest":contentDigest},"scopedSources":scopedSources[]->{"path":sourcePath,"digest":contentDigest},"applicability":applicability[]{id,claim,decision,scope,rationale,"sources":sources[]->{title,"path":sourcePath,"url":sourceUrl,"sourceCommit":sourceCommit,"digest":contentDigest,license,lifecycleStatus,authorityRank}}}`, {}, {signal});
  if (!raw) return null;
  const document = fetchedSchema.parse(raw);
  const actualDigest = canonicalAdjudicationDigest(canonicalFromFetched(document));
  if (document.decisionDigest !== reviewedDecision.decisionDigest || actualDigest !== reviewedDecision.decisionDigest) throw new Error("Published G7 adjudication does not match the reviewed canonical decision");
  if (document.corpusCommit !== "fcccee58a96987867381a5a5fca7cb12dc3bb632") throw new Error("Published G7 adjudication is not bound to the reviewed corpus commit");
  return g7AdjudicationDtoSchema.parse(document);
}
