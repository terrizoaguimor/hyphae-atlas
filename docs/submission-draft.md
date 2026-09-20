*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

Hyphae Atlas is an evidence agent that answers a deliberately difficult class of engineering question: **is this migration, capability statement, or product claim actually supported for the exact release and environment being discussed?**

The subject is [Hyphae](https://github.com/Hyphae-Research-Foundation/hyphae), a local-first data engine. Its public documentation includes release receipts, normative specifications, machine-readable contracts, compatibility fixtures, benchmark gates, current product guidance, historical plans, and unreleased work. Those sources are individually useful, but a keyword match across them is not enough. A fluent answer can still be wrong if it silently mixes releases, treats a historical target as current status, or promotes an unreleased contract to a shipped feature.

Atlas turns that documentation into three focused workflows:

- **Migration Advisor** checks upgrade and import paths, required steps, compatibility boundaries, and explicit non-guarantees.
- **Capability Inspector** verifies whether a capability exists for the named release and surface, including protocol and environment qualifiers.
- **Claim Auditor** tests public wording against authoritative evidence and classifies it as supported, conditional, prohibited, or unproven.

Each response is a structured report rather than a chat paragraph. It contains a verdict, applicability, findings, qualifiers, conflicts, limitations, recommended actions, and an evidence ledger. Every finding must resolve to content actually retrieved from Sanity Context before Atlas will expose an upstream link.

The interface is available in English and Spanish, including generated reports. It includes guided examples, term-level tooltips, an operational MCP trace, an interactive conflict timeline, an Evaluation Lab, and a Three.js/GSAP graph showing the real flow from sources to the Sanity Knowledge Base, Context MCP, configured model, and verdict. Long-running live requests display the current agent stage instead of an unexplained spinner.

There are also six immediate replays: migration, capability, and claim audits in both languages. These are preserved live Context runs, not hand-written sample answers. Each replay retains its capture time, retrieved Knowledge Base paths, four-stage trace, report, and resolved source provenance. Visitors can inspect those without spending model budget, then choose a fresh live query if they want to exercise the complete path.

Hyphae and its source documentation existed before this challenge. For the challenge, I built the Sanity content model, deterministic ingestion pipeline, authority and lifecycle policy, Knowledge Base, backend-owned MCP agent loop, evidence resolver, bilingual application, replay system, evaluation corpus, Cloudflare deployment, and abuse controls.

## Demo

**Live application:** [atlas.terrizoaguimor.dev](https://atlas.terrizoaguimor.dev)

**Judge Mode:** [open the replay-only G7 walkthrough](https://atlas.terrizoaguimor.dev/?judge=conflict&locale=en)

**27-second recording:** [download the captioned Judge Mode walkthrough](https://atlas.terrizoaguimor.dev/demo/hyphae-atlas-judge.webm)

A useful first route through the demo is:

1. Open the Native 2.x to 3.0 migration replay and inspect why the answer separates supported import behavior from guarantees the sources do not make.
2. Open the G7 claim replay and compare the historical target, current gate status, and scoped 3.0.0 release receipt.
3. Use **Proof Path** on any finding to follow its Knowledge Base citation to a commit-pinned source with digest and lifecycle metadata.
4. Run **Verify SHA-256** to compare the imported digest with bytes fetched from the allowlisted upstream repository.
5. Open the Evaluation Lab to inspect the final 12-case baseline and its acceptance criteria.

Fresh live queries use the hosted xAI/Grok 4.6 synthesis provider and require a managed Turnstile check. The six evidence-rich replays remain immediate and challenge-free.

## Code

**Repository:** [github.com/terrizoaguimor/hyphae-atlas](https://github.com/terrizoaguimor/hyphae-atlas)

The repository includes:

- all eight Sanity schema types;
- the closed-world source manifest and idempotent importer;
- the backend-owned Sanity Context client and provider adapters;
- strict report-schema and citation-grounding validation;
- the deterministic evidence resolver and SHA-256 verification endpoint;
- the bilingual Next.js interface and replay data;
- 12 gold evaluation cases and the audited baseline summary;
- security smoke tests and a clean-room Cloudflare deployment script.

The implementation paths that best explain the agent are `src/agent/context-client.ts`, `src/agent/provider-agent.ts`, `src/agent/evidence-resolver.ts`, and `src/app/api/agent/route.ts`. The corpus and final evaluation are reproducible from the scripts documented in the repository.

## How I Used Sanity

Sanity is not a passive CMS in this project. It is the structured evidence layer that makes the verdicts possible.

### A content model for authority, applicability, and provenance

I modeled eight related document types:

1. **Source documents** store repository path, source commit, SHA-256 digest, license, lifecycle, authority domains, and version scope.
2. **Hyphae releases** identify concrete release boundaries.
3. **Capabilities** describe support with explicit applicability.
4. **Compatibility rules** encode supported transitions and constraints.
5. **Product claims** preserve canonical claims and non-claims.
6. **Evidence artifacts** represent gates, fixtures, and release evidence.
7. **Public contracts** capture API and MCP surfaces.
8. **Conflict adjudications** persist reviewed human decisions, exact applicability, and the historical/current/scoped sources they reconcile.

The imported corpus contains 20 curated public source documents and 14 additional structured records, for 34 namespaced Atlas documents in the `production` dataset. The sources cover claim language, the Native capability matrix, SQL and MVCC contracts, directory migration semantics, the Native MCP contract, access control, compatibility fixtures, current gate status, and the exact Hyphae 3.0.0 publication receipt.

The importer uses deterministic `hyphaeAtlas.*` IDs, commit-pinned source URLs, SHA-256 content digests, and idempotent upserts. It also records the non-Atlas document count before and after import so that a corpus refresh cannot silently replace unrelated content. A repeated import produced the same IDs and totals.

### A Sanity Context Knowledge Base with an explicit job

I built the **Hyphae Atlas** Knowledge Base with this purpose:

> Help Hyphae users, maintainers, and auditors determine whether a migration, capability, or technical claim is valid for an exact release, protocol surface, and evidence scope.

The build generated 21 Knowledge Base entries from the 34 Atlas documents. Atlas uses both required Knowledge Base-mode tools:

1. `initial_context` reads the generated outline.
2. `knowledge_base_read` retrieves the smallest sufficient set of relevant entries, batching related evidence where possible.

The authority policy is as important as retrieval. Atlas distinguishes published, historical, and unreleased material; prefers current gate records for gate status; uses release receipts for what a release actually proves; uses machine contracts for API behavior; preserves benchmark environment and commit qualifiers; and returns `unknown` or `unproven` when the evidence cannot support a safe affirmative answer.

### The provider-agnostic agent loop

Atlas owns the MCP workflow on the server instead of delegating it to a provider-specific remote connector:

1. The backend calls `initial_context`.
2. The configured model selects between one and eight relevant outline paths.
3. Atlas rejects any selected path that is not present in that live outline.
4. The backend calls `knowledge_base_read` for the validated paths.
5. The model receives those retrieved entries and produces a schema-constrained report.
6. Atlas checks every finding citation against the exact retrieved text, then resolves trusted provenance through Sanity relationships.

This boundary keeps the Sanity Context credential away from the model provider and makes the tool trace consistent across adapters. Atlas supports xAI, OpenAI, Anthropic, and HTTPS OpenAI-compatible APIs. The hosted demo and final live 12-case baseline use xAI/Grok 4.6. The other adapters passed mocked authentication, transport, and payload smoke tests; I am not presenting those as live-provider evaluations.

### Proof Path: citation to immutable upstream evidence

A Knowledge Base citation may be an internal label such as `Native gate status — Dataset`. That label alone should not become a clickable source.

After synthesis, the deterministic Evidence Resolver requires the citation to have appeared in the actual `knowledge_base_read` output. It then follows the known Knowledge Base entry and Sanity document relationships to the canonical `sourceDocument`. Only resolver-owned URLs are rendered. Model-provided URLs never become links.

The resulting evidence row exposes:

- the original public GitHub path;
- the exact imported commit;
- expected SHA-256 digest;
- source license;
- lifecycle state;
- authority rank and applicability.

The **Verify SHA-256** endpoint accepts a namespaced Sanity source ID, reloads trusted provenance from Sanity, constructs an allowlisted `raw.githubusercontent.com/Hyphae-Research-Foundation/hyphae` URL, downloads a bounded response, and compares the bytes with the imported digest. Verification of `docs/gates/native-gate-status.md` matched byte for byte. A regression case using a forged `https://example.invalid/README.md` citation resolves to nothing.

### A visible trace without pretending schema validation proves truth

Every report exposes a four-stage operational trace:

1. `initial_context` — orient on the live Knowledge Base outline.
2. `knowledge_base_read` — show the exact generated entry paths retrieved.
3. `evidence_resolver` — map grounded citations to canonical source records.
4. `schema_validation` — validate the JSON contract and required source resolution.

This is an audit trace, not private chain of thought. The fourth stage confirms structural and grounding rules; it is not independent factual validation of the verdict.

## The Conflict That Changed the Authority Policy

The most useful failure was a real temporal disagreement around Hyphae's G7 performance gate.

The historical document `docs/performance/microsecond-first.md` says G7 had not passed. The current `docs/gates/native-gate-status.md` records G7 as closed. The scoped `docs/release/receipts/3.0.0.md` provides release and G8 evidence, but it does not document a new dedicated-hardware G7 run for Hyphae 3.0.0.

Collapsing those three statements into “3.0.0 has dedicated-hardware latency certification” would be wrong. The safe conclusion is narrower: **G7 is closed according to the current authoritative gate record, but that closure is not portable proof of dedicated-hardware latency for the 3.0.0 release.**

I reclassified the older target document as historical and made current gate records and scoped receipts authoritative for the claims they actually cover. Atlas now shows the disagreement in an interactive timeline rather than silently discarding the older source. This is the kind of distinction I wanted Sanity's structured relationships and Context retrieval to preserve.

## Evaluation

I wrote 12 gold cases across migration, capability, and claim auditing. Acceptance is stricter than checking whether a model emitted valid JSON. A case passes only when all of these hold:

- the verdict is accepted for the scenario;
- every required upstream source path resolves;
- all required semantic term groups are present;
- every finding citation appeared in the actual `knowledge_base_read` output;
- every finding links to at least one resolved upstream source;
- no prohibited affirmative assertion appears in visible report fields;
- both `initial_context` and `knowledge_base_read` appear in the trace.

The final full run used the hosted xAI configuration and completed all cases in one uninterrupted run:

| Metric | Result |
| --- | ---: |
| Cases passed | 12 / 12 |
| Attempts | 12 |
| Retries | 0 |
| Verdict accuracy | 100% |
| Required upstream source coverage | 100% |
| Required semantic-term coverage | 100% |
| Per-finding grounding | 100% |
| Context tool compliance | 100% |
| Affirmative prohibited assertions | 0 |

The checked-in `evaluation/baseline-summary.json` records the run timestamp, Knowledge Base ID and entry count, exact criteria, and average duration. Earlier development runs exposed timeout, polarity, field-size, and grounding defects; those failures drove the backend-owned MCP and resolver design rather than being hidden behind retries.

I also ran a frozen, reviewed three-arm evidence-compliance ablation over the same 12 cases with one neutral synthesis prompt and no retries. Structured Context passed 11/12 strict checks, deterministic exact lexical retrieval passed 6/12, and the pass-ineligible no-evidence control passed 0/12. Both retrieval arms matched all 12 accepted verdicts; the difference came from required authority-source recall and one exact phrase gate. The UI labels the different resolution policies instead of presenting this as a generic accuracy comparison.

## Reliability, Security, and Abuse Controls

The public application runs on Cloudflare Workers through OpenNext at the custom Atlas domain. The deployment is built from a committed clean clone that does not contain `.env`. Before upload, the deployment script scans 1,221 generated OpenNext files against six local secret values; the deployed build had zero matches. Runtime credentials are Cloudflare encrypted secrets, with separate least-privilege roles for reading, importing, and Studio deployment.

Fresh live queries use layered controls:

- managed Turnstile restricted to the exact `atlas.terrizoaguimor.dev` hostname and `atlas-query` action;
- server-side Siteverify checks for success, action, hostname, age, and single use;
- Cloudflare rate limits of six agent requests per 60 seconds and 30 evidence checks per 60 seconds per location;
- same-origin enforcement for POST requests;
- streaming request-body limits and a five-second body-completion deadline;
- at most two concurrent model requests per process;
- 30-second Sanity Context and 180-second provider timeouts inside a 285-second global deadline;
- cancellation propagation to the provider and Sanity calls;
- HSTS, no-sniff, frame denial, no-referrer, Permissions Policy, COOP, CORP, and a compatibility CSP that permits the inline behavior required by the current Next.js static hydration while disabling script attributes.

I verified the deployed negative paths as well as the happy path: a missing Turnstile token returns HTTP 403, a cross-origin query returns HTTP 403, and remote SHA verification returns HTTP 200 with matching expected and actual digests. Headless browser inspection confirmed that the Turnstile script, widget shell, hidden response field, and disabled-until-verified submit state load correctly. I did not automate human completion of the managed challenge.

## Sanity Project Details

- **Sanity project ID:** `v2ulbd4b`
- **Dataset:** `production`
- **Knowledge Base:** `Hyphae Atlas`
- **Knowledge Base public ID:** `kbIPW9hgRO17`
- **Sanity Studio:** [hyphae-atlas-v2ulbd4b.sanity.studio](https://hyphae-atlas-v2ulbd4b.sanity.studio/)
- **Atlas documents:** 34 across eight schema types
- **Generated Knowledge Base entries:** 21

The Studio exposes the structured Atlas records and their relationships. The public application is the intended inspection path for reports, operational traces, resolved sources, and replay evidence.

## What I Learned

The hard part was not retrieving more text. It was preserving the boundaries that make text applicable.

A performance number without its environment, a capability without its release, a migration rule without its direction, or an unreleased contract without lifecycle status can all produce a confident but unsafe answer. Sanity gave me a way to model those boundaries as content relationships; Context made them retrievable through a generated outline; the backend-owned agent loop let me enforce what the model was allowed to cite; and the resolver connected each accepted finding back to immutable upstream evidence.

The result is intentionally conservative. Atlas will say `unproven` when a claim outruns its receipts, and it will show exactly which evidence forced that decision. For migration and release work, that is more useful than confidence without provenance.
