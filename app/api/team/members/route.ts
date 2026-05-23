import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { humanizeDbError } from "@/lib/validation-errors";

const addMemberSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1).max(120).optional(),
});

/** Assignable users: self + linked teammates. */
export async function GET() {
  try {
    const { userId, session, error } = await requireAuth();
    if (error) return error;

    const email = session!.user?.email ?? "";
    const name = session!.user?.name ?? email;

    const supabase = createServerSideClient();

    if (email) {
      await supabase.from("user_profiles").upsert(
        {
          id: userId!,
          email,
          display_name: name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    const members: { id: string; label: string; email: string }[] = [
      { id: userId!, label: `${name} (you)`, email },
    ];

    const { data: team } = await supabase
      .from("team_members")
      .select("member_user_id, email, display_name")
      .eq("owner_user_id", userId!)
      .not("member_user_id", "is", null);

    for (const row of team ?? []) {
      if (row.member_user_id && row.member_user_id !== userId) {
        members.push({
          id: row.member_user_id,
          label: row.display_name ?? row.email,
          email: row.email,
        });
      }
    }

    return NextResponse.json({ data: members });
  } catch (err) {
    console.error("GET /api/team/members:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const email = parsed.data.email.toLowerCase().trim();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, email, display_name")
      .eq("email", email)
      .maybeSingle();

    const { data, error: dbError } = await supabase
      .from("team_members")
      .insert([
        {
          owner_user_id: userId!,
          email,
          display_name:
            parsed.data.display_name?.trim() || profile?.display_name || email,
          member_user_id: profile?.id ?? null,
        },
      ])
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/team/members:", err);
    return NextResponse.json({ error: "Failed to add teammate" }, { status: 500 });
  }
}
