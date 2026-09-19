*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16)*

# Hyphae Atlas: evidence before assertion

## What I Built

Hyphae Atlas is a version-aware agent for migration safety, capability inspection, and technical claim auditing. It answers questions about Hyphae, a local-first data engine whose documentation spans releases, normative specifications, machine contracts, compatibility fixtures, gates, receipts, current product guidance, and unreleased work.

A keyword match is not enough in this domain. A correct answer may depend on an exact release, source commit, protocol minor, API surface, lifecycle state, or benchmark environment. Atlas returns a structured verdict with applicability, findings, qualifiers, conflicts, limitations, recommended actions, and a source ledger.

The three workflows are:

- **Migration Advisor** — checks upgrade and import paths without inventing downgrade guarantees.
- **Capability Inspector** — verifies support, bounds, protocol surfaces, and required authority.
- **Claim Auditor** — decides whether product wording is supported, conditional, prohibited, or unproven.

The interface is available in English and Spanish, including the model-generated report. A guided example gallery explains the decision each mode resolves, contextual tooltips define MCP, Knowledge Bases, verdicts, qualifiers, and source ledgers, and a Three.js/GSAP evidence graph visualizes the actual Sources → Knowledge Base → Context MCP → Model → Verdict flow. During long calls, the UI narrates the agent stages instead of showing an unexplained spinner.

To make the demo usable without waiting for a model call, I captured six unedited live Context runs: three modes in English and Spanish. Users can open an instant replay or switch to a fresh live run. Every replay retains its capture time, tool trace, Knowledge Base entry paths, verdict, and resolved evidence.

Hyphae and its documentation existed before this challenge. I built the Sanity model, ingestion pipeline, Knowledge Base authority policy, agent runtime, interface, evaluation corpus, and submission workflow for this project.

## Demo

<!-- Replace before publishing -->

- Live application: `https://atlas.terrizoaguimor.dev`
- Video walkthrough: `<VIDEO_URL>`

The walkthrough demonstrates a Native 2.x → 3.0 migration question, rejects a dedicated-hardware latency claim that overstates G7, and distinguishes an unreleased Agent Memory candidate from the published 3.0.0 binaries.

## Code

<!-- Replace before publishing -->

Repository: https://github.com/terrizoaguimor/hyphae-atlas

The repository includes the Sanity schemas, a closed-world corpus manifest, an idempotent importer, provider-agnostic Context integration, strict output validation, the web interface, 12 gold evaluation cases, and reproducible setup documentation.

## How I Used Sanity

I modeled seven related document types in Sanity:

- source documents with path, commit, digest, license, lifecycle, authority domains, and version scope;
- Hyphae releases;
- capabilities;
- compatibility rules;
- product claims and non-claims;
- evidence artifacts;
- public API/MCP contracts.

The initial corpus contains 20 curated public sources and 13 additional structured records. Sources include canonical claim language, the Native capability matrix, SQL and MVCC contracts, directory migration semantics, the Native MCP contract, access control, compatibility fixtures, gate status, and the exact 3.0.0 publication receipt.

The importer uses deterministic `hyphaeAtlas.*` IDs, SHA-256 content digests, commit-pinned source URLs, idempotent upserts, and a guard that verifies non-Atlas document counts remain unchanged. Running it twice produced the same 33 Atlas documents.

I pointed Sanity Context at this structured dataset and built the Hyphae Atlas Knowledge Base with this purpose:

> Help Hyphae users, maintainers, and auditors determine whether a migration, capability, or technical claim is valid for an exact release, protocol surface, and evidence scope.

Atlas uses the Knowledge Base-mode tools:

1. `initial_context` to orient on the generated outline.
2. `knowledge_base_read` to retrieve the smallest sufficient set of relevant entries, batching related evidence when possible.

The agent treats retrieved content as data rather than instructions. Its authority rules distinguish published, historical, and unreleased material; use canonical claims for public wording; use machine contracts for API behavior; preserve benchmark environment and commit qualifiers; and return `unknown` or `unproven` when the sources cannot support a safe answer.

### Provider-agnostic agent loop

