# Content authority policy

Authority is domain-specific. A single global score cannot decide every conflict.

| Question domain | Primary authority |
|---|---|
| Permitted public wording | `docs/product/claims.md` |
| Wire/API behavior | Machine contracts and normative specifications |
| Published capability | Capability matrix constrained by applicable contracts and release identity |
| Publication state | Exact release receipt |
| Gate closure | Machine closure artifact bound to the exact commit |
| Historical compatibility | Immutable fixtures and compatibility tests |
| Operational guidance | Applicable normative operational specification |
| Future work | Roadmap/unreleased material, never evidence of publication |

## Lifecycle rules

- `published` may establish a capability only within its version and evidence scope.
- `historical` explains past behavior but does not override a current version.
- `unreleased` can explain intent or a candidate, never availability in a published binary.
- `draft` is non-authoritative.

## Conflict handling

Atlas must preserve both claims when sources differ, identify their scopes, and explain which source governs the question. If the selected corpus contains no rule that resolves the conflict, the verdict is `unknown` or `unproven`.

## Non-claims enforced by the agent

- Snapshot isolation is not serializability.
- Bounded SQL is not universal SQL or PostgreSQL compatibility.
- Single-node local-first is not replication, clustering, or distributed execution.
- Virtualized operational evidence is not portable, dedicated-hardware, or universal latency certification.
- A roadmap or candidate runtime is not a published feature.


## Human conflict adjudications

A `conflictAdjudication` is a human-reviewed, source-linked authority decision. It may resolve precedence only within its declared domain, version, environment, and applicability rows; it cannot generalize a scoped gate or receipt into a portable claim. The G7 adjudication preserves the historical baseline, treats current gate evidence as authority for closure, treats the 3.0.0 receipt as scoped G8 release evidence, and rejects portable or dedicated-hardware latency certification.
