import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  isApiWriteMethod,
  isPublicApiRoute,
  workspaceManageForbidden,
  workspaceOwnerOnlyForbidden,
  workspaceWriteForbidden,
} from "@/lib/api/workspace-guards";
import { setTrustedWorkspaceHeaders } from "@/lib/api/workspace-headers";
import { createServerSideClient } from "@/lib/supabase";
import { resolveWorkspaceContext } from "@/lib/team/workspace";
import { isLocale } from "@/lib/website/i18n";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
} from "@/lib/website/locale-cookie";

const CRM_PROTECTED = [
  "/dashboard",
  "/contacts",
  "/conversations",
  "/opportunities",
  "/tickets",
  "/pipelines",
  "/calendar",
  "/documents",
  "/finances",
  "/analytics",
  "/account",
  "/settings",
  "/quotes",
  "/services",
  "/attachments",
  "/media",
];

function isCrmProtected(pathname: string) {
  return CRM_PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/register" && !req.nextUrl.searchParams.get("invite")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "invite_only");
    return NextResponse.redirect(url);
  }

  const localeSeg = pathname.match(/^\/(en|es)(\/|$)/);
  if (localeSeg && isLocale(localeSeg[1])) {
    const res = NextResponse.next();
    res.cookies.set(LOCALE_COOKIE, localeSeg[1], {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return res;
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (pathname.startsWith("/api/") && isApiWriteMethod(req.method)) {
    if (!isPublicApiRoute(pathname)) {
      const userId =
        (token as { id?: string; sub?: string } | null)?.id ??
        (token as { sub?: string } | null)?.sub;
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const workspace = await resolveWorkspaceContext(userId);

      if (
        workspaceOwnerOnlyForbidden(
          workspace.isWorkspaceOwner,
          pathname,
          req.method
        )
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (
        workspaceManageForbidden(
          workspace.role,
          workspace.isWorkspaceOwner,
          pathname,
          req.method
        )
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (workspaceWriteForbidden(workspace.role, pathname, req.method)) {
        return NextResponse.json(
          { error: "Forbidden", demo: workspace.role === "viewer" },
          { status: 403 }
        );
      }

      const requestHeaders = new Headers(req.headers);
      setTrustedWorkspaceHeaders(requestHeaders, {
        actorUserId: userId,
        workspaceOwnerId: workspace.workspaceOwnerId,
        role: workspace.role,
        isWorkspaceOwner: workspace.isWorkspaceOwner,
      });
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  if (isCrmProtected(pathname)) {
    if (!token) {
      const signIn = new URL("/login", req.url);
      signIn.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signIn);
    }

    const userId =
      (token as { id?: string; sub?: string } | null)?.id ??
      (token as { sub?: string } | null)?.sub;
    const tokenIat = (token as { iat?: number } | null)?.iat;

    if (userId && tokenIat) {
      try {
        const workspace = await resolveWorkspaceContext(userId);
        const supabase = createServerSideClient();
        const { data: settings } = await supabase
          .from("user_settings")
          .select("session_timeout_hours")
          .eq("user_id", workspace.workspaceOwnerId)
          .maybeSingle();
        const hours = settings?.session_timeout_hours as number | null | undefined;
        if (hours && hours > 0) {
          const maxAgeSec = hours * 3600;
          const ageSec = Math.floor(Date.now() / 1000) - tokenIat;
          if (ageSec > maxAgeSec) {
            const signIn = new URL("/login", req.url);
            signIn.searchParams.set("error", "session_expired");
            return NextResponse.redirect(signIn);
          }
        }
      } catch {
        // Non-blocking — allow request if settings lookup fails
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/register",
    "/dashboard",
    "/dashboard/:path*",
    "/contacts",
    "/contacts/:path*",
    "/conversations",
    "/conversations/:path*",
    "/opportunities",
    "/opportunities/:path*",
    "/tickets",
    "/tickets/:path*",
    "/pipelines",
    "/pipelines/:path*",
    "/calendar",
    "/calendar/:path*",
    "/documents",
    "/documents/:path*",
    "/finances",
    "/finances/:path*",
    "/analytics",
    "/analytics/:path*",
    "/account",
    "/account/:path*",
    "/settings",
    "/settings/:path*",
    "/quotes",
    "/quotes/:path*",
    "/services",
    "/services/:path*",
    "/attachments",
    "/attachments/:path*",
    "/api/:path*",
  ],
};
