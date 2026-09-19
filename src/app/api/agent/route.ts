import {NextResponse} from "next/server";
import {ZodError} from "zod";
import {runAtlasAgent, agentConfiguration} from "@/agent/sanity-context";
import {atlasQuerySchema} from "@/agent/report-schema";
import {ModelProviderError} from "@/agent/providers";
import {readJsonBody, BodyJsonError, BodyLimitError, BodyTimeoutError} from "@/security/body";
import {REQUEST_LIMITS} from "@/security/limits";
import {acquireAgentSlot, clientIdentity, consumeRateLimit} from "@/security/rate-limit";
import {publicError} from "@/security/redaction";
import {consumeCloudflareLimit} from "@/security/cloudflare-rate-limit";
import {combinedDeadline} from "@/security/deadline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {return NextResponse.json({status: "ok", ...agentConfiguration()});}
function rateResponse(resetAt: number) {const retryAfter = String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000))); return NextResponse.json({error: "Live-query budget reached. Use an instant replay or retry after the window resets.", retryAfterSeconds: Number(retryAfter)}, {status: 429, headers: {"Retry-After": retryAfter}});}

export async function POST(request: Request) {
  const identity = clientIdentity(request);
  const admissionRate = consumeRateLimit("agent-admission", identity, {limit: 60, windowMs: 60_000});
  if (!admissionRate.allowed) return rateResponse(admissionRate.resetAt);

  let input;
  try {input = atlasQuerySchema.parse(await readJsonBody(request, REQUEST_LIMITS.maxBodyBytes, 5_000));}
  catch (error: unknown) {
    if (error instanceof BodyLimitError) return NextResponse.json({error: error.message}, {status: 413});
    if (error instanceof BodyTimeoutError) return NextResponse.json({error: error.message}, {status: 408});
    if (error instanceof BodyJsonError) return NextResponse.json({error: error.message}, {status: 400});
    if (error instanceof ZodError) return NextResponse.json({error: "Invalid request", issues: error.issues.map((issue) => ({path: issue.path.join("."), message: issue.message}))}, {status: 400});
    if (error instanceof DOMException && error.name === "AbortError") return new NextResponse(null, {status: 499});
    return NextResponse.json({error: "Request admission failed"}, {status: 400});
  }

  const edgeRate = await consumeCloudflareLimit("AGENT_RATE_LIMITER", "global-live-query-budget");
  if (!edgeRate.allowed) return NextResponse.json({error: edgeRate.available ? "Cloudflare live-query rate limit reached. Use an instant replay or retry shortly." : "Cloudflare rate-limit binding is unavailable; live queries fail closed."}, {status: edgeRate.available ? 429 : 503, headers: {"Retry-After": "60"}});
  const clientRate = consumeRateLimit("agent-client", identity, {limit: REQUEST_LIMITS.agentRequestsPerWindow, windowMs: REQUEST_LIMITS.agentWindowMs});
  if (!clientRate.allowed) return rateResponse(clientRate.resetAt);
  const globalRate = consumeRateLimit("agent-global", "all", {limit: REQUEST_LIMITS.globalRequestsPerWindow, windowMs: REQUEST_LIMITS.globalWindowMs});
  if (!globalRate.allowed) return rateResponse(globalRate.resetAt);
  const release = acquireAgentSlot(REQUEST_LIMITS.maxConcurrentAgentRequests);
  if (!release) return NextResponse.json({error: "Atlas is already processing the maximum number of live reports. Use an instant replay or retry shortly."}, {status: 503, headers: {"Retry-After": "20"}});
  const deadline = combinedDeadline(request.signal, 285_000);

  try {
    const result = await runAtlasAgent(input, deadline.signal);
    return NextResponse.json(result, {headers: {"Cache-Control": "no-store", "X-RateLimit-Remaining": String(clientRate.remaining)}});
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") return NextResponse.json({error: "The live report exceeded its 285-second global deadline. Use an instant replay or narrow the question."}, {status: 504});
    if (error instanceof DOMException && error.name === "AbortError") return new NextResponse(null, {status: 499});
    if (error instanceof ModelProviderError && error.status === 429) {
      const retryAfter = error.retryAfter && /^\d+$/.test(error.retryAfter) ? error.retryAfter : "60";
      console.warn("Atlas upstream rate limit:", publicError(error));
      return NextResponse.json({error: `${error.provider} is temporarily rate limited. Use an instant replay or retry shortly.`, retryAfterSeconds: Number(retryAfter)}, {status: 429, headers: {"Retry-After": retryAfter}});
    }
    console.error("Atlas request failed:", publicError(error));
    return NextResponse.json({error: publicError(error)}, {status: 502});
  } finally {deadline.cleanup(); release();}
}
