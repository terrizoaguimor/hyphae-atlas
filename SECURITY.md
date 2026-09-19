# Security policy

## Credential separation

Hyphae Atlas uses five independent credentials:

| Variable | Minimum role | Where it may run |
|---|---|---|
| `XAI_API_KEY` | xAI model access | Web server only |
| `SANITY_CONTEXT_TOKEN` | Organization Context Viewer | Web server only |
| `SANITY_READ_TOKEN` | Project Viewer | Web server and read-only verification scripts |
| `SANITY_WRITE_TOKEN` | Project Editor | Offline corpus importer only |
| `SANITY_DEPLOY_TOKEN` | Deploy Studio | CI/operator schema and Studio deployment only |

Never configure `SANITY_WRITE_TOKEN` or `SANITY_DEPLOY_TOKEN` in the deployed web application.

## Public API controls

- Request bodies are streamed with byte and completion deadlines.
- Valid expensive requests enter per-client and global budgets only after schema validation.
- At most two model requests run concurrently per process.
- Browser cancellation propagates through the route, xAI, Context audit, and Sanity resolver.
- The public evidence endpoint accepts only namespaced source IDs and constructs a fixed-host GitHub URL from Sanity-owned provenance.
- Upstream verification is streamed into SHA-256 with a 700 KB limit and no redirects.
- Model-provided HTTP citations are never rendered as links; only resolver-owned upstream URLs are clickable.
- Every finding must cite text observed in the actual `knowledge_base_read` output and resolve to at least one upstream `sourceDocument`.

## Deployment requirements

- Add a durable provider/edge rate limit for `/api/agent`; the in-process limiter is defense in depth, not cross-instance authority.
- Configure a function duration of at least 300 seconds.
- Set only the three web-server credentials listed above.
- Rotate any credential that appeared in logs, screenshots, transcripts, or copied environment templates.
- Run `npm run security:smoke`, `npm run cancellation:smoke`, `npm audit --omit=dev`, and a clean live query after deployment.
- Review the public Agent Session and video for secrets before publishing.

## Reporting

Do not include live credentials in an issue. Describe the affected route and reproduction with placeholders, then rotate potentially affected credentials immediately.
