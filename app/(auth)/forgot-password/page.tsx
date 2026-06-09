"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthBrandHeader } from "@/components/auth/auth-brand-header";
import axios from "axios";
import { formatApiError } from "@/lib/validation-errors";

const RESET_ERROR_MESSAGES: Record<string, string> = {
  otp_expired:
    "That reset link has expired. Request a new one below and use only the latest email (links expire in about an hour).",
  reset_link_invalid:
    "That reset link is invalid or was already used. Request a new one below.",
  access_denied:
    "That reset link is no longer valid. Request a new one below.",
};

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) {
      setError(RESET_ERROR_MESSAGES[code] ?? RESET_ERROR_MESSAGES.reset_link_invalid);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.post<{ message?: string }>("/api/auth/forgot-password", {
        email: trimmed,
      });

      setNotice(
        data.message ??
          "If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder."
      );
    } catch (err) {
      setError(formatApiError(err, "Something went wrong. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="surface-card p-8 border border-[var(--card-border)] shadow-[var(--shadow-md)]">
      <div className="lg:hidden">
        <AuthBrandHeader
          title="Reset your password"
          subtitle="We will email you a secure link"
        />
      </div>
      <div className="hidden lg:block mb-8">
        <h1 className="text-2xl font-bold text-heading tracking-tight">Reset your password</h1>
        <p className="text-body-muted text-sm mt-1.5">We will email you a secure link</p>
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

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Sending link…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 pt-6 border-t border-[var(--card-border)] text-sm text-body-muted">
        <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="surface-card p-8 border border-[var(--card-border)] shadow-[var(--shadow-md)]">
          <p className="text-sm text-body-muted">Loading…</p>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
