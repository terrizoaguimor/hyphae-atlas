export class BodyLimitError extends Error {constructor() {super("Request body is too large"); this.name = "BodyLimitError";}}
export class BodyJsonError extends Error {constructor() {super("Request body is not valid JSON"); this.name = "BodyJsonError";}}
export class BodyTimeoutError extends Error {constructor() {super("Request body was not completed in time"); this.name = "BodyTimeoutError";}}

export async function readJsonBody(request: Request, maxBytes: number, timeoutMs = 5_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyLimitError();
  if (!request.body) throw new BodyJsonError();
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0; let timedOut = false; let aborted = request.signal.aborted;
  const cancelForTimeout = () => {timedOut = true; void reader.cancel(new BodyTimeoutError()).catch(() => undefined);};
  const cancelForAbort = () => {aborted = true; void reader.cancel(request.signal.reason).catch(() => undefined);};
  const timeout = setTimeout(cancelForTimeout, timeoutMs); request.signal.addEventListener("abort", cancelForAbort, {once: true});
  try {
    while (true) {const {done, value} = await reader.read(); if (done) break; total += value.byteLength; if (total > maxBytes) {await reader.cancel(); throw new BodyLimitError();} chunks.push(value);}
  } finally {clearTimeout(timeout); request.signal.removeEventListener("abort", cancelForAbort); reader.releaseLock();}
  if (timedOut) throw new BodyTimeoutError();
  if (aborted) throw new DOMException("Request aborted", "AbortError");
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
  try {return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes));} catch {throw new BodyJsonError();}
}
