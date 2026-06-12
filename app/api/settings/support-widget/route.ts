import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

const patchSchema = z.object({
  support_widget_enabled: z.boolean().optional(),
  support_widget_assignee: z.string().uuid().nullable().optional(),
  support_widget_email_notify: z.boolean().optional(),
});

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://www.clickin360.com"
  );
}

export async function GET() {
  const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
  if (error) return error;

  const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
  if (manageError) return manageError;

  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("user_settings")
    .select(
      "support_widget_enabled, support_widget_assignee, support_widget_email_notify"
    )
    .eq("user_id", workspaceOwnerId!)
    .maybeSingle();

  const base = appUrl().replace(/\/$/, "");

  return NextResponse.json({
    data: {
      support_widget_enabled: data?.support_widget_enabled ?? false,
      support_widget_assignee: data?.support_widget_assignee ?? null,
      support_widget_email_notify: data?.support_widget_email_notify ?? true,
      support_url: `${base}/en/support`,
      support_url_es: `${base}/es/support`,
      embed_code: `<iframe src="${base}/support?embed=1" width="100%" height="640" style="border:0;border-radius:12px" title="Support"></iframe>`,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
  if (error) return error;

  const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
  if (manageError) return manageError;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    user_id: workspaceOwnerId!,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.support_widget_enabled !== undefined) {
    patch.support_widget_enabled = parsed.data.support_widget_enabled;
  }
  if (parsed.data.support_widget_assignee !== undefined) {
    patch.support_widget_assignee = parsed.data.support_widget_assignee;
  }
  if (parsed.data.support_widget_email_notify !== undefined) {
    patch.support_widget_email_notify = parsed.data.support_widget_email_notify;
  }

  const supabase = createServerSideClient();
  const { error: dbError } = await supabase.from("user_settings").upsert(patch, {
    onConflict: "user_id",
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
