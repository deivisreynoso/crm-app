import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { createServerSideClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/users/ensure-user-profile";
import { userCanAccessCrm } from "@/lib/team/access";
import { resolveGoogleLoginUser } from "@/lib/auth/google-user-link";
import {
  credentialsLoginAllowed,
  googleLoginAllowed,
  googleLoginAllowedForRole,
  loginMethodError,
  resolveUserRole,
} from "@/lib/auth/login-policy";
import {
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
} from "@/lib/google/oauth-config";

const googleClientId = getGoogleOAuthClientId();
const googleClientSecret = getGoogleOAuthClientSecret();

export const authOptions: NextAuthOptions = {
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            authorization: {
              params: {
                hd: "clickin360.com",
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;

        const authClient = createServerSideClient();

        const { data, error } = await authClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
            throw new Error("Invalid email or password.");
          }
          if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
            throw new Error(
              "Your email is not verified yet. Use forgot password to receive a new link, or ask your admin to confirm the account."
            );
          }
          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error("Invalid email or password.");
        }

        const admin = createServerSideClient();

        const allowed = await userCanAccessCrm(
          admin,
          data.user.id,
          data.user.email
        );
        if (!allowed) {
          throw new Error(
            "Your account is not linked to a workspace. Ask your admin for a new team invitation."
          );
        }

        const role = await resolveUserRole(admin, data.user.id);
        if (!credentialsLoginAllowed(role)) {
          throw new Error(loginMethodError("credentials", role));
        }

        const fullName = data.user.user_metadata?.full_name as
          | string
          | undefined;

        const { data: membership } = await admin
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

        await ensureUserProfile(admin, {
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
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.trim().toLowerCase();
      if (!googleLoginAllowed(email)) {
        return loginMethodError("google");
      }

      const admin = createServerSideClient();
      const linked = await resolveGoogleLoginUser(admin, {
        email: email!,
        name: user.name,
        image: user.image,
      });

      if (!linked) {
        return "Your account is not linked to a workspace. Ask your admin for a new team invitation.";
      }

      const role = await resolveUserRole(admin, linked.userId);
      if (!googleLoginAllowedForRole(role)) {
        return loginMethodError("google", role);
      }

      user.id = linked.userId;
      user.email = linked.email;
      user.name = linked.name;
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        if (user.name) token.name = user.name;
        if (account?.provider) token.authProvider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
