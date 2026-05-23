import type { Metadata } from "next";
import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";

export const metadata: Metadata = {
  title: "ClickIn 360 CRM",
  description: "Sign in to ClickIn 360 CRM",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--background)]">
      <AuthMarketingPanel />
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div
          className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none lg:hidden"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 0%, #3abef933 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 80% 100%, #e064d922 0%, transparent 50%)",
          }}
        />
        <div className="relative w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
