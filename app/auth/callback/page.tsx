"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

function parseHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const raw = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(raw);
}

function mapRecoveryError(error: { message?: string; code?: string }): string {
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("expired") || error.code === "otp_expired") return "otp_expired";
  return "reset_link_invalid";
}

async function establishRecoverySession(
  supabase: ReturnType<typeof createClient>,
  searchParams: URLSearchParams
): Promise<{ ok: true } | { ok: false; errorCode: string }> {
  const hashParams = parseHashParams();

  const hashError = hashParams.get("error");
  const hashErrorCode = hashParams.get("error_code");
  if (hashError || hashErrorCode) {
    return { ok: false, errorCode: hashErrorCode ?? hashError ?? "otp_expired" };
  }

  const tokenHash = searchParams.get("token_hash");
  const queryType = searchParams.get("type");
  if (tokenHash && queryType === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (!error) return { ok: true };
    return { ok: false, errorCode: mapRecoveryError(error) };
  }

  const accessToken = hashParams.get("access_token");
  const hashType = hashParams.get("type");
  if (accessToken && hashType === "recovery") {
    const refreshToken = hashParams.get("refresh_token") ?? "";
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) return { ok: true };
    return { ok: false, errorCode: mapRecoveryError(error) };
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return { ok: true };
    // PKCE exchange often fails when reset was requested server-side or on another device.
    console.warn("auth/callback exchangeCodeForSession:", error.message);
  }

  const { data: initial } = await supabase.auth.getSession();
  if (initial.session) return { ok: true };

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      subscription.subscription.unsubscribe();
      resolve();
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        finish();
      }
    });

    setTimeout(finish, 4000);
  });

  const { data: afterWait } = await supabase.auth.getSession();
  if (afterWait.session) return { ok: true };

  return { ok: false, errorCode: "reset_link_invalid" };
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verifying your link…");

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      const nextPath = searchParams.get("next") ?? "/reset-password";
      const destination = nextPath.startsWith("/") ? nextPath : "/reset-password";

      setStatus("Verifying your link…");
      const supabase = createClient();
      const result = await establishRecoverySession(supabase, searchParams);

      if (cancelled) return;

      if (result.ok) {
        router.replace(destination);
        return;
      }

      router.replace(
        `/forgot-password?error=${encodeURIComponent(result.errorCode)}`
      );
    }

    void complete();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-[var(--background)]">
      <p className="text-sm text-body-muted">{status}</p>
      <Link href="/forgot-password" className="text-sm text-[var(--primary)] hover:underline">
        Request a new reset link
      </Link>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <p className="text-sm text-body-muted">Loading…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
