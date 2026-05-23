import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen brand-gradient relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 10% 20%, #38b6ff 0%, transparent 45%), radial-gradient(circle at 90% 80%, #c96dd8 0%, transparent 40%)",
        }}
      />
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-3xl text-center space-y-8">
          <div className="flex justify-center">
            <Image
              src="/brand/logo-dark.png"
              alt="ClickIn 360"
              width={320}
              height={80}
              className="h-16 sm:h-20 w-auto"
              priority
            />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-[family-name:var(--font-heading)]">
              ClickIn 360 CRM
            </h1>
            <p className="text-lg text-white/90 max-w-xl mx-auto leading-relaxed">
              Manage accounts, contacts, pipelines, and service tickets in one
              workspace built for your team.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/login">
              <Button size="lg" className="min-w-[8rem] bg-white text-[var(--primary)] hover:bg-white/90">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[8rem] border-white/60 text-white hover:bg-white/10 hover:text-white"
              >
                Register
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4">
            {[
              {
                title: "Contacts",
                desc: "Manage customer relationships and activity",
              },
              {
                title: "Opportunities",
                desc: "Track your sales pipeline end to end",
              },
              {
                title: "Tickets",
                desc: "Resolve support requests with context",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="surface-card p-5 bg-white/95 backdrop-blur-sm border-white/20"
              >
                <h3 className="font-semibold text-heading mb-1">{item.title}</h3>
                <p className="text-sm text-body-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <footer className="relative text-center py-6 text-sm text-white/70">
        © {new Date().getFullYear()} ClickIn 360 LLC. All rights reserved.
      </footer>
    </main>
  );
}
