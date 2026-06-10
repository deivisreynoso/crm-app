import { NextRequest, NextResponse } from "next/server";
import {
  buildPasswordResetLinkWithTokenHash,
  buildPasswordResetRedirectTo,
} from "@/lib/auth/password-reset";
import { requireTransactionalEmailForAuth } from "@/lib/email/auth-email-policy";
import { passwordResetEmailHtml } from "@/lib/email/transactional-templates";
import { createServerSideClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/send";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export async function POST(req: NextRequest) {
  try {
    requireTransactionalEmailForAuth();

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const redirectTo = buildPasswordResetRedirectTo(req.url);
    const admin = createServerSideClient();

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkError) {
      console.error("POST /api/auth/forgot-password generateLink:", linkError.message);
      // Do not reveal whether the email exists
      if (linkError.message.toLowerCase().includes("user not found")) {
        return NextResponse.json({
          success: true,
          message:
            "If an account exists for that email, we sent a link to reset your password.",
        });
      }
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) {
      console.error("POST /api/auth/forgot-password: missing hashed_token");
      return NextResponse.json(
        { error: "Could not create a reset link. Please try again." },
        { status: 500 }
      );
    }

    const resetLink = buildPasswordResetLinkWithTokenHash(tokenHash, req.url);

    await sendEmail({
      to: email,
      subject: "Reset your ClickIn 360 CRM password",
      html: passwordResetEmailHtml(resetLink),
    });

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, we sent a link to reset your password.",
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("MAILGUN")) {
      console.error("POST /api/auth/forgot-password:", err.message);
      return NextResponse.json(
        {
          error:
            "Password reset email is not configured on the server. Contact your administrator.",
        },
        { status: 503 }
      );
    }
    if (err instanceof Error && err.message.includes("Email is not configured")) {
      return NextResponse.json(
        {
          error:
            "Password reset email is not configured. Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM.",
        },
        { status: 503 }
      );
    }
    console.error("POST /api/auth/forgot-password:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
