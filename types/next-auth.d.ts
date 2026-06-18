import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Supabase auth.users id used to sign in (may differ from id when aliased). */
      authUserId?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: import("@/lib/team/workspace").TeamRole;
    };
  }

  interface User {
    id: string;
    authUserId?: string;
    email?: string | null;
    name?: string | null;
    role?: import("@/lib/team/workspace").TeamRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    authUserId?: string;
    email?: string | null;
    name?: string | null;
    authProvider?: string;
    role?: import("@/lib/team/workspace").TeamRole;
  }
}