Atlas owns the MCP workflow instead of delegating it to a provider-specific connector. It calls `initial_context`, asks the configured model to select 1–8 paths, validates every path against the live outline, calls `knowledge_base_read` itself, and then asks the model to synthesize the structured report. The same interface supports xAI, OpenAI, Anthropic, and HTTPS OpenAI-compatible APIs. The hosted demo uses xAI, but the Sanity flow, trace, grounding, and evaluation do not depend on xAI.

### Proof Path: from citation to immutable source

Knowledge Base citations are intentionally source-aware but may arrive as internal labels such as `Native gate status — Dataset`. After the configured model returns a schema-valid report, a deterministic resolver follows the Sanity document relationships and Knowledge Base entry paths to the original `sourceDocument` records. The final UI shows the public GitHub URL, exact commit, SHA-256 digest, license, lifecycle state, and authority rank.

The **Verify SHA-256** action accepts only a namespaced Sanity source ID. The server reloads trusted provenance from Sanity, constructs an allowlisted `raw.githubusercontent.com/Hyphae-Research-Foundation/hyphae` URL, downloads bounded bytes, and compares the actual digest with the imported digest. A live verification of `docs/gates/native-gate-status.md` passed byte for byte.

### Visible agent trace

Every result exposes an operational trace—not private chain of thought—with four stages:

1. `initial_context`: orient on the live Knowledge Base outline.
2. `knowledge_base_read`: list the exact generated entry paths consulted.
3. `evidence_resolver`: resolve upstream source documents and provenance.
4. `schema_validation`: validate the JSON response contract and per-finding source resolution; this is not independent factual validation of the verdict.

The interface also includes an interactive timeline for the real G7 historical/current conflict and a public Evaluation Lab covering all 12 scenarios.

The live Knowledge Base build generated 21 entries. The final strict 12-case run passed without retry: 100% verdict accuracy, exact upstream source coverage, required semantic term coverage, per-finding grounding, and Context tool compliance, with zero affirmative prohibited assertions.

The build also surfaced a real temporal conflict: an older performance-target document said G7 had not closed, while the current gate index and exact release evidence record the closure. I reclassified the target baseline as historical and made current gate/receipt evidence authoritative for closure state.

<!-- Add final conflict screenshot and compact evaluation table before publishing. -->

## Sanity Project Details

- Sanity project ID: `v2ulbd4b`
- Dataset: `production`
- Knowledge Base: `Hyphae Atlas`
- Public dataset URL: `N/A — the required project ID is provided; Atlas path IDs are inspected through the project`

The project contains seven Atlas schema types and 33 namespaced documents in the initial corpus build.

## Agent Session

<!-- Optional: replace after uploading and making the session public. -->

Agent session: `<PUBLIC_AGENT_SESSION_URL>`

The curated session will show schema construction, safe import, the first provider-backed report, the move to a backend-owned MCP loop, and grounding/evaluation corrections without including API keys or environment values.

## What I learned

The hard part was not retrieval volume. It was preserving applicability. A performance number without its environment, a capability without its release, or an unreleased contract without lifecycle status can all produce a fluent but wrong answer. Modeling those boundaries made the agent more conservative and more useful.

<!-- Add cover image and #sanitychallenge before publishing. -->


## Reliability and security details

Atlas does not trust a citation merely because it resembles a real filename. Atlas itself calls `initial_context`, validates the model-selected paths, and calls `knowledge_base_read`. Each finding citation must appear in the exact text returned by that backend-owned read before the resolver follows canonical Sanity relationships to an upstream file. A forged `example.invalid/README.md` citation is covered by a regression check and resolves to nothing.

The final audited provider-agnostic evaluation passed 12/12 cases in one run with 12 attempts and zero retries: 100% verdict accuracy, required upstream source coverage, semantic term coverage, per-finding grounding, and Context tool compliance; no affirmative prohibited assertion passed. Browser cancellation propagates to the selected provider and Sanity, request bodies are bounded while streaming, and production uses separate Context Viewer and project Viewer tokens. Editor and Deploy Studio tokens never belong in the web runtime.


### Public demo abuse controls

The Cloudflare deployment makes all six verified replays immediately available without a key or challenge. A fresh live model query requires a managed Turnstile token restricted to the exact Atlas hostname and `atlas-query` action. The server validates the single-use token before consuming model budget. Cloudflare-native rate-limit bindings, same-origin enforcement, CSP/HSTS, streaming input bounds, global deadlines, concurrency slots, and per-process quotas provide additional layers.
