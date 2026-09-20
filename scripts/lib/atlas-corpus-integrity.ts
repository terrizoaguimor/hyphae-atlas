import {createHash} from "node:crypto";

const OMITTED_KEYS = new Set(["_createdAt", "_rev", "_updatedAt", "lastVerifiedAt", "corpusCommit", "corpusDocumentCount", "corpusSnapshotDigest"]);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => !OMITTED_KEYS.has(key) && item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, item]) => [key, canonicalize(item)]));
}

export function atlasCorpusSnapshotDigest(documents: Array<Record<string, unknown> & {_id: string}>): string {
  const ordered = [...documents].sort((left, right) => left._id.localeCompare(right._id, "en")).map(canonicalize);
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}
