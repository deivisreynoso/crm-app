"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthBrandHeader } from "@/components/auth/auth-brand-header";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteReason, setInviteReason] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      setInviteValid(false);
      setInviteReason("missing");
      return;
    }

    let cancelled = false;

    async function validate() {
      try {
        const res = await fetch(
          `/api/team/invites/validate?token=${encodeURIComponent(inviteToken)}`
        );
        const data = (await res.json()) as {
          valid?: boolean;
          reason?: string;
          email?: string;
          display_name?: string | null;
        };
        if (cancelled) return;
        if (data.valid && data.email) {
          setInviteValid(true);
          setEmail(data.email);
          if (data.display_name) setFullName(data.display_name);
        } else {
          setInviteValid(false);
          setInviteReason(data.reason ?? "invalid");
        }
      } catch {
        if (!cancelled) {
          setInviteValid(false);
          setInviteReason("invalid");
        }
      }
    }

    void validate();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!inviteToken || !inviteValid) {
      setError("A valid invitation link is required to register.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/team/invites/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: inviteToken,
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
        }),
      });

      const body = (await res.json()) as { error?: string; reason?: string };

      if (!res.ok) {
        setError(
          body.reason === "email_mismatch"
            ? "Email must match the invitation."
            : body.error ??
                "Could not complete your invitation. Contact your team admin."
        );
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (inviteValid === null) {
    return (
      <div className="surface-card p-8 border border-[var(--card-border)] shadow-[var(--shadow-md)]">
        <p className="text-sm text-body-muted">Validating your invitation…</p>
      </div>
    );
  }

  if (!inviteValid) {
    const message =
      inviteReason === "expired"
        ? "This invitation has expired. Ask your team admin to send a new link."
        : inviteReason === "used"
          ? "This invitation was already used. Sign in if you already have an account."
          : "Registration is by invitation only. Ask your team admin for a link, or sign in if you already have access.";

    return (
      <div className="surface-card p-8 border border-[var(--card-border)] shadow-[var(--shadow-md)]">
        <AuthBrandHeader
          title="Invitation required"
          subtitle="CRM access is invite-only"
        />
        <p className="text-sm text-body-muted mt-4">{message}</p>
        <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
          <Link href="/login" className="text-[var(--primary)] font-medium hover:underline text-sm">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-8 border border-[var(--card-border)] shadow-[var(--shadow-md)]">
      <div className="lg:hidden">
        <AuthBrandHeader
          title="Accept your invitation"
          subtitle="Create your ClickIn 360 CRM account"
        />
      </div>
      <div className="hidden lg:block mb-8">
        <h1 className="text-2xl font-bold text-heading tracking-tight">Accept your invitation</h1>
        <p className="text-body-muted text-sm mt-1.5">Create your ClickIn 360 CRM account</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-[var(--error)] text-[var(--error)] px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-heading mb-1">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Elizabeth Rivero"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-heading mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            required
            className="input-field bg-[var(--surface-subtle)]"
          />
          <p className="text-xs text-body-muted mt-1">Must match your invitation</p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-heading mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            className="input-field"
          />
          <p className="text-xs text-body-muted mt-1">Must be at least 8 characters</p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-heading mb-1"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="input-field"
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
        <p className="text-sm text-body-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="surface-card p-8 border border-[var(--card-border)] shadow-[var(--shadow-md)]">
          <p className="text-sm text-body-muted">Loading…</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
