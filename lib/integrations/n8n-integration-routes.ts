/** CRM routes authenticated by N8N / integration shared secret (not session). */
export function isN8nIntegrationRoute(pathname: string): boolean {
  if (pathname === "/api/onboarding/kickoff") return true;
  if (pathname === "/api/opportunities/close-won") return true;
  if (/^\/api\/project-feedback\/[^/]+\/google-review-sent$/.test(pathname)) {
    return true;
  }
  if (/^\/api\/contacts\/[^/]+\/activities$/.test(pathname)) return true;
  if (/^\/api\/contacts\/[^/]+\/calendar-events$/.test(pathname)) return true;
  return false;
}
