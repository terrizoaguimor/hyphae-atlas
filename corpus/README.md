# Corpus provenance

`manifest.json` is the closed-world allowlist for Hyphae Atlas ingestion. Each entry declares path, format, license, authority domains, authority rank, lifecycle status, and version scope.

## Import guarantees

- Paths are resolved through `realpath` and must remain under `HYPHAE_SOURCE_PATH`.
- Files larger than 700 KB are rejected.
- Source content receives a SHA-256 digest and immutable commit URL.
- Sanity IDs are deterministic and namespaced under `hyphaeAtlas.*`.
- Repeated imports replace the same documents instead of creating duplicates.
- The transaction checks the non-Atlas document count before and after mutation.
- Local receipts are written under ignored `artifacts-local/` with owner-only permissions.

## Initial corpus

The first build contains 20 sources and 13 curated structured records. It covers product claims, capabilities, transaction semantics, bounded SQL, native directory migration, MCP contracts, access control, gates, release receipts, compatibility fixtures, and licensing.

The corpus intentionally excludes the complete Rust source tree, binary fixtures, `.env`, `.git`, `target`, local service artifacts, and data directories.

## Updating

1. Add a source to `manifest.json` with correct license and lifecycle status.
2. Run `npm run corpus:dry`.
3. Review the generated count and source commit.
4. Run `npm run corpus:import`.
5. Run `npm run corpus:verify`.
6. Rebuild the Sanity Knowledge Base and review new issues before treating the source as authoritative.
