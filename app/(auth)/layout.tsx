import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ClickIn 360 CRM - Login",
  description: "Login to your ClickIn 360 CRM account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}