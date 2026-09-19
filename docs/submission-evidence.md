# Submission evidence ledger

Updated: 2026-09-18

## Verified

- Sanity project authentication: HTTP 200.
- Dataset read: HTTP 200.
- Project token write: temporary namespaced document created and removed, HTTP 200 both ways.
- Schema validation: 0 errors, 0 warnings.
- Schema deployment: 1/1 schemas deployed.
- Corpus dry run: 20 source records + 13 structured records.
- Corpus import: completed twice with stable IDs and totals.
- Remote corpus verification: 33 Atlas documents, all expected types present, no missing or invalid sources, no smoke records.
- Existing content preservation: non-Atlas count stable during imports.
- Configured xAI demo provider: authentication, model access, and synthesis verified.
- Provider adapters: mocked transport/auth smoke passes for xAI, OpenAI, Anthropic, and OpenAI-compatible APIs.
- Backend-owned MCP loop: live smoke passes with validated outline selection, direct `initial_context`/`knowledge_base_read`, synthesis, and grounding.
- TypeScript and ESLint: passing at the latest implementation checkpoint.
- Next.js production build: passing; static home page and dynamic `/api/agent` route generated.
- API health handler: HTTP 200 with selected provider, Sanity dataset, and Context configuration detected.
- Sanity Studio deployment: https://hyphae-atlas-v2ulbd4b.sanity.studio/.
- Knowledge Base: `kbIPW9hgRO17`, dataset import complete and build succeeded.
- Live Context smoke: 21 entries, `initial_context` and `knowledge_base_read`, cited upstream evidence, expected unsupported verdict.
- Final strict live Context evaluation: 12/12 passed in one uninterrupted run; 100% verdict accuracy, exact upstream source coverage, required semantic term coverage, per-finding grounding, and Context-tool compliance; zero affirmative prohibited assertions.
- A real source conflict was found: historical performance-target prose versus the current G7 closure. The baseline source was reclassified as historical and the agent authority policy now makes gate/receipt evidence authoritative for closure state.
- Production dependency audit: 0 vulnerabilities.
- Versionable secret-pattern scan: no matches; `.env` is ignored and mode `0600`.
- Submission completeness checklist: all required draft sections and project artifacts present.

## Tooling-only audit note

Sanity Studio/CLI is isolated in `devDependencies`. Its transitive development graph currently reports advisories with contradictory remediation across available Sanity 5.x versions. The deployed Next.js production dependency graph reports zero vulnerabilities. Do not process untrusted archives/YAML through the Studio CLI until upstream advisories are resolved.

## Live Context implementation

- Atlas owns the MCP loop and exposes `initial_context` and `knowledge_base_read` in its operational trace.
- The selected model provider receives only validated outline paths and retrieved text; it never receives the Context token.
- The Knowledge Base contains 21 generated entries from 33 Atlas dataset documents.
- Context smoke passes and observes both required tools.
- The final strict 12-case corpus passed in one uninterrupted run with zero failures.

## Publication status and remaining actions

- ✅ Knowledge Base built and available in Context.
- ✅ Repository published at https://github.com/terrizoaguimor/hyphae-atlas.
- ✅ Replay-ready web application deployed at https://atlas.terrizoaguimor.dev from a secret-scanned OpenNext clean-room build.
- ⏳ Rotate and configure runtime secrets, then perform the remote live-query smoke.
- ⏳ Capture the final Knowledge Base/conflict screenshots and demo video.
- ⏳ Curate and publish an Agent Session after secret review.
- ⏳ Replace video/session placeholders in `submission-draft.md` and publish the DEV post.

## Evidence to capture manually

- Context Dashboard Knowledge Base purpose and source configuration.
- Generated outline.
- A conflict/issue before and after resolution.
- Sanity Studio relationship view.
- Live report showing Context MCP tools.
- Final evaluation summary.
- Deployment URL and clean-browser walkthrough.

## Competitive UX and proof layer

- Six live Context MCP replays captured: migration/capability/claim in EN and ES.
- Every replay contains both required Context tools, four trace stages, and 3–7 resolved upstream sources.
- Evidence Resolver tested on the G7 claim: six upstream sources resolved with commit, digest, license, lifecycle, and authority.
- Live SHA-256 verification tested against `docs/gates/native-gate-status.md`: expected and downloaded digests matched.
- Interactive G7 conflict timeline distinguishes historical target, current closure authority, and scoped 3.0.0 receipt.
- Evaluation Lab exposes the final strict 12/12 uninterrupted run, including 100% exact-source and per-finding grounding coverage and zero affirmative prohibited assertions.
- Desktop and mobile headless screenshots reviewed; first-paint opacity and MCP-header overlap were corrected.

## Final security and grounding hardening

- Broad project token replaced by separate Viewer, Editor/importer, and Deploy Studio tokens; the broad `Dev Challenge` token was revoked.
- Production client requires `SANITY_READ_TOKEN` and cannot fall back to the Editor token.
- Atlas owns `knowledge_base_read`; each finding citation must appear in the exact retrieved tool output before it can resolve.
- Model-provided URLs are not clickable. Only resolver-owned upstream GitHub URLs appear in the evidence ledger.
- Forged citation regression (`https://example.invalid/README.md`) is rejected.
- Body byte limit, five-second completion deadline, post-validation model budgets, two-slot concurrency, and streamed upstream hashing are active.
- Cancellation smoke returns HTTP 499 in roughly 150 ms and confirms slot release.
- Final audited baseline: 12/12 in one run, 12 attempts, zero retries, 100% verdict/source/term/finding/tool coverage, zero affirmative prohibited assertions.


## Cloudflare production controls

- Custom domain: https://atlas.terrizoaguimor.dev.
- OpenNext clean-room build scans 1,221 generated files against local secret values before upload.
- Managed Turnstile widget restricted to the exact Atlas hostname; server checks action, hostname, token age, and single-use Siteverify result.
- Cloudflare bindings: six agent queries/minute and thirty evidence checks/minute per location.
- Same-origin POST enforcement plus hardened compatibility CSP, HSTS, and browser security headers.
- Public replays remain instant and free; only fresh live model queries require Turnstile.
