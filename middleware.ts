import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const CRM_PROTECTED = [
  "/dashboard",
  "/accounts",
  "/contacts",
  "/opportunities",
  "/tickets",
  "/pipelines",
  "/calendar",
  "/documents",
  "/payments",
  "/analytics",
  "/account",
  "/settings",
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

  if (isCrmProtected(pathname)) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const signIn = new URL("/login", req.url);
      signIn.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/register",
    "/dashboard",
    "/dashboard/:path*",
    "/accounts",
    "/accounts/:path*",
    "/contacts",
    "/contacts/:path*",
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
    "/payments",
    "/payments/:path*",
    "/analytics",
    "/analytics/:path*",
    "/account",
    "/account/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
