import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseBrowserConfig,
  getSupabaseServerConfig,
} from "@/lib/supabase/config";

// For browser/client-side (auth pages: register, reset password, callback)
export function createClient() {
  const { url, anonKey } = getSupabaseBrowserConfig("createClient");
  return createBrowserClient(url, anonKey, {
    auth: {
      // Implicit + hash tokens work when the reset email is opened on another device;
      // PKCE requires the same browser that requested the reset.
      flowType: "implicit",
      detectSessionInUrl: true,
    },
  });
}

// For server-side (API routes, server actions). Never reuse after signInWithPassword —
// the client switches to the user JWT and RLS applies (team_members is owner-only).
export function createServerSideClient() {
  const { url, serviceKey } = getSupabaseServerConfig("createServerSideClient");
  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
