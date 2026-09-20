# Agent evaluation

The evaluation corpus checks evidence behavior rather than prose style. `cases.json` contains exactly 12 gold cases covering migration, capabilities, claims, released/unreleased boundaries, source requirements, required qualifiers, and prohibited language.

## Shared scoring

Both the production baseline and ablation use `evaluation/scoring.ts`. A case passes only when the verdict is accepted, every required upstream path resolves, every required semantic group appears, no prohibited affirmative assertion appears, every finding is grounded, and Context arms contain both required Context tools. The scorer reads resolved evidence paths rather than trusting model-provided URLs.

## Production baseline

```bash
npm run evaluate -- --smoke
npm run evaluate
npm run evaluate -- --case=migration-native-2x-to-3
```

On 2026-09-19, the final strict Context run passed all 12 cases without retry. The checked-in `baseline-summary.json` is the reviewed aggregate. Generated details remain under ignored `evaluation/results/`.

## Reproducible three-arm ablation

The ablation uses one neutral final synthesis prompt, one output schema, the same configured provider/model, a 4,000-token budget, and exactly one answer call per case for every arm. Only supplied retrieval context differs. The Context selector remains a separate retrieval-stage call and is recorded separately.

1. `context`: Sanity Context retrieval from a Knowledge Base whose ID and marker entry are bound to a reviewed published-dataset snapshot receipt.
2. `keyword`: deterministic lexical ranking over the same 20 `sourceDocument` inputs read from the reviewed Git commit.
3. `none`: no supplied corpus. Guessed paths receive zero source or finding-grounding credit by construction.

### Required Context snapshot receipt

Context runs fail closed unless `--snapshot-receipt=<path>` or `ATLAS_CONTEXT_SNAPSHOT_RECEIPT` names a reviewed JSON receipt with this shape:

```json
{
  "version": 1,
  "corpusCommit": "fcccee58a96987867381a5a5fca7cb12dc3bb632",
  "corpusSnapshotDigest": "<64 lowercase hex from the pinned import dry-run>",
  "sanityProjectId": "<project id>",
  "sanityDataset": "<published dataset>",
  "atlasDocumentCount": 34,
  "sourceDocumentCount": 20,
  "knowledgeBaseId": "<kb id>",
  "markerPath": "<reviewed KB entry that exposes the G7 adjudication>",
  "markerContentDigest": "<SHA-256 of the exact knowledge_base_read response>",
  "reviewedAt": "<ISO timestamp>",
  "reviewer": "<human reviewer>"
}
```

After deploying/importing the approved schema and rebuilding Context, choose the generated entry that exposes the adjudication and record the SHA-256 of its exact `knowledge_base_read` response. The preflight recomputes the complete published Atlas snapshot digest, verifies every source commit/content digest and exact 34/20 cardinality, checks the configured project/dataset and Knowledge Base ID, then requires the generated marker entry to match that reviewed digest byte for byte. The receipt therefore binds both sides of the review: the exact published dataset snapshot and the exact generated Context evidence. A stale 33-document dataset, different KB, changed entry, current upstream HEAD, or edited structured record cannot be labeled with the reviewed snapshot.

### Candidate and explicit promotion flow

```bash
npm run evaluate:ablation:verify
# Expensive and remote by design; run only intentionally after receipt review:
npm run evaluate:ablation -- --snapshot-receipt=evaluation/context-snapshot.receipt.json
# Verify the exact timestamped candidate before human review:
npm run evaluate:ablation:verify -- --file=evaluation/results/ablation/<timestamp>-full.candidate.json
# Explicitly promote metrics only; raw model reports stay local/ignored:
npm run evaluate:ablation:promote -- --file=evaluation/results/ablation/<timestamp>-full.candidate.json --reviewer="<name>"
```

The runner writes only timestamped `*.candidate.json` files and always marks them `publishable: false`; it never writes `latest.json` or the public summary. Each candidate persists the raw parsed report, exact resolution observations, supplied-context byte count/digest, selected entries/source paths, model, common prompt/schema digests, answer-call count, and selector-call count. The verifier reruns `scoreEvaluationCase` from `cases.json`, compares every derived field, recomputes aggregates, and checks arm-specific invariants.

Only the explicit promotion command accepts a complete, error-free, full three-arm candidate. It re-verifies the candidate, binds its SHA-256 digest plus reviewer/time, removes raw reports, and atomically updates `evaluation/results/ablation/latest.json` and `evaluation/ablation-summary.json`. Never publish raw candidates without a separate sensitive-output review.

## Public Evaluation Lab

The UI parses `ablation-summary.json` with the strict artifact schema and displays percentages only for a full, reviewed, receipt-bound, three-arm promotion. Pending values display dashes. Complete-but-unreviewed, partial, malformed, or one-arm summaries fail closed rather than showing competitive metrics. Filters and the 12 case definitions remain local and make no evaluation or model request.
