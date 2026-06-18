import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

interface AuditResult {
  route: string;
  hasOrgFilter: boolean;
  potential_issues: string[];
}

const PUBLIC_ROUTE_HINTS = [
  "/api/auth/",
  "/api/leads/",
  "/api/website/",
  "/api/public/",
  "/api/customer/",
  "/api/webhooks/",
  "/api/integrations/",
  "/api/cron/",
  "/api/quotes/public/",
  "/api/team/invites/",
];

function auditRouteScoping(): AuditResult[] {
  const results: AuditResult[] = [];
  const apiDir = join(process.cwd(), "app/api");

  function walkDir(dir: string, prefix = "") {
    for (const file of readdirSync(dir)) {
      const fullPath = join(dir, file);
      if (statSync(fullPath).isDirectory()) {
        walkDir(fullPath, `${prefix}${file}/`);
      } else if (file === "route.ts") {
        const routePath = `/api/${prefix.replace(/\/$/, "")}`;
        const code = readFileSync(fullPath, "utf-8");
        const hasOrgFilter =
          code.includes("workspaceOwnerId") ||
          code.includes("CLICKIN360_ORG_USER_ID") ||
          code.includes("getClickIn360OrgUserId") ||
          code.includes("requireIntegrationApiAuth") ||
          code.includes("requireWebsiteLeadAuth") ||
          code.includes("requireN8nInternalAuth");

        const issues: string[] = [];
        const isLikelyPublic = PUBLIC_ROUTE_HINTS.some((p) => routePath.startsWith(p));

        if (code.includes(".from(") && !hasOrgFilter && !isLikelyPublic) {
          issues.push("Supabase query without apparent org filter — review manually");
        }

        results.push({ route: routePath, hasOrgFilter, potential_issues: issues });
      }
    }
  }

  walkDir(apiDir);
  return results;
}

const results = auditRouteScoping();
const flagged = results.filter((r) => r.potential_issues.length > 0);

console.log("\n=== Route Scoping Audit ===");
console.log(`Total routes: ${results.length}`);
console.log(`Flagged for review: ${flagged.length}\n`);

for (const r of flagged) {
  console.log(`❌ ${r.route}`);
  for (const issue of r.potential_issues) {
    console.log(`   - ${issue}`);
  }
}

process.exit(flagged.length > 0 ? 1 : 0);
