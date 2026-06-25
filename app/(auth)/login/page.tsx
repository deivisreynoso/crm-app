"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthBrandHeader } from "@/components/auth/auth-brand-header";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotice("Account created. Sign in with your email and password.");
    } else if (searchParams.get("reset") === "success") {
      setNotice("Password updated. Sign in with your new password.");
    } else if (searchParams.get("error") === "invite_only") {
      setNotice(
        "CRM registration is invite-only. Use the link from your team admin, or sign in if you already have access."
      );
    } else if (searchParams.get("error") === "session_expired") {
      setNotice("Your session expired due to workspace inactivity. Please sign in again.");
    } else if (searchParams.get("error") === "reset_link_invalid") {
      setError("Your password reset link is invalid or has expired. Request a new one below.");
    } else if (searchParams.get("error") === "OAuthSignin" || searchParams.get("error") === "OAuthCallback") {
      setError("Google sign-in failed. Use your @clickin360.com workspace account.");
    } else if (searchParams.get("error")) {
      setError(decodeURIComponent(searchParams.get("error")!));
    }
  }, [searchParams]);

  async function handleGoogleSignIn() {
    setError("");
    setNotice(null);
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password, or your account is not linked to a workspace. Ask your admin for an invite."
            : result.error
        );
      } else if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="surface-card p-8 border border-[var(--card-border)] shadow-[var(--shadow-md)]">
      <div className="mb-6 lg:mb-8">
        <AuthBrandHeader
          title="Welcome back"
          subtitle="Sign in to your CRM workspace"
        />
      </div>

      {notice && (
        <div className="bg-[var(--secondary)]/10 border border-[var(--secondary)]/40 text-heading px-4 py-3 rounded-lg mb-4 text-sm">
          {notice}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-[var(--error)] text-[var(--error)] px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          disabled={googleLoading || isLoading}
          className="w-full"
          onClick={() => void handleGoogleSignIn()}
        >
          {googleLoading ? "Redirecting…" : "Continue with Google Workspace"}
        </Button>
        <p className="text-xs text-center text-body-muted">
          For @clickin360.com accounts (e.g. deivis@clickin360.com).
        </p>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--card-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--card)] px-2 text-body-muted">Or sign in with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-heading mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-field"
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-heading">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-[var(--primary)] font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-field"
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" disabled={isLoading || googleLoading} className="w-full">
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-xs text-body-muted">
          Owners and teammates can use any email on file (e.g. deivis.reynoso@gmail.com). View
          Only accounts use email and password only.
        </p>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--card-border)] space-y-2">
        <p className="text-sm text-body-muted">
          Need CRM access? Ask your team admin for an invitation link.
        </p>
        <p className="text-sm text-body-muted">
          <Link href="/es" className="text-[var(--primary)] font-medium hover:underline">
            Volver al sitio ClickIn 360
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="surface-card p-8 border border-[var(--card-border)] shadow-[var(--shadow-md)]">
          <p className="text-sm text-body-muted">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
