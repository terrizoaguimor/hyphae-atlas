export function hasAllowedOrigin(request: Request): boolean {
  if (process.env.CLOUDFLARE_DEPLOYMENT !== "true") return true;
  const appUrl = process.env.APP_URL;
  if (!appUrl) return false;
  const expected = new URL(appUrl).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return origin === expected && (!fetchSite || fetchSite === "same-origin");
}
