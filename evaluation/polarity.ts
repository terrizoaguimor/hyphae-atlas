export function containsAffirmativeTerm(statement: string, term: string): boolean {
  const value = statement.toLowerCase(); const needle = term.toLowerCase(); let index = value.indexOf(needle);
  while (index >= 0) {
    const before = value.slice(0, index); const after = value.slice(index + needle.length);
    const boundaryBefore = Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?"), before.lastIndexOf(";"), before.lastIndexOf("\n"));
    const nextBoundaries = [after.indexOf("."), after.indexOf("!"), after.indexOf("?"), after.indexOf(";"), after.indexOf("\n")].filter((position) => position >= 0);
    const boundaryAfter = nextBoundaries.length ? Math.min(...nextBoundaries) : after.length;
    const prefix = before.slice(boundaryBefore + 1); const suffix = after.slice(0, boundaryAfter); const clause = `${prefix} ${suffix}`;
    const negation = /\b(no|not|never|cannot|can't|does not|is not|isn't|without|prohibited|unsupported|rejects?|outside|non-claims?|must not|cannot be treated|instead of|rather than)\b/;
    const affirmativeBefore = /\b(is|are|provides|supports|offers|implements|guarantees|certifies|allows|can be treated as)\b[^.!?;]{0,90}$/;
    const affirmativeAfter = /^\s*\b(is|are)\s+(supported|provided|implemented|guaranteed|allowed)\b/;
    if (!negation.test(clause) && (affirmativeBefore.test(prefix) || affirmativeAfter.test(suffix))) return true;
    index = value.indexOf(needle, index + needle.length);
  }
  return false;
}

export function findForbiddenAssertions(assertiveFields: string[], forbiddenTerms: string[]): string[] {
  return forbiddenTerms.filter((term) => assertiveFields.some((field) => containsAffirmativeTerm(field, term)));
}
