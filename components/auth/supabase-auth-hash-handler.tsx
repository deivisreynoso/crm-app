"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Supabase puts recovery errors/tokens in the URL hash (#...). Hashes are not sent to
 * the server, so a failed reset can land on / or /es with #error=otp_expired. Forward
 * those to /auth/callback so the client can show a proper message.
 */
export function SupabaseAuthHashHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/auth/callback") return;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const hasAuthHash =
      params.has("error") ||
      params.has("error_code") ||
      params.has("access_token") ||
      params.get("type") === "recovery";

    if (!hasAuthHash) return;

    const target = `/auth/callback${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, [pathname]);

  return null;
}
