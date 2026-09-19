import "dotenv/config";

import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {mkdir, readFile, realpath, stat, writeFile} from "node:fs/promises";
import path from "node:path";
import {createClient, type SanityDocumentStub} from "@sanity/client";

const NAMESPACE = "hyphaeAtlas.";
const DEFAULT_SOURCE_ROOT = path.resolve(process.cwd(), "../hyphae");
const MAX_SOURCE_BYTES = 700_000;

type Format = "markdown" | "json" | "yaml";
type LifecycleStatus = "published" | "historical" | "unreleased" | "draft";
type ManifestSource = {
  path: string;
  kind: string;
  format: Format;
  license: string;
  authorityDomains: string[];
  authorityRank: number;
  lifecycleStatus: LifecycleStatus;
  versionScope: string[];
};
type Manifest = {version: number; repository: string; sources: ManifestSource[]};
type AtlasDocument = SanityDocumentStub & {_id: string; _type: string};

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sourceId(sourcePath: string): string {
  return `${NAMESPACE}source.${digest(sourcePath).slice(0, 24)}`;
}

function ref(id: string, key?: string) {
  return {_type: "reference", _ref: id, ...(key ? {_key: key} : {})};
}

function firstTitle(content: string, fallback: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function requireEnvironment() {
  const required = ["SANITY_PROJECT_ID", "SANITY_DATASET", "SANITY_API_VERSION", "SANITY_WRITE_TOKEN"] as const;
  for (const key of required) if (!process.env[key]) throw new Error(`${key} is required`);
  return {
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET!,
    apiVersion: process.env.SANITY_API_VERSION!,
    token: process.env.SANITY_WRITE_TOKEN!,
  };
}

async function loadSources(root: string, manifest: Manifest, commit: string): Promise<AtlasDocument[]> {
  const canonicalRoot = await realpath(root);
  const documents: AtlasDocument[] = [];
  for (const entry of manifest.sources) {
    const candidate = await realpath(path.resolve(canonicalRoot, entry.path));
    const relative = path.relative(canonicalRoot, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Source escapes root: ${entry.path}`);
    const metadata = await stat(candidate);
    if (!metadata.isFile()) throw new Error(`Source is not a file: ${entry.path}`);
    if (metadata.size > MAX_SOURCE_BYTES) throw new Error(`Source exceeds ${MAX_SOURCE_BYTES} bytes: ${entry.path}`);
    const content = await readFile(candidate, "utf8");
    documents.push({
      _id: sourceId(entry.path),
      _type: "sourceDocument",
      title: firstTitle(content, path.basename(entry.path)),
      sourcePath: entry.path,
      sourceUrl: `${manifest.repository}/blob/${commit}/${entry.path}`,
      sourceRef: commit,
      sourceCommit: commit,
      contentDigest: digest(content),
      format: entry.format,
      documentKind: entry.kind,
      content,
      license: entry.license,
      authorityDomains: entry.authorityDomains,
      authorityRank: entry.authorityRank,
      lifecycleStatus: entry.lifecycleStatus,
      versionScope: entry.versionScope,
      lastVerifiedAt: new Date().toISOString(),
    });
  }
  return documents;
}

function structuredDocuments(sourceDocs: AtlasDocument[]): AtlasDocument[] {
  const sourceByPath = new Map(sourceDocs.map((document) => [String(document.sourcePath), document._id]));
  const source = (sourcePath: string, key?: string) => {
    const id = sourceByPath.get(sourcePath);
    if (!id) throw new Error(`Missing source reference: ${sourcePath}`);
    return ref(id, key ?? digest(sourcePath).slice(0, 12));
  };
  const releaseId = `${NAMESPACE}release.3-0-0`;
  const g7Id = `${NAMESPACE}evidence.g7-c60`;
  const g8Id = `${NAMESPACE}evidence.g8-3-0-0`;

  return [
    {
      _id: releaseId,
      _type: "hyphaeRelease",
      version: "3.0.0",
      releaseDate: "2026-09-04",
      commit: "24bce1accdff8d14127797afe6f237a57c1cd4f3",
      status: "published",
      diskFormats: ["native directory format 1", "legacy format 2 import"],
      protocolMinors: [1, 2, 3, 4, 5, 6],
      summary: "Published Native release with a 24-crate graph, exact-SHA G8 evidence, bounded SQL, structures, lexical/vector search, and local MCP surfaces.",
      publicationReceipt: source("docs/release/receipts/3.0.0.md"),
      sourceDocuments: [source("README.md", "readme"), source("CHANGELOG.md", "changelog"), source("docs/product/native-capabilities.md", "capabilities")],
    },
    {
      _id: g7Id,
      _type: "evidenceArtifact",
      name: "G7 virtualized operational-scale closure",
      artifactType: "gate",
      commit: "ff188af",
      environment: "DigitalOcean C-60 virtual machine",
      assertions: ["11 surfaces and 33 concurrency cells completed", "Functional concurrency, accounting, correctness, ANN recall, and durable recovery were observed"],
      limitations: ["No dedicated-hardware latency certification", "No background-interference certification", "Predates access-control work on later release paths"],
      source: source("docs/gates/native-gate-status.md"),
    },
    {
      _id: g8Id,
      _type: "evidenceArtifact",
      name: "Hyphae 3.0.0 exact-SHA G8 release closure",
      artifactType: "receipt",
      release: ref(releaseId),
      commit: "24bce1accdff8d14127797afe6f237a57c1cd4f3",
      assertions: ["Published release artifacts bind to the exact source commit", "Linux, macOS, and Windows release evidence passed the declared G8 matrix"],
      limitations: ["The publication receipt records observable release state and does not amend the signed closure"],
      digest: "41dacc41bde4420ec3f2d735828669231966dd53c545a2fdd7a6bf0691205ebf",
      source: source("docs/release/receipts/3.0.0.md"),
    },
    {
      _id: `${NAMESPACE}capability.snapshot-isolation`,
      _type: "capability",
      name: "Cross-engine snapshot isolation",
      description: "Relational, structure, and search operations share one global commit sequence with first-committer-wins over logical write identities.",
      introducedIn: ref(releaseId),
      surfaces: ["embedded", "local CLI", "local protocol", "HTTP v2", "Python SDK", "TypeScript SDK"],
      bounds: ["Snapshot isolation, not serializable execution", "Predicate and range conflicts are not detected as serializable conflicts"],
      nonClaims: ["Serializable execution", "Distributed transactions"],
      evidence: [ref(g8Id, "g8")],
      sources: [source("docs/native/mvcc-commit-v1.md", "mvcc"), source("docs/product/claims.md", "claims")],
    },
    {
      _id: `${NAMESPACE}capability.bounded-sql`,
      _type: "capability",
      name: "Indexed fail-closed relational core",
      description: "Hyphae implements a versioned and bounded SQL grammar whose unsupported shapes fail closed rather than silently scanning.",
      introducedIn: ref(releaseId),
      surfaces: ["embedded", "local CLI", "local protocol", "HTTP v2", "Python SDK", "TypeScript SDK"],
      bounds: ["No universal SQL", "No outer joins, UNION, arbitrary subqueries, or expression arithmetic"],
      nonClaims: ["Universal SQL compatibility", "PostgreSQL compatibility"],
      sources: [source("docs/native/sql-semantics-v1.md", "sql"), source("docs/product/claims.md", "claims")],
    },
    {
      _id: `${NAMESPACE}capability.native-mcp`,
      _type: "capability",
      name: "Bounded Native MCP adapter",
      description: "A stdio MCP adapter exposes a fixed bounded tool registry and is read-only unless explicit write flags and matching durable authority are both present.",
      introducedIn: ref(releaseId),
      surfaces: ["stdio MCP"],
      protocolMinors: [2],
      requiredPermissions: ["discover", "security.read", "search.execute", "proof.generate"],
      bounds: ["One active tool call", "4 MiB complete input/output", "Read-only by default"],
      nonClaims: ["Unbounded concurrency", "Prompt-supplied authority escalation"],
      sources: [source("mcp/README.md", "guide"), source("contracts/native-mcp-v2.json", "contract")],
    },
    {
      _id: `${NAMESPACE}compatibility.native-2x-to-3`,
      _type: "compatibilityRule",
      title: "Open a Native 2.x directory with Hyphae 3.0",
      fromVersion: "2.x Native",
      toVersion: "3.0.0 Native",
      direction: "upgrade",
      status: "conditional",
      conditions: ["Open with Hyphae 3.0", "The first accepted mutation upgrades records that 2.x cannot read", "Back up before accepting the first mutation"],
      migrationBehavior: "The 3.0 overview states that every 2.x directory opens on 3.0 and upgrades in place on its first accepted mutation.",
      rollbackEvidence: "The selected sources do not establish that a directory remains readable by 2.x after the first 3.0 mutation; Atlas must not promise downgrade compatibility.",
      sources: [source("README.md", "overview"), source("CHANGELOG.md", "changelog")],
    },
    {
      _id: `${NAMESPACE}compatibility.format2-to-native`,
      _type: "compatibilityRule",
      title: "Import legacy format-2 state into Native",
      fromVersion: "format-2",
      toVersion: "Native directory format 1",
      direction: "import",
      status: "conditional",
      conditions: ["Offline import into a separate pending directory", "Verify semantic equivalence", "Explicitly promote the target"],
      migrationBehavior: "The Native runtime does not open or rewrite a format-2 directory in place. Import creates a pending Native target and promotion atomically publishes its FORMAT marker.",
      rollbackEvidence: "Before promotion, rollback removes the pending target while the read-only format-2 source remains authoritative.",
      fixture: "compatibility/v2/data-directory.json",
      sources: [source("docs/native/directory-format-v1.md", "directory"), source("compatibility/README.md", "fixtures")],
    },
    {
      _id: `${NAMESPACE}claim.serializable`,
      _type: "productClaim",
      statement: "Hyphae provides serializable transaction execution.",
      classification: "prohibited",
      versionScope: ["3.0.0", "Native v1"],
      prohibitedWording: ["serializable", "serializable isolation"],
      requiredQualifiers: ["Use snapshot isolation with first-committer-wins", "Write skew remains possible"],
      sources: [source("docs/product/claims.md", "claims"), source("docs/native/mvcc-commit-v1.md", "mvcc")],
    },
    {
      _id: `${NAMESPACE}claim.universal-sql`,
      _type: "productClaim",
      statement: "Hyphae is universally SQL compatible or a PostgreSQL-compatible database.",
      classification: "prohibited",
      versionScope: ["3.0.0"],
      prohibitedWording: ["universal SQL", "PostgreSQL-compatible", "drop-in replacement"],
      requiredQualifiers: ["Indexed, fail-closed relational core", "Versioned bounded SQL grammar"],
      sources: [source("docs/product/claims.md", "claims"), source("docs/native/sql-semantics-v1.md", "sql")],
    },
    {
      _id: `${NAMESPACE}claim.g7-portable-latency`,
      _type: "productClaim",
      statement: "G7 certifies portable or dedicated-hardware latency for Hyphae 3.0.0.",
      classification: "prohibited",
      versionScope: ["3.0.0"],
      environmentScope: ["DigitalOcean C-60 virtual machine"],
      prohibitedWording: ["portable latency", "dedicated-hardware latency certified", "bare-metal performance certified"],
      requiredQualifiers: ["Virtualized operational-scale evidence", "No latency certification", "The G7 profile predates later access-control work"],
      evidence: [ref(g7Id, "g7")],
      sources: [source("docs/gates/native-gate-status.md", "gates"), source("docs/product/claims.md", "claims"), source("docs/product/native-capabilities.md", "capabilities")],
    },
    {
      _id: `${NAMESPACE}contract.native-mcp-v2`,
      _type: "publicContract",
      name: "Native MCP bounded tool contract",
      contractVersion: "2",
      protocolMinor: 2,
      surface: "stdio MCP",
      operations: ["capabilities", "security status", "security principals", "lexical search", "collection search", "proof generation", "proof verification", "optional ingest", "optional memory"],
      permissions: ["discover", "security.read", "search.execute", "proof.generate", "data.write when explicitly enabled"],
      schemaDigest: String(sourceDocs.find((doc) => doc.sourcePath === "contracts/native-mcp-v2.json")?.contentDigest ?? ""),
      source: source("contracts/native-mcp-v2.json"),
    },
    {
      _id: `${NAMESPACE}contract.http-v2`,
      _type: "publicContract",
      name: "Hyphae Native HTTP v2",
      contractVersion: "v2",
      surface: "loopback-first HTTP",
      operations: ["capabilities", "product operations", "security key lifecycle with dedicated routes"],
      permissions: ["Operation-specific durable authority"],
      schemaDigest: String(sourceDocs.find((doc) => doc.sourcePath === "contracts/openapi/hyphae-v2.yaml")?.contentDigest ?? ""),
      source: source("contracts/openapi/hyphae-v2.yaml"),
    },
  ];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const environment = requireEnvironment();
  const root = path.resolve(process.env.HYPHAE_SOURCE_PATH ?? DEFAULT_SOURCE_ROOT);
  const manifestPath = path.resolve(process.cwd(), "corpus/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.sources) || manifest.sources.length === 0) throw new Error("Unsupported or empty corpus manifest");
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding: "utf8"}).trim();
  const sourceDocs = await loadSources(root, manifest, commit);
  const documents = [...sourceDocs, ...structuredDocuments(sourceDocs)];
  const duplicateIds = documents.map((doc) => doc._id).filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length) throw new Error(`Duplicate document IDs: ${duplicateIds.join(", ")}`);
  if (documents.some((doc) => !doc._id.startsWith(NAMESPACE))) throw new Error("Refusing to import a document outside the Hyphae Atlas namespace");

  const summary = {
    dryRun,
    sourceRoot: root,
    sourceCommit: commit,
    sourceCount: sourceDocs.length,
    structuredCount: documents.length - sourceDocs.length,
    totalDocuments: documents.length,
    types: Object.fromEntries([...new Set(documents.map((doc) => doc._type))].sort().map((type) => [type, documents.filter((doc) => doc._type === type).length])),
  };

  if (!dryRun) {
    const client = createClient({...environment, useCdn: false});
    const before = await client.fetch<number>("count(*[!(_id in path(\"hyphaeAtlas.**\"))])");
    let transaction = client.transaction();
    for (const document of documents) transaction = transaction.createOrReplace(document);
    const result = await transaction.commit({visibility: "sync"});
    const after = await client.fetch<number>("count(*[!(_id in path(\"hyphaeAtlas.**\"))])");
    if (before !== after) throw new Error(`Non-Atlas document count changed from ${before} to ${after}`);
    await mkdir(path.resolve(process.cwd(), "artifacts-local"), {recursive: true});
    await writeFile(path.resolve(process.cwd(), "artifacts-local/import-receipt.json"), JSON.stringify({...summary, transactionId: result.transactionId, nonAtlasDocumentsBefore: before, nonAtlasDocumentsAfter: after, importedAt: new Date().toISOString()}, null, 2) + "\n", {mode: 0o600});
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown import error");
  process.exitCode = 1;
});
