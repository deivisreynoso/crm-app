import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutboundWebhookEvent } from "@/lib/webhooks/events";

type WebhookSettings = {
  outbound_webhook_url: string | null;
  outbound_webhook_secret: string | null;
  outbound_webhook_events: unknown;
};

function resolveSecret(settings: WebhookSettings): string {
  return (
    settings.outbound_webhook_secret?.trim() ||
    process.env.CRM_OUTBOUND_WEBHOOK_SECRET?.trim() ||
    process.env.N8N_CRM_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

function eventEnabled(settings: WebhookSettings, event: OutboundWebhookEvent): boolean {
  const raw = settings.outbound_webhook_events;
  if (!Array.isArray(raw) || raw.length === 0) return true;
  return raw.includes(event);
}

async function logDelivery(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    event: OutboundWebhookEvent;
    payload: Record<string, unknown>;
    targetUrl: string;
    statusCode: number | null;
    success: boolean;
    errorMessage: string | null;
    attemptCount: number;
  }
) {
  try {
    await supabase.from("webhook_deliveries").insert({
      workspace_owner_id: input.workspaceOwnerId,
      event: input.event,
      payload: input.payload,
      target_url: input.targetUrl,
      status_code: input.statusCode,
      success: input.success,
      error_message: input.errorMessage,
      attempt_count: input.attemptCount,
    });
  } catch (err) {
    console.error("webhook delivery log failed:", err);
  }
}

async function postOnce(
  url: string,
  secret: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-crm-webhook-secret": secret,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        status: response.status,
        error: text.slice(0, 500) || response.statusText,
      };
    }
    return { ok: true, status: response.status, error: null };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/** Fire workspace outbound webhook with one retry and delivery log. Best-effort; never throws. */
export async function fireWebhook(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  event: OutboundWebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("outbound_webhook_url, outbound_webhook_secret, outbound_webhook_events")
      .eq("user_id", workspaceOwnerId)
      .maybeSingle();

    const url = (settings?.outbound_webhook_url as string | null)?.trim();
    if (!url || !eventEnabled(settings as WebhookSettings, event)) return;

    const secret = resolveSecret(settings as WebhookSettings);
    const body = {
      event,
      workspace_owner_id: workspaceOwnerId,
      emitted_at: new Date().toISOString(),
      payload,
    };

    let result = await postOnce(url, secret, body);
    let attemptCount = 1;

    if (!result.ok) {
      result = await postOnce(url, secret, body);
      attemptCount = 2;
    }

    await logDelivery(supabase, {
      workspaceOwnerId,
      event,
      payload,
      targetUrl: url,
      statusCode: result.status,
      success: result.ok,
      errorMessage: result.error,
      attemptCount,
    });

    if (!result.ok) {
      console.error(`fireWebhook ${event}:`, result.error);
    }
  } catch (err) {
    console.error(`fireWebhook ${event}:`, err);
  }
}

/** Convenience wrapper when only event + payload are known (loads workspace from env fallback URL). */
export async function fireWebhookEvent(
  event: OutboundWebhookEvent,
  payload: Record<string, unknown> & { workspace_owner_id?: string; user_id?: string }
): Promise<void> {
  const workspaceOwnerId =
    payload.workspace_owner_id?.trim() ||
    (payload.user_id as string | undefined)?.trim();
  if (!workspaceOwnerId) {
    console.warn(`fireWebhookEvent ${event}: missing workspace_owner_id`);
    return;
  }

  const { createServerSideClient } = await import("@/lib/supabase");
  const supabase = createServerSideClient();
  await fireWebhook(supabase, workspaceOwnerId, event, payload);
}
