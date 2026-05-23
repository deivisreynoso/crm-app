import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
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
    "/settings",
    "/settings/:path*",
  ],
};
