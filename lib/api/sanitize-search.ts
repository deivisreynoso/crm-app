/** Strip characters that break PostgREST `.or()` filter syntax. */
export function sanitizeSearchForOrFilter(term: string, maxLength = 80): string {
  return term
    .replace(/[,()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function ilikePattern(term: string): string {
  const safe = sanitizeSearchForOrFilter(term);
  return `%${safe}%`;
}
