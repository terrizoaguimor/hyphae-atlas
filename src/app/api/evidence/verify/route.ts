import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";
import {getSanityClient} from "@/sanity/client";
import {readJsonBody, BodyJsonError, BodyLimitError, BodyTimeoutError} from "@/security/body";
import {REQUEST_LIMITS} from "@/security/limits";
import {clientIdentity, consumeRateLimit} from "@/security/rate-limit";
import {publicError} from "@/security/redaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const inputSchema = z.object({sourceId: z.string().regex(/^hyphaeAtlas\.source\.[a-f0-9]{24}$/)});
const MAX_UPSTREAM_BYTES = 700_000;
type Source = {_id: string; _type: string; title: string; sourcePath: string; sourceCommit: string; contentDigest: string; license: string};

async function hashBoundedResponse(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) throw new Error("Upstream source returned no body");
  const reader = response.body.getReader();
  const hash = createHash("sha256");
  let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {await reader.cancel(); throw new BodyLimitError();}
      hash.update(value);
    }
  } finally {reader.releaseLock();}
  return hash.digest("hex");
}

export async function POST(request: Request) {
  const rate = consumeRateLimit("evidence", clientIdentity(request), {limit: REQUEST_LIMITS.verificationRequestsPerWindow, windowMs: REQUEST_LIMITS.verificationWindowMs});
  if (!rate.allowed) return NextResponse.json({error: "Verification rate limit exceeded"}, {status: 429});
  try {
    const {sourceId} = inputSchema.parse(await readJsonBody(request, REQUEST_LIMITS.maxVerificationBodyBytes, 3_000));
    const source = await getSanityClient().fetch<Source | null>(`*[_id == $sourceId && _type == "sourceDocument"][0]{_id,_type,title,sourcePath,sourceCommit,contentDigest,license}`, {sourceId});
    if (!source) return NextResponse.json({error: "Source not found"}, {status: 404});
    if (!/^[a-f0-9]{40}$/.test(source.sourceCommit) || source.sourcePath.includes("..") || source.sourcePath.startsWith("/")) return NextResponse.json({error: "Source provenance is invalid"}, {status: 422});

    const rawUrl = `https://raw.githubusercontent.com/Hyphae-Research-Foundation/hyphae/${source.sourceCommit}/${source.sourcePath.split("/").map(encodeURIComponent).join("/")}`;
    const controller = new AbortController();
    const abortFromRequest = () => controller.abort(request.signal.reason);
    if (request.signal.aborted) abortFromRequest(); else request.signal.addEventListener("abort", abortFromRequest, {once: true});
    const timeout = setTimeout(() => controller.abort(new DOMException("Verification timed out", "TimeoutError")), 20_000);
    try {
      const upstream = await fetch(rawUrl, {signal: controller.signal, redirect: "error", cache: "no-store", headers: {Accept: "text/plain, application/json, application/yaml"}});
      if (!upstream.ok) return NextResponse.json({error: `Upstream source returned HTTP ${upstream.status}`, verified: false}, {status: 502});
      const declaredLength = Number(upstream.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_UPSTREAM_BYTES) return NextResponse.json({error: "Upstream source exceeds verification limit"}, {status: 413});
      const actualDigest = await hashBoundedResponse(upstream, MAX_UPSTREAM_BYTES);
      const verified = actualDigest === source.contentDigest;
      return NextResponse.json({verified, sourceId: source._id, title: source.title, path: source.sourcePath, commit: source.sourceCommit, expectedDigest: source.contentDigest, actualDigest, license: source.license, verifiedAt: new Date().toISOString()}, {status: verified ? 200 : 409, headers: {"Cache-Control": "no-store", "X-RateLimit-Remaining": String(rate.remaining)}});
    } finally {clearTimeout(timeout); request.signal.removeEventListener("abort", abortFromRequest);}
  } catch (error: unknown) {
    if (error instanceof BodyLimitError) return NextResponse.json({error: "Request or upstream body exceeds its limit"}, {status: 413});
    if (error instanceof BodyTimeoutError) return NextResponse.json({error: error.message}, {status: 408});
    if (error instanceof BodyJsonError) return NextResponse.json({error: error.message}, {status: 400});
    if (error instanceof ZodError) return NextResponse.json({error: "Invalid source verification request"}, {status: 400});
    return NextResponse.json({error: publicError(error)}, {status: 502});
  }
}
