export type WhatsAppSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

function resolveWhatsAppRecipient(
  externalSessionId: string,
  qualificationPhone?: string | null
): string {
  const fromQualification = qualificationPhone?.trim();
  if (fromQualification) return fromQualification;

  const underscore = externalSessionId.indexOf("_");
  if (underscore >= 0 && underscore < externalSessionId.length - 1) {
    return externalSessionId.slice(underscore + 1);
  }

  return externalSessionId;
}

/** Send a text message via Meta WhatsApp Cloud API. */
export async function sendWhatsAppText(
  to: string,
  body: string,
  options?: { externalSessionId?: string; qualificationPhone?: string | null }
): Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!accessToken || !phoneNumberId) {
    return {
      ok: false,
      error:
        "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const recipient = options?.externalSessionId
    ? resolveWhatsAppRecipient(
        options.externalSessionId,
        options.qualificationPhone ?? to
      )
    : to;

  const normalizedTo = recipient.replace(/\D/g, "");
  if (!normalizedTo) {
    return { ok: false, error: "Invalid WhatsApp recipient phone number." };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "text",
        text: { body },
      }),
    });

    const payload = (await res.json().catch(() => null)) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      return {
        ok: false,
        error:
          payload?.error?.message ??
          `WhatsApp API error (${res.status})`,
      };
    }

    return {
      ok: true,
      messageId: payload?.messages?.[0]?.id ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "WhatsApp send failed",
    };
  }
}
