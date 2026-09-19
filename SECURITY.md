# Security policy

## Credential separation

Hyphae Atlas uses one selected model-provider credential plus four separated Sanity credentials:

| Variable | Minimum role | Where it may run |
|---|---|---|
| `XAI_API_KEY` **or** `OPENAI_API_KEY` **or** `ANTHROPIC_API_KEY` **or** `MODEL_API_KEY` | Selected model provider access | Web server only |
| `SANITY_CONTEXT_TOKEN` | Organization Context Viewer | Web server only |
| `SANITY_READ_TOKEN` | Project Viewer | Web server and read-only verification scripts |
| `SANITY_WRITE_TOKEN` | Project Editor | Offline corpus importer only |
| `SANITY_DEPLOY_TOKEN` | Deploy Studio | CI/operator schema and Studio deployment only |

Never configure `SANITY_WRITE_TOKEN` or `SANITY_DEPLOY_TOKEN` in the deployed web application.

## Public API controls

- Request bodies are streamed with byte and completion deadlines.
- Valid expensive requests enter per-client and global budgets only after schema validation.
- At most two model requests run concurrently per process.
- Browser cancellation propagates through the route, selected model provider, Context calls, and Sanity resolver.
- The public evidence endpoint accepts only namespaced source IDs and constructs a fixed-host GitHub URL from Sanity-owned provenance.
- Upstream verification is streamed into SHA-256 with a 700 KB limit and no redirects.
- Model-provided HTTP citations are never rendered as links; only resolver-owned upstream URLs are clickable.
- Every finding must cite text observed in the actual `knowledge_base_read` output and resolve to at least one upstream `sourceDocument`.

## Deployment requirements

- Add a durable provider/edge rate limit for `/api/agent`; the in-process limiter is defense in depth, not cross-instance authority.
- Configure a function duration of at least 300 seconds; the app enforces a 285-second global deadline to preserve cleanup margin.
- Set only the three web-server credentials listed above.
- Rotate any credential that appeared in logs, screenshots, transcripts, or copied environment templates.
- Run `npm run security:smoke`, `npm run cancellation:smoke`, `npm audit --omit=dev`, and a clean live query after deployment.
- Review the public Agent Session and video for secrets before publishing.

## Reporting

Do not include live credentials in an issue. Describe the affected route and reproduction with placeholders, then rotate potentially affected credentials immediately.


## Cloudflare controls

`wrangler.jsonc` declares provider-native rate-limit bindings: `AGENT_RATE_LIMITER` allows six live calls per 60 seconds per Cloudflare location, while `EVIDENCE_RATE_LIMITER` allows thirty integrity checks. Routes fail closed if `CLOUDFLARE_DEPLOYMENT=true` and a binding is missing. In-process hourly/client limits remain an additional layer.

Cloudflare builds must use the clean-room deploy script. It clones the committed tree without `.env`, exposes only public build variables, and scans the generated OpenNext bundle for all local secret values before upload.


## Turnstile and browser protocol

Cloudflare live queries require a managed Turnstile widget restricted to `atlas.terrizoaguimor.dev`. Siteverify runs server-side and validates the single-use token, `atlas-query` action, exact hostname, challenge age, and Cloudflare client IP. The secret never enters client code; only the public site key is built into the frontend. Replay mode remains challenge-free because it performs no paid or mutable request.

Both POST routes reject cross-origin requests in Cloudflare production. Global headers enforce HSTS, CSP limited to self plus Cloudflare Turnstile script/frame/connect origins, frame denial, MIME sniffing protection, no-referrer, restricted browser permissions, COOP, and same-origin resource policy.


### CSP limitation

Next.js static hydration currently requires inline framework scripts, so `script-src` retains `'unsafe-inline'`. `script-src-attr 'none'` still blocks inline event handlers, and the application has no user-controlled HTML rendering sink. This is a documented partial XSS defense, not a nonce-based strict CSP claim. A future dynamic nonce deployment can remove the exception after OpenNext compatibility is verified.
