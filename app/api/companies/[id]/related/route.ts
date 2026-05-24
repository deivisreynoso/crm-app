import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getCompanyRelated } from "@/lib/company-queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const data = await getCompanyRelated(workspaceOwnerId!, id);

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/companies/[id]/related error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
