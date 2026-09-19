export function combinedDeadline(parent: AbortSignal, timeoutMs: number): {signal: AbortSignal; cleanup: () => void} {
  const controller = new AbortController();
  const relay = () => controller.abort(parent.reason ?? new DOMException("Request aborted", "AbortError"));
  if (parent.aborted) relay(); else parent.addEventListener("abort", relay, {once: true});
  const timeout = setTimeout(() => controller.abort(new DOMException("Agent deadline exceeded", "TimeoutError")), timeoutMs);
  return {signal: controller.signal, cleanup: () => {clearTimeout(timeout); parent.removeEventListener("abort", relay);}};
}
