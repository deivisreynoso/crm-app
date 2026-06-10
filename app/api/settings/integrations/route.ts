import { NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { isStripeConfigured } from "@/lib/integrations/stripe";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth-config";

/** Admin integration status (WhatsApp, N8N, GA, Mailgun scaffolding). */
export async function GET() {
  const { role, isWorkspaceOwner, error } = await requireAuth();
  if (error) return error;

  const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
  if (manageError) return manageError;

  return NextResponse.json({
    data: {
      n8n: {
        configured: Boolean(process.env.N8N_WEBHOOK_URL?.trim()),
        inbound_path: "/api/integrations/n8n/inbound",
      },
      whatsapp: {
        configured: Boolean(
          process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
            process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
        ),
        inbound_path: "/api/integrations/whatsapp/inbound",
      },
      stripe: { configured: isStripeConfigured() },
      mailgun: {
        configured: Boolean(
          process.env.MAILGUN_API_KEY?.trim() && process.env.MAILGUN_DOMAIN?.trim()
        ),
      },
      google_analytics: {
        configured: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()),
        measurement_id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? null,
      },
      google_oauth: { configured: isGoogleOAuthConfigured() },
    },
  });
}
