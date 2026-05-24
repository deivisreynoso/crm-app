import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeTeamInvite } from "@/lib/team/invites";

const schema = z.object({
  token: z.string().min(16),
  user_id: z.string().uuid(),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await completeTeamInvite({
      token: parsed.data.token,
      userId: parsed.data.user_id,
      email: parsed.data.email,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "Invite invalid", reason: result.reason },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/team/invites/complete:", err);
    return NextResponse.json({ error: "Failed to complete invite" }, { status: 500 });
  }
}
