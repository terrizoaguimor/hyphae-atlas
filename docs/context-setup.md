# Complete Sanity Context setup

Context can be managed from the current Sanity Dashboard or with the current `sanity context` CLI. This project used the CLI to inspect the dataset import and run the Knowledge Base build, while the Dashboard remains useful for reviewing entries and issues.

## 1. Enable Context

1. Open the Sanity organization in Manage.
2. Open Labs.
3. Enable Sanity Context and Knowledge Bases if they are not already enabled.

## 2. Confirm the schema and content

The schema is already deployable from this repository and the importer creates the Atlas namespace. Verify in Studio that these types exist:

- Source document
- Hyphae release
- Capability
- Compatibility rule
- Product claim
- Evidence artifact
- Public contract

Run `npm run corpus:verify`; it must pass before building the Knowledge Base.

## 3. Create the Knowledge Base

In Dashboard → Context:

- Title: `Hyphae Atlas`
- Purpose: `Help Hyphae users, maintainers, and auditors determine whether a migration, capability, or technical claim is valid for an exact release, protocol surface, and evidence scope.`
- Source: the configured Sanity project and dataset.
- Scope the source to Atlas records if the UI provides a filter: `_id in path("hyphaeAtlas.**")`.

Build it and review the outline. Ensure release, migration, capability, claim, evidence, contract, and source topics are navigable.

## 4. Add authority instructions

Add the rules from `docs/content-authority.md`, especially:

- distinguish published, historical, and unreleased;
- use canonical claims for wording;
- use contracts for API behavior;
- retain performance environment/commit qualifiers;
- return unknown when evidence is insufficient.

Resolve at least one surfaced issue and record screenshots for the submission.

## 5. Create the MCP

- Name: `hyphae-atlas` (endpoint names cannot be changed later).
- Mode/source: attach the Hyphae Atlas Knowledge Base.
- Tools: keep the Knowledge Base defaults.
- Save and copy the endpoint URL into `SANITY_CONTEXT_MCP_URL`.

## 6. Create the organization token

In Manage → API → Tokens at organization level:

- Create a dedicated token.
- Permission: `Context Viewer`.
- Store it as `SANITY_CONTEXT_TOKEN` in `.env` and the hosting secret manager.
- Never expose it to browser code, screenshots, commits, or the DEV post.

## 7. Verify

```bash
npm run context:smoke
```

Passing criteria:

- retrieval mode is `sanity-context-mcp`;
- `initial_context` is observed;
- `knowledge_base_read` is observed;
- verdict is returned;
- at least one source is cited.

Then run the complete baseline:

```bash
npm run evaluate
```

Do not publish preview-mode evaluation as Context MCP evidence.
