import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createServerSideClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/users/ensure-user-profile";
import { userCanAccessCrm } from "@/lib/team/access";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) return null;

        const supabase = createServerSideClient();

        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        });

        if (error || !data.user) return null;

        const allowed = await userCanAccessCrm(supabase, data.user.id);
        if (!allowed) return null;

        const fullName = data.user.user_metadata?.full_name as
          | string
          | undefined;

        const { data: membership } = await supabase
          .from("team_members")
          .select("display_name, email")
          .eq("member_user_id", data.user.id)
          .maybeSingle();

        const teamName = membership?.display_name?.trim();
        const displayName =
          teamName || fullName?.trim() || data.user.email || "";

        const user = {
          id: data.user.id,
          email: data.user.email,
          name: displayName,
        };

        await ensureUserProfile(supabase, {
          userId: data.user.id,
          email: data.user.email ?? membership?.email,
          displayName,
        });

        return user;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        if (user.name) token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        if (token.email) session.user.email = token.email;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};