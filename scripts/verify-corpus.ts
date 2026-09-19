import "dotenv/config";

import {readFile} from "node:fs/promises";
import path from "node:path";
import {createClient} from "@sanity/client";

type Manifest = {sources: Array<{path: string}>};
type AtlasDocument = {_id: string; _type: string; sourcePath?: string; contentDigest?: string; lifecycleStatus?: string};

async function main() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET;
  const apiVersion = process.env.SANITY_API_VERSION;
  const token = process.env.SANITY_READ_TOKEN;
  if (!projectId || !dataset || !apiVersion || !token) throw new Error("Sanity read-only environment is incomplete");

  const manifest = JSON.parse(await readFile(path.resolve(process.cwd(), "corpus/manifest.json"), "utf8")) as Manifest;
  const client = createClient({projectId, dataset, apiVersion, token, useCdn: false});
  const documents = await client.fetch<AtlasDocument[]>("*[_id in path(\"hyphaeAtlas.**\")]{_id,_type,sourcePath,contentDigest,lifecycleStatus}");
  const sourceDocuments = documents.filter((document) => document._type === "sourceDocument");
  const sourcePaths = new Set(sourceDocuments.map((document) => document.sourcePath));
  const missingSources = manifest.sources.map((source) => source.path).filter((sourcePath) => !sourcePaths.has(sourcePath));
  const invalidSources = sourceDocuments.filter((document) => !document.contentDigest || !document.lifecycleStatus || !document.sourcePath).map((document) => document._id);
  const expectedTypes = ["sourceDocument", "hyphaeRelease", "capability", "compatibilityRule", "productClaim", "evidenceArtifact", "publicContract"];
  const missingTypes = expectedTypes.filter((type) => !documents.some((document) => document._type === type));
  const smokeDocuments = documents.filter((document) => document._type === "hyphaeAtlasSmoke");
  const nonAtlasCount = await client.fetch<number>("count(*[!(_id in path(\"hyphaeAtlas.**\"))])");
  const result = {
    valid: missingSources.length === 0 && invalidSources.length === 0 && missingTypes.length === 0 && smokeDocuments.length === 0,
    atlasDocumentCount: documents.length,
    sourceDocumentCount: sourceDocuments.length,
    nonAtlasDocumentCount: nonAtlasCount,
    typeCounts: Object.fromEntries(expectedTypes.map((type) => [type, documents.filter((document) => document._type === type).length])),
    missingSources,
    invalidSources,
    missingTypes,
    smokeDocumentCount: smokeDocuments.length,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
