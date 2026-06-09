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

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verifying your link…");

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function complete() {
      const hashParams = parseHashParams();
      const hashError = hashParams.get("error");
      const hashErrorCode = hashParams.get("error_code");

      if (hashError || hashErrorCode) {
        const code = hashErrorCode ?? hashError ?? "expired";
        router.replace(`/forgot-password?error=${encodeURIComponent(code)}`);
        return;
      }

      const nextPath = searchParams.get("next") ?? "/reset-password";
      const destination = nextPath.startsWith("/") ? nextPath : "/reset-password";
      const code = searchParams.get("code");
      const supabase = createClient();

      if (code) {
        setStatus("Signing you in…");
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          router.replace("/forgot-password?error=reset_link_invalid");
          return;
        }
        router.replace(destination);
        return;
      }

      const { data: initial } = await supabase.auth.getSession();
      if (cancelled) return;
      if (initial.session) {
        router.replace(destination);
        return;
      }

      setStatus("Almost there…");
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
          router.replace(destination);
        }
      });
      unsubscribe = () => listener.subscription.unsubscribe();

      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (cancelled) return;

      const { data: afterWait } = await supabase.auth.getSession();
      if (afterWait.session) {
        router.replace(destination);
        return;
      }

      router.replace("/forgot-password?error=reset_link_invalid");
    }

    void complete();

    return () => {
      cancelled = true;
      unsubscribe?.();
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
