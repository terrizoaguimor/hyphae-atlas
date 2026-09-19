# Architecture and trust boundaries

## Runtime

```text
Browser -> Next.js `/api/agent` -> Grok/xAI -> Sanity Context MCP -> Knowledge Base
```

The browser sends only a bounded query object. API keys and Context credentials remain in the server process.

## Retrieval modes

### Final: `sanity-context-mcp`

Grok receives one remote MCP definition with an allowlist of `initial_context` and `knowledge_base_read`. The system prompt requires orientation through the outline before reading the smallest sufficient set of entries. Context remains read-only.

### Development: `sanity-dataset-preview`

When Context URL/token are absent, the backend retrieves only the structured records for the selected mode from the Sanity dataset and includes them as bounded inline context. The UI displays a warning. This mode enables development but is not final challenge compliance.

## Trust boundaries

1. User input is validated with a strict schema and length limits.
2. Retrieved content is explicitly treated as untrusted data.
3. The model cannot change the source authority hierarchy.
4. Tool access is closed to two read-only Knowledge Base tools.
5. Model output is parsed and validated before returning to the browser.
6. Error messages pass through secret redaction.
7. An in-memory request window limits casual public abuse; production hosting should add a durable edge limiter if traffic requires it.

## Failure behavior

- Missing final Context credentials selects labeled preview mode.
- Invalid input returns HTTP 400.
- Oversized bodies return HTTP 413.
- Rate-limit exhaustion returns HTTP 429.
- Model, Context, parsing, or validation failures return a redacted HTTP 502.
- Missing evidence should produce `unknown` or `unproven`, not a guessed answer.

## Optional extension

A read-only Hyphae Native MCP may later report capabilities of a controlled live instance. Sanity Context remains the documentation authority; the Native MCP would represent observed instance state. This extension is intentionally outside the MVP until the final Context path passes.

## Proof Path

After model output passes its schema, `evidence-resolver.ts` resolves Knowledge Base citation labels, generated entry paths, and structured Atlas document IDs to `sourceDocument` references in Sanity. The result is a deterministic list of upstream URLs, commits, SHA-256 digests, licenses, lifecycle states, authority ranks, and match reasons.

`POST /api/evidence/verify` never accepts an arbitrary URL. It accepts only a namespaced source ID, reloads trusted metadata from Sanity, validates commit/path shape, constructs an allowlisted raw GitHub URL, enforces a 700 KB limit and 20-second timeout, and compares SHA-256 bytes. This avoids SSRF and prevents the browser or model from selecting the verification target.

## Replays and trace

Six live runs are captured by `npm run replays:capture`: migration, capability, and claim in English and Spanish. Replays store no tokens and retain the exact report, operational tool trace, resolved source ledger, and capture time. Live mode remains available.

The visible trace reports tools and data-flow events only. It never exposes hidden chain of thought. Its four stages are Context orientation, Knowledge Base retrieval, deterministic evidence resolution, and report-contract validation.

## Audited grounding

The model's source labels do not establish grounding by themselves. Atlas records the actual xAI MCP call arguments, repeats the observed `knowledge_base_read` calls directly against Sanity Context, and builds an auditable corpus from the returned text. A finding passes only when at least one of its citation labels appears in that retrieved corpus and resolves through canonical Sanity relationships to an upstream source document. Model-provided HTTP links are not rendered.

## Admission and cancellation

The public route applies a cheap admission bucket before body parsing, then streams at most 16 KiB for five seconds. Only a valid query consumes the expensive per-client/global model budget or concurrency slot. Browser abort signals propagate to xAI, the direct Context audit, and Sanity resolution; a cancellation smoke verifies HTTP 499 in under five seconds and slot release.

In-process limits are defense in depth. A deployed multi-instance service still requires a provider/edge durable rate policy. The Next.js route declares a 300-second maximum duration.

## Least privilege

Production receives only an xAI model key, organization Context Viewer token, and project Viewer token. Editor and Deploy Studio credentials are reserved for offline import and operator deployment and must not be configured in the web runtime.
