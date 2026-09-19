# Hyphae Atlas

A version-aware migration, capability, and product-claim agent powered by structured Hyphae content, Sanity Context, and Grok.

> **Current status:** the application, Sanity schema, corpus importer, structured dataset, Grok runtime, UI, Knowledge Base, Context MCP, and evaluation harness are implemented. The live agent uses Sanity Context Knowledge Base mode and the final strict baseline passed all 12 cases in one uninterrupted run.

## What Atlas does

- **Migration Advisor** checks upgrade/import paths and refuses to invent downgrade guarantees.
- **Capability Inspector** verifies support, surfaces, bounds, protocol minors, and authority.
- **Claim Auditor** tests product language against releases, commits, gates, environments, and non-claims.
- **Guided EN/ES experience** explains each decision type, localizes the report, and narrates the evidence path while the agent works.
- **Interactive evidence graph** uses Three.js and GSAP to visualize Sources → Knowledge Base → Context MCP → Grok → Verdict, with reduced-motion support.

Every report contains a verdict, applicability, findings, required qualifiers, conflicts, limitations, recommended actions, and a source ledger.

Atlas then runs a deterministic **Proof Path**: internal Knowledge Base citations are resolved through the structured Sanity relationships to public upstream files. Each resolved source carries its exact commit, SHA-256 digest, license, lifecycle state, and authority rank. The UI can fetch the immutable raw file and verify its digest without trusting the model.

Six real Context MCP runs (three modes × English/Spanish) are stored as instant, unedited replays. Users can understand the complete result immediately or switch to a live Grok + Context run.

## Why structured content matters

Hyphae documentation spans normative specifications, public contracts, release receipts, compatibility fixtures, current product documentation, historical material, and unreleased plans. A keyword hit is not enough to decide which statement applies. Atlas models those authority and lifecycle boundaries in Sanity and uses them before producing a conclusion.

## Architecture

```text
Browser
  -> Next.js server route
  -> Grok/xAI
  -> Sanity Context MCP (Knowledge Base mode)
       -> initial_context
       -> knowledge_base_read
  -> Hyphae Atlas Knowledge Base
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
- An xAI API key with access to the configured Grok model
- A local checkout of the public Hyphae repository for corpus import

## Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` locally. Never commit it.

```env
XAI_API_KEY=
XAI_MODEL=grok-4.6
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

- accepts only paths declared in `corpus/manifest.json`;
- rejects sources outside the configured Hyphae root;
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
| `npm run replays:capture` | Capture six real EN/ES Context runs for instant replay |
| `npm run evaluate` | Run the gold evaluation corpus |

## Security

- Secrets are server-only and `.env` is ignored.
- Context is read-only and uses an organization token with the minimum `Context Viewer` permission.
- The xAI MCP tool allowlist contains only `initial_context` and `knowledge_base_read`.
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

The web runtime receives only `XAI_API_KEY`, `SANITY_CONTEXT_TOKEN`, and `SANITY_READ_TOKEN`. `SANITY_WRITE_TOKEN` belongs only to `corpus:import`; `SANITY_DEPLOY_TOKEN` belongs only to schema/Studio deployment. See [`SECURITY.md`](SECURITY.md) for API bounds, cancellation, audited grounding, edge rate limiting, and the pre-publication checklist.
