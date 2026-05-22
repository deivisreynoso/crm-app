import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Lightweight CRM</h1>
        <p className="text-xl text-slate-600 mb-8">
          Manage your contacts, opportunities, and tickets in one place
        </p>
        <div className="flex gap-4 justify-center mb-16">
          <Link href="/login">
            <Button size="lg" variant="default">Login</Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline">Register</Button>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-8 text-left">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Contacts</h3>
            <p className="text-sm text-slate-600">Manage all your customer relationships</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Opportunities</h3>
            <p className="text-sm text-slate-600">Track your sales pipeline</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Tickets</h3>
            <p className="text-sm text-slate-600">Manage support requests</p>
          </div>
        </div>
      </div>
    </main>
  );
}