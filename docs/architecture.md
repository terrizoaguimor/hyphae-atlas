# Architecture and trust boundaries

## Provider-agnostic runtime

```text
Browser
  -> Next.js `/api/agent`
  -> Atlas-owned agent loop
       1. Sanity Context `initial_context`
       2. configured model selects 1–8 exact outline paths
       3. Atlas validates paths against the outline
       4. Sanity Context `knowledge_base_read`
       5. configured model synthesizes structured JSON
       6. Atlas resolves and verifies every finding citation
  -> Evidence report
```

Sanity Context and the MCP trace belong to Atlas, not to a model provider. Providers only need text generation with JSON-capable output. The same loop supports xAI, OpenAI, Anthropic, and HTTPS OpenAI-compatible Chat Completions endpoints.

## Provider adapters

`src/agent/providers/` exposes one `ModelProvider.generate()` contract. `MODEL_PROVIDER` selects:

- `xai`: `XAI_API_KEY` + `XAI_MODEL`; OpenAI-compatible Chat Completions.
- `openai`: `OPENAI_API_KEY` + `OPENAI_MODEL`; Responses API.
- `anthropic`: `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL`; Messages API.
- `openai-compatible`: `MODEL_API_KEY` + `MODEL_NAME` + HTTPS `MODEL_BASE_URL`.

The hosted demo configures xAI, but self-hosters may choose another provider without changing Context, schemas, evaluation, trace, grounding, or UI. Visitors to the hosted demo never provide a key; BYOK happens through server environment variables when self-hosting.

## Retrieval modes

### Final: `sanity-context-mcp`

Atlas calls the hosted read-only MCP itself. It obtains the live outline, validates model-selected paths against that exact outline, and reads the selected entries. The model never receives the Context token and cannot invent a callable path.

### Development: `sanity-dataset-preview`

If Context is absent, the backend can use bounded structured records from the Sanity dataset as an explicitly labeled preview. Live mode is disabled in the UI until the health endpoint confirms Context is configured. Preview mode is not final challenge evidence.

## Proof Path and audited grounding

A model source label does not establish grounding. The final report is accepted only when:

1. every finding contains a citation label;
2. that exact normalized label appears in the text returned by Atlas's own `knowledge_base_read` call;
3. the label resolves unambiguously through canonical Sanity titles, IDs, and relationships;
4. each finding maps to at least one upstream `sourceDocument`.

Basename matching is not authoritative. Duplicate names such as the four `README.md` paths resolve only through unique canonical titles/paths. Model-provided HTTP links are never rendered; only resolver-owned upstream URLs are clickable.

Every resolved source includes path, public URL, commit, SHA-256, license, lifecycle, authority rank, and supported finding indexes.

## SHA-256 verification

`POST /api/evidence/verify` never accepts an arbitrary URL. It accepts one namespaced source ID, reloads trusted metadata from Sanity, validates commit/path shape, and constructs a fixed-host `raw.githubusercontent.com/Hyphae-Research-Foundation/hyphae` URL. Redirects are forbidden; bytes stream into SHA-256 under a 700 KB limit and 20-second timeout.

## Operational trace

The visible trace is operational metadata, not private chain of thought:

1. backend `initial_context` call;
2. backend `knowledge_base_read` call and exact selected paths;
3. evidence resolution count and per-finding coverage;
4. JSON schema and source-resolution validation, explicitly not independent factual validation.

## Admission and cancellation

- A cheap per-client admission bucket precedes parsing.
- Bodies stream under 16 KiB and a five-second completion deadline.
- Expensive per-client/global budgets and concurrency slots are acquired only after schema validation.
- At most two live model reports run per process.
- Browser abort signals propagate through provider requests, Context calls, and Sanity resolver reads.
- Cancellation smoke verifies HTTP 499 and slot release in roughly 150 ms.
- The route declares `maxDuration = 300` and a 285-second global deadline that dominates the serial Context/model stages and leaves cleanup margin.

In-process limits are defense in depth. A multi-instance public deployment still requires a durable provider/edge rate policy.

## Least privilege

Production receives only:

- the selected model provider key;
- organization `Context Viewer` token;
- project `Viewer` token.

Project `Editor` and `Deploy Studio` tokens are reserved for offline import and operator deployment and must not be configured in the web runtime.

## Replays

Six real Context runs—three modes in English and Spanish—are captured as public snapshots. They retain provider/model identity, report, exact Context paths, trace, resolved evidence, and capture time. Replays require no model key and make the public demo immediately usable; live mode remains available.

## Failure behavior

- Invalid/oversized/slow bodies return 400/413/408.
- Rate and concurrency limits return 429/503 with retry guidance.
- Browser cancellation returns 499.
- Provider, Context, parsing, schema, or grounding failures fail closed with redacted errors.
- Missing evidence should produce `unknown` or `unproven`, never a guessed answer.


## Cloudflare deployment

OpenNext packages Next.js for Workers. The clean-room deploy script builds from a committed clone without `.env`, supplies only public metadata, and scans the complete `.open-next` output against local secret values before deployment. Cloudflare rate-limit bindings guard live agent and evidence-verification routes; the existing in-process quotas remain defense in depth.
