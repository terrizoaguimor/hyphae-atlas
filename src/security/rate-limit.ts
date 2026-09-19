import {createHash} from "node:crypto";

type Bucket = {count: number; resetAt: number};
type RatePolicy = {limit: number; windowMs: number};
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;
let lastCleanup = 0;
let activeAgentRequests = 0;

export function clientIdentity(request: Request): string {
  const headers = request.headers;
  let address = "";
  if (process.env.CLOUDFLARE_DEPLOYMENT === "true" || process.env.CF_PAGES || process.env.CLOUDFLARE) address = headers.get("cf-connecting-ip")?.trim() ?? "";
  else if (process.env.VERCEL === "1") address = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "";
  else if (process.env.NODE_ENV !== "production") address = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  else address = "shared-production";
  const safeAddress = /^[a-fA-F0-9:.]{1,64}$/.test(address) ? address : "shared-production";
  return createHash("sha256").update(safeAddress).digest("hex");
}

export function consumeRateLimit(scope: string, key: string, policy: RatePolicy, now = Date.now()) {
  if (now - lastCleanup > 60_000) {for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey); lastCleanup = now;}
  const composite = `${scope}:${key}`;
  const existing = buckets.get(composite);
  if (!existing && buckets.size >= MAX_BUCKETS) return {allowed: false, remaining: 0, resetAt: now + policy.windowMs};
  const bucket = !existing || existing.resetAt <= now ? {count: 0, resetAt: now + policy.windowMs} : existing;
  bucket.count += 1; buckets.set(composite, bucket);
  return {allowed: bucket.count <= policy.limit, remaining: Math.max(0, policy.limit - bucket.count), resetAt: bucket.resetAt};
}

export function acquireAgentSlot(maximum = 2): (() => void) | null {
  if (activeAgentRequests >= maximum) return null;
  activeAgentRequests += 1;
  let released = false;
  return () => {if (!released) {released = true; activeAgentRequests = Math.max(0, activeAgentRequests - 1);}};
}
