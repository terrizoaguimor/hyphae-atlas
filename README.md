# Hyphae Atlas

A version-aware migration, capability, and product-claim agent powered by structured Hyphae content, Sanity Context, and a pluggable model provider.

> **Current status:** the application, eight-type Sanity schema, pinned 34-document dataset, 21-entry Knowledge Base, provider-agnostic Context MCP runtime, bilingual UI, six replays, reviewed three-arm ablation, replay-only Judge Mode, and accessible 27-second walkthrough are complete. The hosted demo uses xAI, while self-hosters may select OpenAI, Anthropic, or any HTTPS OpenAI-compatible endpoint. The final post-adjudication production baseline passed all 12 cases in one uninterrupted run with zero retries.

## What Atlas does

- **Migration Advisor** checks upgrade/import paths and refuses to invent downgrade guarantees.
- **Capability Inspector** verifies support, surfaces, bounds, protocol minors, and authority.
- **Claim Auditor** tests product language against releases, commits, gates, environments, and non-claims.
- **Guided EN/ES experience** explains each decision type, localizes the report, and narrates the evidence path while the agent works.
- **Interactive evidence graph** uses Three.js and GSAP to visualize Sources → Knowledge Base → Context MCP → Model → Verdict, with reduced-motion support.

Every report contains a verdict, applicability, findings, required qualifiers, conflicts, limitations, recommended actions, and a source ledger.

Atlas then runs a deterministic **Proof Path**: internal Knowledge Base citations are resolved through the structured Sanity relationships to public upstream files. Each resolved source carries its exact commit, SHA-256 digest, license, lifecycle state, and authority rank. The UI can fetch the immutable raw file and verify its digest without trusting the model.

Six real Context MCP runs (three modes × English/Spanish) are stored as instant, unedited replays. Users can understand the complete result immediately or switch to a live run with the configured provider.

## Why structured content matters

Hyphae documentation spans normative specifications, public contracts, release receipts, compatibility fixtures, current product documentation, historical material, and unreleased plans. A keyword hit is not enough to decide which statement applies. Atlas models those authority and lifecycle boundaries in Sanity and uses them before producing a conclusion.

## Architecture

```text
Browser
  -> Next.js server route
  -> Atlas-owned MCP loop
       -> initial_context
       -> configured model selects validated paths
       -> knowledge_base_read
       -> configured model synthesizes JSON
  -> deterministic Evidence Resolver
       -> Sanity source relationships
       -> upstream Git commit + SHA-256
       -> optional live digest verification
```

Context MCP is configured and live. If the two Context variables are deliberately removed, the server falls back to a visibly labeled `sanity-dataset-preview` mode for development. Preview mode is not used as final Path One evidence.

## Prerequisites

- Node.js 22.12 or newer
- npm
- A Sanity project and project write token
- Sanity Context/Knowledge Bases enabled for the organization
- An organization token with `Context Viewer`
- A server-side key for one supported provider: xAI, OpenAI, Anthropic, or an HTTPS OpenAI-compatible endpoint
- A local checkout of the public Hyphae repository for corpus import

## Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` locally. Never commit it.

```env
MODEL_PROVIDER=xai

# Configure only the selected provider
XAI_API_KEY=
XAI_MODEL=grok-4.6
OPENAI_API_KEY=
OPENAI_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
MODEL_API_KEY=
MODEL_NAME=
MODEL_BASE_URL=

SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_API_VERSION=2026-09-18
SANITY_WRITE_TOKEN=
SANITY_DEPLOY_TOKEN=
SANITY_READ_TOKEN=
SANITY_CONTEXT_TOKEN=
SANITY_CONTEXT_MCP_URL=
HYPHAE_SOURCE_PATH=../hyphae
APP_URL=http://localhost:3000
PORT=3000
```

### Choose a model provider

The hosted demo uses `MODEL_PROVIDER=xai`. Self-hosters can switch without changing the agent loop:

