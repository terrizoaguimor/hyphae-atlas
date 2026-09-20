import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import path from "node:path";
import {readFile} from "node:fs/promises";
import {z} from "zod";

export const MAX_SOURCE_BYTES = 700_000;
export const corpusManifestSchema = z.object({
  version: z.literal(2),
  repository: z.string().url(),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  sources: z.array(z.object({
    path: z.string().min(1),
    kind: z.string().min(1),
    format: z.enum(["markdown", "json", "yaml"]),
    license: z.string().min(1),
    authorityDomains: z.array(z.string().min(1)).min(1),
    authorityRank: z.number().int().min(0).max(100),
    lifecycleStatus: z.enum(["published", "historical", "unreleased", "draft"]),
    versionScope: z.array(z.string().min(1)).min(1),
  })).length(20),
});
export type CorpusManifest = z.infer<typeof corpusManifestSchema>;
export type PinnedSource = CorpusManifest["sources"][number] & {title: string; content: string; contentDigest: string};

export function sha256(value: string | Buffer): string {return createHash("sha256").update(value).digest("hex");}
export function deterministicSourceId(sourcePath: string): string {return `hyphaeAtlas.source.${sha256(sourcePath).slice(0, 24)}`;}
function title(content: string, fallback: string): string {return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;}
function assertSafePath(sourcePath: string) {
  if (path.posix.isAbsolute(sourcePath) || sourcePath.includes("\\") || path.posix.normalize(sourcePath) !== sourcePath || sourcePath.split("/").includes("..")) throw new Error(`Unsafe manifest source path: ${sourcePath}`);
}

export async function readCorpusManifest(manifestPath = path.resolve(process.cwd(), "corpus/manifest.json")): Promise<CorpusManifest> {
  return corpusManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
}

export function resolvePinnedCommit(root: string, manifest: CorpusManifest): string {
  const requested = process.env.HYPHAE_SOURCE_COMMIT;
  if (requested && requested !== manifest.commit) throw new Error(`HYPHAE_SOURCE_COMMIT must match the reviewed manifest pin ${manifest.commit}`);
  const resolved = execFileSync("git", ["rev-parse", `${manifest.commit}^{commit}`], {cwd: root, encoding: "utf8"}).trim();
  if (resolved !== manifest.commit) throw new Error(`Reviewed source pin resolved unexpectedly: ${resolved}`);
  return resolved;
}

export function loadPinnedSources(root: string, manifest: CorpusManifest): PinnedSource[] {
  const commit = resolvePinnedCommit(root, manifest);
  return manifest.sources.map((entry) => {
    assertSafePath(entry.path);
    const bytes = execFileSync("git", ["show", `${commit}:${entry.path}`], {cwd: root, encoding: "buffer", maxBuffer: MAX_SOURCE_BYTES + 1});
    if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error(`Source exceeds ${MAX_SOURCE_BYTES} bytes: ${entry.path}`);
    const content = new TextDecoder("utf-8", {fatal: true}).decode(bytes);
    return {...entry, title: title(content, path.posix.basename(entry.path)), content, contentDigest: sha256(bytes)};
  });
}
