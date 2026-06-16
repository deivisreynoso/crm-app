import { createServerSideClient } from "@/lib/supabase";

import {
  getGoogleCalendarRedirectUri,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  isGoogleCalendarConfigured,
} from "@/lib/google/oauth-config";

export { getGoogleCalendarRedirectUri, isGoogleCalendarConfigured };

type TokenRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  calendar_id: string | null;
};

/** Returns a valid access token, refreshing when expired. */
export async function getGoogleCalendarAccessToken(
  userId: string
): Promise<string | null> {
  if (!isGoogleCalendarConfigured()) return null;

  const supabase = createServerSideClient();
  const { data: row, error } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at, calendar_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !row?.access_token) return null;

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const stillValid = expiresAt > Date.now() + 60_000;

  if (stillValid) return row.access_token;

  if (!row.refresh_token) return null;

  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Google token refresh failed:", await tokenRes.text());
    return null;
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const newExpires = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("google_calendar_tokens")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? row.refresh_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return tokens.access_token;
}

export type GoogleCalendarAttendee = {
  email: string;
  displayName?: string;
};

export type GoogleCalendarEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  addGoogleMeet?: boolean;
  attendees?: GoogleCalendarAttendee[];
};

export type GoogleCalendarEventResult = {
  eventId: string | null;
  meetLink: string | null;
};

function calendarIdForRow(row: TokenRow | null): string {
  return row?.calendar_id?.trim() || "primary";
}

export async function createGoogleCalendarEvent(
  userId: string,
  event: GoogleCalendarEventInput
): Promise<GoogleCalendarEventResult> {
  const accessToken = await getGoogleCalendarAccessToken(userId);
  if (!accessToken) return { eventId: null, meetLink: null };

  const supabase = createServerSideClient();
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();

  const calendarId = calendarIdForRow(tokenRow as TokenRow | null);

  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: { dateTime: new Date(event.start_time).toISOString() },
    end: { dateTime: new Date(event.end_time).toISOString() },
  };

  if (event.addGoogleMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  if (event.attendees?.length) {
    body.attendees = event.attendees.map((a) => ({
      email: a.email,
      displayName: a.displayName,
    }));
  }

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  if (event.addGoogleMeet) {
    url.searchParams.set("conferenceDataVersion", "1");
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Google Calendar create failed:", await res.text());
    return { eventId: null, meetLink: null };
  }

  const created = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { uri?: string }[] };
  };
  const meetLink =
    created.hangoutLink ??
    created.conferenceData?.entryPoints?.find((e) => e.uri)?.uri ??
    null;

  return { eventId: created.id ?? null, meetLink };
}

export async function updateGoogleCalendarEvent(
  userId: string,
  googleEventId: string,
  event: GoogleCalendarEventInput
): Promise<boolean> {
  const accessToken = await getGoogleCalendarAccessToken(userId);
  if (!accessToken) return false;

  const supabase = createServerSideClient();
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();

  const calendarId = calendarIdForRow(tokenRow as TokenRow | null);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        start: { dateTime: new Date(event.start_time).toISOString() },
        end: { dateTime: new Date(event.end_time).toISOString() },
        ...(event.attendees?.length
          ? {
              attendees: event.attendees.map((a) => ({
                email: a.email,
                displayName: a.displayName,
              })),
            }
          : {}),
      }),
    }
  );

  if (!res.ok) {
    console.error("Google Calendar update failed:", await res.text());
    return false;
  }

  return true;
}

export async function deleteGoogleCalendarEvent(
  userId: string,
  googleEventId: string
): Promise<boolean> {
  const accessToken = await getGoogleCalendarAccessToken(userId);
  if (!accessToken) return false;

  const supabase = createServerSideClient();
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();

  const calendarId = calendarIdForRow(tokenRow as TokenRow | null);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    console.error("Google Calendar delete failed:", await res.text());
    return false;
  }

  return true;
}
