# Corpus provenance

`manifest.json` is the closed-world allowlist for Hyphae Atlas ingestion. It declares the reviewed upstream commit plus exactly 20 paths, formats, licenses, authority domains/ranks, lifecycle states, and version scopes.

## Import guarantees

- The manifest requires a full 40-character commit pin: `fcccee58a96987867381a5a5fca7cb12dc3bb632`.
- Import and keyword-ablation inputs are read from Git objects with `git show <pin>:<path>`, never from mutable checkout `HEAD` or working-tree bytes.
- `HYPHAE_SOURCE_COMMIT`, when set, must equal the reviewed manifest pin; it cannot silently override it.
- Files larger than 700 KB and unsafe repository paths are rejected.
- Source content receives a SHA-256 digest and immutable commit URL from the same pinned bytes.
- Sanity IDs are deterministic and namespaced under `hyphaeAtlas.*`.
- The G7 human adjudication validates its source snapshot hashes and full canonical decision digest before a document can be generated.
- The adjudication stores the reviewed decision digest plus the deterministic 34-document corpus snapshot digest/commit marker used to bind Context evaluation receipts.
- Repeated imports replace the same documents instead of creating duplicates.
- The transaction checks the non-Atlas document count before and after mutation.
- Local receipts are written under ignored `artifacts-local/` with owner-only permissions.

## Deployed corpus shape

The production dataset contains exactly **20 source documents + 14 structured records = 34 Atlas documents** across eight types. The fourteenth structured record is `conflictAdjudication`, sourced from `adjudications/g7-closure-portability.json` and linked to historical, current-authority, claims-authority, and scoped receipt sources.

The rebuilt Knowledge Base contains 21 generated entries. The corpus intentionally excludes the complete Rust source tree, binary fixtures, `.env`, `.git`, `target`, local service artifacts, and data directories.

## Updating

1. Review a full upstream commit and change the single manifest pin deliberately.
2. Recompute and review adjudication snapshot digests when any referenced source changes.
3. Run `npm run corpus:dry` and confirm the pin, 20 sources, 14 structured records, 34 total documents, and deterministic `corpusSnapshotDigest`.
4. Deploy the schema explicitly; dry-run does not deploy it.
5. Run `npm run corpus:import`, then `npm run corpus:verify`; verification compares every canonical adjudication field, exact ordered applicability rows/source sets, source snapshot digests, and the full corpus snapshot digest.
6. Rebuild the Sanity Knowledge Base, confirm its adjudication marker entry exposes the corpus commit/digest/count, and create a reviewed Context snapshot receipt before any competitive Context ablation.
7. Recapture affected replays and review new issues before treating the source as authoritative.
