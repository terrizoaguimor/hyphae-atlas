const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export function validateJudgeBaseUrl(value) {
  const url = value instanceof URL ? value : new URL(value);
  if (!LOOPBACK_HOSTS.has(url.hostname) || !["http:", "https:"].includes(url.protocol)) throw new Error("JUDGE_BASE_URL must use an explicit HTTP(S) loopback origin");
  if (url.username || url.password) throw new Error("JUDGE_BASE_URL must not contain credentials");
  return url;
}

export function judgeRequestDecision(baseUrl, requestUrl, method) {
  const base = validateJudgeBaseUrl(baseUrl);
  const request = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
  const normalizedMethod = String(method).toUpperCase();
  if (request.origin !== base.origin) return {allowed: false, reason: "cross-origin", method: normalizedMethod, url: request.toString()};
  if (!SAFE_METHODS.has(normalizedMethod)) return {allowed: false, reason: "method", method: normalizedMethod, url: request.toString()};
  return {allowed: true, reason: "safe-local-read", method: normalizedMethod, url: request.toString()};
}
