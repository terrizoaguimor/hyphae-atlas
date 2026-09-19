import {getCloudflareContext} from "@opennextjs/cloudflare";

type BindingName = "AGENT_RATE_LIMITER" | "EVIDENCE_RATE_LIMITER";
type RateLimitBinding = {limit(input: {key: string}): Promise<{success: boolean}>};
type CloudflareBindings = Partial<Record<BindingName, RateLimitBinding>>;

export async function consumeCloudflareLimit(name: BindingName, key: string): Promise<{allowed: boolean; available: boolean}> {
  if (process.env.CLOUDFLARE_DEPLOYMENT !== "true") return {allowed: true, available: false};
  try {
    const context = await getCloudflareContext({async: true});
    const binding = (context.env as unknown as CloudflareBindings)[name];
    if (!binding) return {allowed: false, available: false};
    const result = await binding.limit({key});
    return {allowed: result.success, available: true};
  } catch {
    return {allowed: false, available: false};
  }
}
