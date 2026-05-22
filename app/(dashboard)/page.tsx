import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">
          Welcome back, {session?.user?.name}
        </h2>
        <p className="text-slate-600 mt-2">
          Here's what's happening with your CRM today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-slate-600 text-sm">Total Contacts</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-slate-600 text-sm">Active Opportunities</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-slate-600 text-sm">Open Tickets</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-slate-600 text-sm">Pending Tasks</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Getting Started</h3>
        <div className="space-y-2 text-slate-600">
          <p>✓ Account created and authenticated</p>
          <p>○ Create your first contact</p>
          <p>○ Create an opportunity</p>
          <p>○ Set up your sales pipeline</p>
        </div>
      </div>
    </div>
  );
}