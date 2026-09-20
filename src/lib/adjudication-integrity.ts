import {createHash} from "node:crypto";
import {z} from "zod";

export const adjudicationSnapshotSchema = z.object({path: z.string().min(1), digest: z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const canonicalAdjudicationSchema = z.object({
  version: z.literal(1),
  id: z.literal("hyphaeAtlas.adjudication.g7-closure-portability"),
  title: z.string().min(1),
  domain: z.string().min(1),
  question: z.string().min(1),
  status: z.literal("resolved"),
  humanReviewed: z.literal(true),
  reviewedAt: z.string().min(1),
  reviewer: z.string().min(1),
  policyVersion: z.string().min(1),
  resolution: z.string().min(1),
  versionScope: z.array(z.string().min(1)).min(1),
  environmentScope: z.array(z.string().min(1)).min(1),
  historicalSources: z.array(adjudicationSnapshotSchema).min(1),
  authoritativeSources: z.array(adjudicationSnapshotSchema).min(1),
  scopedSources: z.array(adjudicationSnapshotSchema).min(1),
  applicability: z.array(z.object({
    id: z.string().min(1),
    claim: z.string().min(1),
    decision: z.enum(["supported", "unsupported", "not-established"]),
    scope: z.string().min(1),
    rationale: z.string().min(1),
    sources: z.array(z.string().min(1)).min(1),
  }).strict()).min(1),
}).strict();

export const reviewedAdjudicationSchema = canonicalAdjudicationSchema.extend({decisionDigest: z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export type CanonicalAdjudication = z.infer<typeof canonicalAdjudicationSchema>;
export type ReviewedAdjudication = z.infer<typeof reviewedAdjudicationSchema>;

export function canonicalAdjudicationDigest(value: CanonicalAdjudication): string {
  const canonical = canonicalAdjudicationSchema.parse(value);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function assertReviewedAdjudication(value: ReviewedAdjudication): ReviewedAdjudication {
  const reviewed = reviewedAdjudicationSchema.parse(value);
  const {decisionDigest, ...canonical} = reviewed;
  const actual = canonicalAdjudicationDigest(canonical);
  if (actual !== decisionDigest) throw new Error(`G7 canonical decision digest mismatch: expected ${decisionDigest}, received ${actual}`);
  return reviewed;
}
