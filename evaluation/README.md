# Agent evaluation

The evaluation corpus checks evidence behavior rather than prose style. `cases.json` contains 12 gold cases covering migration, capabilities, claims, released/unreleased boundaries, source requirements, required qualifiers, and prohibited language.

## Scoring

A case passes only when:

- the verdict belongs to the accepted set;
- every required source path appears in the report ledger;
- required concepts appear in the report;
- prohibited assertions do not appear;
- in live Context mode, both `initial_context` and `knowledge_base_read` are observed.

## Commands

```bash
npm run evaluate -- --smoke
npm run evaluate
npm run evaluate -- --case=migration-native-2x-to-3
```

`--smoke` selects one case per mode. Results are stored locally under ignored `evaluation/results/` and must be reviewed for secrets before publication.

## Current live Context result

On 2026-09-19, the final strict full run passed all 12 cases without retry. Verdict accuracy, exact upstream source coverage, required semantic term coverage, per-finding grounding, and Context tool compliance were all 100%; zero affirmative prohibited assertions passed. Every run is retained locally with a timestamp so earlier evaluator and timeout failures remain auditable.

## Public Evaluation Lab

The web interface renders the 12 gold cases with category filters and expandable evidence requirements. It reports the final single-run result and the exact criteria rather than only displaying a vanity pass count.

The same interface offers six real Context MCP replays so judges can inspect complete reports, tool traces, Knowledge Base paths, and resolved upstream provenance without waiting for a fresh model call.
