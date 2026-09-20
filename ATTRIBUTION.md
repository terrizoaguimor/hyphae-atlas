# Attribution and source licensing

Hyphae Atlas uses public material from the [Hyphae repository](https://github.com/Hyphae-Research-Foundation/hyphae) as its challenge corpus.

## Upstream work

- Project: Hyphae
- Upstream organization: Hyphae Research Foundation
- Upstream repository: https://github.com/Hyphae-Research-Foundation/hyphae
- Imported source commit: `fcccee58a96987867381a5a5fca7cb12dc3bb632`
- Published 3.0.0 source commit represented in the dataset: `24bce1accdff8d14127797afe6f237a57c1cd4f3`

## License classes

The upstream `LICENSE-POLICY.md` separates material by dominant purpose:

- Software, machine-enforced data, public contracts, schemas, tests, and implementable normative specifications: Apache License 2.0.
- Narrative documentation: Creative Commons Attribution-ShareAlike 4.0 International.
- Hyphae names, logos, and product marks are governed separately and are not granted by those licenses.

Every imported `sourceDocument` stores its source URL, repository path, commit, SHA-256 digest, lifecycle state, authority domain, and license. The complete selection is in `corpus/manifest.json`.

## Challenge boundary

Hyphae itself is preexisting work. Hyphae Atlas adds a new Sanity model, import pipeline, Knowledge Base-oriented authority system, agent runtime, interface, evaluation protocol, and submission documentation. No claim is made that the Hyphae engine was built for the challenge.

No binary compatibility fixtures, private data directories, environment files, credentials, or local build artifacts are copied into the challenge corpus.


## Snapshot pinning

The manifest owns the reviewed import pin. Import and lexical-ablation code reads each allowlisted path from that Git object, so a newer local checkout HEAD or uncommitted working-tree change cannot be mislabeled as the imported snapshot. G7 adjudication source digests are independently checked against those pinned bytes before import.
