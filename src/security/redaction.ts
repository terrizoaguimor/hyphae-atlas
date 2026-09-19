const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+\/-]{12,}/gi,
  /(?:token|api[_-]?key|secret)\s*[=:]\s*["']?[A-Za-z0-9._~+\/-]{12,}/gi,
  /xai-[A-Za-z0-9_-]{12,}/gi,
];

export function publicError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unexpected error";
  return SECRET_PATTERNS.reduce((value, pattern) => value.replace(pattern, "[REDACTED]"), raw).slice(0, 500);
}