```env
MODEL_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=
```

```env
MODEL_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

```env
MODEL_PROVIDER=openai-compatible
MODEL_API_KEY=
MODEL_NAME=
MODEL_BASE_URL=https://your-provider.example/v1
```

Provider keys remain server-side. Visitors to the hosted demo do not need a key, and the project does not accept browser-submitted BYOK credentials.

### Validate and deploy the schema

```bash
npm exec sanity -- schema validate
set -a && source .env && set +a
SANITY_AUTH_TOKEN="$SANITY_DEPLOY_TOKEN" npm run schema:deploy
```

### Import the corpus

```bash
npm run corpus:dry
npm run corpus:import
npm run corpus:verify
```

The importer:

- accepts only paths declared in `corpus/manifest.json` at its required reviewed commit pin;
- reads exact Git-object bytes rather than mutable checkout HEAD or working-tree files;
- rejects a `HYPHAE_SOURCE_COMMIT` override unless it equals the manifest pin;
- computes SHA-256 digests;
- creates deterministic IDs under `hyphaeAtlas.*`;
- uses idempotent `createOrReplace` mutations;
- verifies that non-Atlas document counts do not change;
- never performs a global delete.

### Configure Context

Follow [`docs/context-setup.md`](docs/context-setup.md), then run:

```bash
npm run context:smoke
```

A passing smoke must show `sanity-context-mcp`, both required tools, and at least one cited source.

### Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Evaluation

The gold corpus contains 12 cases across migration, capability, and claim auditing:

```bash
npm run evaluate -- --smoke
npm run evaluate
npm run evaluate -- --case=claim-g7-portable-latency
npm run evaluate:ablation:verify
# Expensive and remote; requires a reviewed 34-document corpus/Knowledge Base receipt:
npm run evaluate:ablation -- --snapshot-receipt=evaluation/context-snapshot.receipt.json
# Human review and explicit promotion are separate; the runner never updates public metrics:
npm run evaluate:ablation:promote -- --file=evaluation/results/ablation/<candidate>.json --reviewer="<name>"
```

Run the full evaluation only after Context MCP is configured so the final results measure the challenge architecture rather than preview retrieval.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start local application |
| `npm run build` | Create production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run studio` | Start Sanity Studio |
| `npm run schema:deploy` | Deploy the schema using an authenticated Sanity CLI |
| `npm run corpus:dry` | Validate corpus without writing |
| `npm run corpus:import` | Idempotently import Atlas documents |
| `npm run corpus:verify` | Verify remote dataset invariants |
| `npm run context:smoke` | Verify live Context MCP and required tools |
| `npm run providers:smoke` | Validate xAI/OpenAI/Anthropic/OpenAI-compatible adapters without external calls |
| `npm run security:smoke` | Run body, rate, grounding, polarity, replay, and secret-template regressions |
| `npm run cancellation:smoke` | Verify abort propagation and concurrency-slot release |
| `npm run replays:capture` | Capture six real EN/ES Context runs for instant replay |
| `npm run evaluate` | Run the gold evaluation corpus |
| `npm run evaluate:ablation:verify` | Verify pending public data or recompute a timestamped candidate from raw observations |
| `npm run evaluate:ablation` | Run the expensive three-arm evaluation with a reviewed Context snapshot receipt; writes candidates only |
| `npm run evaluate:ablation:promote` | Re-verify and explicitly promote a reviewed full candidate without raw model output |
| `npm run demo:policy:smoke` | Verify the recorder permits only loopback GET/HEAD traffic |
| `npm run demo:record` | Record URL-backed Judge Mode with pinned playwright-core, system Chromium, and fail-closed request policy |

## Security

