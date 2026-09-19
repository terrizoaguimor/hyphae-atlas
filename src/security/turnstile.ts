import {randomUUID} from "node:crypto";

type SiteverifyResponse = {success?: boolean; hostname?: string; action?: string; challenge_ts?: string; "error-codes"?: string[]};
export type TurnstileResult = {valid: boolean; reason?: "missing" | "failed" | "hostname" | "action" | "expired" | "configuration"};

export async function verifyTurnstile(token: string | undefined, request: Request, expectedAction: string, signal?: AbortSignal): Promise<TurnstileResult> {
  if (process.env.CLOUDFLARE_DEPLOYMENT !== "true") return {valid: true};
  const secret = process.env.TURNSTILE_SECRET_KEY; const appUrl = process.env.APP_URL;
  if (!secret || !appUrl) return {valid: false, reason: "configuration"};
  if (!token || token.length > 2_048) return {valid: false, reason: "missing"};
  const controller = new AbortController(); const relay = () => controller.abort(signal?.reason);
  if (signal?.aborted) relay(); else signal?.addEventListener("abort", relay, {once: true});
  const timeout = setTimeout(() => controller.abort(new DOMException("Turnstile verification timed out", "TimeoutError")), 10_000);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {method: "POST", headers: {"Content-Type": "application/json", Accept: "application/json"}, body: JSON.stringify({secret, response: token, remoteip: request.headers.get("cf-connecting-ip") ?? undefined, idempotency_key: randomUUID()}), signal: controller.signal, cache: "no-store"});
    if (!response.ok) return {valid: false, reason: "failed"};
    const result = await response.json() as SiteverifyResponse;
    if (!result.success) return {valid: false, reason: "failed"};
    if (result.hostname !== new URL(appUrl).hostname) return {valid: false, reason: "hostname"};
    if (result.action !== expectedAction) return {valid: false, reason: "action"};
    const age = result.challenge_ts ? Date.now() - Date.parse(result.challenge_ts) : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(age) || age < -60_000 || age > 300_000) return {valid: false, reason: "expired"};
    return {valid: true};
  } catch {return {valid: false, reason: "failed"};}
  finally {clearTimeout(timeout); signal?.removeEventListener("abort", relay);}
}
