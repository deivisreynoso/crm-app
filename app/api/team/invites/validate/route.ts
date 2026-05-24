import { NextRequest, NextResponse } from "next/server";
import { validateInviteToken } from "@/lib/team/invites";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, reason: "invalid" }, { status: 400 });
  }

  const result = await validateInviteToken(token);
  if (!result.valid) {
    return NextResponse.json({ valid: false, reason: result.reason });
  }

  return NextResponse.json({
    valid: true,
    email: result.email,
    display_name: result.display_name,
  });
}