- Secrets are server-only and `.env` is ignored.
- Context is read-only and uses an organization token with the minimum `Context Viewer` permission.
- Atlas owns the two MCP calls (`initial_context`, `knowledge_base_read`) and validates selected outline paths before retrieval.
- Inputs, outputs, tool rounds, request time, and request frequency are bounded.
- Errors are redacted before reaching clients.
- Retrieved content is treated as untrusted data, not system instructions.
- The deployed Next.js dependency graph passes `npm audit --omit=dev` with zero vulnerabilities.
- Sanity Studio/CLI remains development-only; review its upstream transitive advisories before processing untrusted local archives or YAML.

## Existing work and challenge work

Hyphae and its documentation existed before this challenge. This repository contains the new challenge work: Sanity content model, manifest/import pipeline, Knowledge Base configuration guidance, agent runtime, UI, evaluation corpus, and submission material.

See [`ATTRIBUTION.md`](ATTRIBUTION.md) for source and license handling.

## Documentation

- [`PLAN.md`](PLAN.md) — scope and gates
- [`docs/architecture.md`](docs/architecture.md) — runtime and trust boundaries
- [`docs/content-authority.md`](docs/content-authority.md) — conflict policy
- [`docs/context-setup.md`](docs/context-setup.md) — final manual Context setup
- [`docs/submission-evidence.md`](docs/submission-evidence.md) — verified evidence and remaining external actions
- [`docs/submission-draft.md`](docs/submission-draft.md) — DEV Path One draft
- [`corpus/README.md`](corpus/README.md) — corpus provenance
- [`evaluation/README.md`](evaluation/README.md) — evaluation protocol


## Deployment credential matrix

The web runtime receives only the selected provider key, `SANITY_CONTEXT_TOKEN`, and `SANITY_READ_TOKEN`. `SANITY_WRITE_TOKEN` belongs only to `corpus:import`; `SANITY_DEPLOY_TOKEN` belongs only to schema/Studio deployment. See [`SECURITY.md`](SECURITY.md) for API bounds, cancellation, audited grounding, edge rate limiting, and the pre-publication checklist.


## Cloudflare deployment

Production runs on Cloudflare Workers through OpenNext at https://atlas.terrizoaguimor.dev.

```bash
npm run build:cloudflare
npm run deploy:cloudflare
```

Both commands use `scripts/cloudflare-safe-deploy.mjs`, which requires a clean commit, clones it without `.env`, builds with public variables only, and scans 1,000+ generated files against every local secret value before deployment. `wrangler.jsonc` configures the custom domain and Cloudflare-native rate-limit bindings for live model calls and SHA verification.

Runtime secrets must be added with `wrangler secret put`; never pass the offline Editor or Deploy Studio tokens to the Worker.


### Turnstile and abuse controls

Every fresh live model query on the Cloudflare deployment requires a single-use Turnstile token bound to action `atlas-query` and hostname `atlas.terrizoaguimor.dev`. Instant replays require no challenge and no model credits. Server validation checks success, action, hostname, age, and optional Cloudflare client IP before any model budget is consumed.

Additional controls include strict same-origin POSTs, CSP/HSTS/security headers, Cloudflare native rate limits, in-process client/global quotas, two-request concurrency, streaming body limits, provider/Context/global deadlines, and fail-closed missing bindings or secrets.


## Judge Mode and demo recording

Open `http://localhost:3000/?judge=conflict&locale=en` (or `es`). The `judge` query is a closed enum: `conflict`, `report`, `proof`, or `evaluation`. Judge Mode always loads the checked-in claim replay, removes live transitions, disables verification POSTs, and fetches the semantic G7 applicability matrix from `GET /api/adjudications/g7`. Until the new schema and corpus are imported, the UI deliberately shows an unavailable adjudication state.

After `npm run build` passes, start the built app and run `npm run demo:record`. Set `CHROMIUM_PATH` if Chromium is not in a standard system location. The generated WebM stays in ignored `artifacts-local/`; reviewed EN/ES caption sources are in `public/demo/`. The recorder fails on browser POSTs and, by default, on a missing persisted adjudication.
