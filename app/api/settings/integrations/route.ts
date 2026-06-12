import { NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { isStripeConfigured } from "@/lib/integrations/stripe";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth-config";
import { isGa4DataConfigured } from "@/lib/google/analytics-data";

function maskPropertyId(propertyId: string | undefined): string | null {
  const id = propertyId?.trim();
  if (!id) return null;
  if (id.length <= 6) return id;
  return `${id.slice(0, 4)}…${id.slice(-3)}`;
}

/** Admin integration status (WhatsApp, N8N, GA, Mailgun scaffolding). */
export async function GET() {
  const { role, isWorkspaceOwner, error } = await requireAuth();
  if (error) return error;

  const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
  if (manageError) return manageError;

  const ga4PropertyId = process.env.GA4_PROPERTY_ID?.trim() ?? null;

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
      stripe: {
        configured: isStripeConfigured(),
        webhook_path: "/api/webhooks/stripe",
        webhook_secret_set: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      },
      mailgun: {
        configured: Boolean(
          process.env.MAILGUN_API_KEY?.trim() && process.env.MAILGUN_DOMAIN?.trim()
        ),
      },
      google_analytics: {
        configured: isGa4DataConfigured(),
        property_id: maskPropertyId(ga4PropertyId ?? undefined),
        service_account_set: Boolean(
          process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL?.trim() &&
            process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.trim()
        ),
      },
      google_oauth: { configured: isGoogleOAuthConfigured() },
    },
  });
}
