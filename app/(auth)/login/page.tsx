"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-[var(--card)] rounded-xl shadow-lg p-8 border border-[var(--card-border)]">
      <div className="flex justify-center mb-6">
        <Image
          src="/brand/logo-light.png"
          alt="ClickIn"
          width={160}
          height={40}
          className="h-9 w-auto dark:hidden"
          priority
        />
        <Image
          src="/brand/logo-dark.png"
          alt="ClickIn"
          width={160}
          height={40}
          className="h-9 w-auto hidden dark:block"
          priority
        />
      </div>
      <p className="text-[var(--muted)] text-sm text-center mb-6">
        Sign in to your CRM workspace
      </p>

      {error && (
        <div className="bg-red-500/10 border border-[var(--error)] text-[var(--error)] px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            required
            className="input-field"
          />
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
            className="input-field"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
        <p className="text-sm text-body-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--primary)] font-medium hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}