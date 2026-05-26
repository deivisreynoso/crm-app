import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";
import {
  bookingAvailabilitySchema,
  DEFAULT_BOOKING_AVAILABILITY,
} from "@/lib/website/booking-availability";
import { resolveQuoteLogoUrl } from "@/lib/storage/quote-logo";

const bookingAvailabilityPatchSchema = z.object({
  timezone: z.string().min(1),
  days: z.array(z.number().int().min(0).max(6)),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  min_notice_hours: z.number().int().min(0).max(168),
  max_days_ahead: z.number().int().min(1).max(90),
  meeting_duration_minutes: z.number().int().min(15).max(120),
  buffer_minutes: z.number().int().min(0).max(60),
});

const settingsPatchSchema = z.object({
  default_currency: z.enum(["USD", "MXN"]).optional(),
  default_sales_assignee: z.string().uuid().nullable().optional(),
  booking_availability: bookingAvailabilityPatchSchema.optional(),
  ui_locale: z.enum(["en", "es"]).optional(),
  quote_company_name: z.string().max(120).optional().or(z.literal("")),
  google_reviews_url: z
    .string()
    .max(2000)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), {
      message: "Enter a valid URL starting with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
  review_request_template_id: z.string().uuid().nullable().optional(),
});

async function loadSettings(workspaceOwnerId: string) {
  const supabase = createServerSideClient();
  let { data, error: dbError } = await supabase
    .from("user_settings")
    .select(
      "default_currency, default_sales_assignee, booking_availability, ui_locale, quote_logo_storage_path, quote_company_name, google_reviews_url, review_request_template_id, updated_at"
    )
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (dbError) throw dbError;

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("user_settings")
      .insert({ user_id: workspaceOwnerId, default_currency: "USD" })
      .select(
      "default_currency, default_sales_assignee, booking_availability, ui_locale, quote_logo_storage_path, quote_company_name, google_reviews_url, review_request_template_id, updated_at"
    )
      .single();

    if (insertError) throw insertError;
    data = created;
  }

  return data;
}

export async function GET() {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const data = await loadSettings(workspaceOwnerId!);
    const booking = bookingAvailabilitySchema.parse(
      data.booking_availability ?? DEFAULT_BOOKING_AVAILABILITY
    );
    const supabase = createServerSideClient();
    const quote_logo_url = await resolveQuoteLogoUrl(
      supabase,
      data.quote_logo_storage_path as string | null | undefined
    );
    return NextResponse.json({
      ...data,
      booking_availability: booking,
      quote_logo_url,
    });
  } catch (err) {
    console.error("GET /api/settings:", err);
    return NextResponse.json(
      {
        error: humanizeDbError(err instanceof Error ? err.message : "Internal Server Error"),
        hint: "Run migrations 014 and 022 in Supabase.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const body = await req.json();
    const parsed = settingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Invalid settings" },
        { status: 400 }
      );
    }

    if (
      parsed.data.default_currency === undefined &&
      parsed.data.default_sales_assignee === undefined &&
      parsed.data.booking_availability === undefined &&
      parsed.data.ui_locale === undefined &&
      parsed.data.quote_company_name === undefined &&
      parsed.data.google_reviews_url === undefined &&
      parsed.data.review_request_template_id === undefined
    ) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const patch: Record<string, unknown> = {
      user_id: workspaceOwnerId!,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.default_currency !== undefined) {
      patch.default_currency = parsed.data.default_currency;
    }
    if (parsed.data.default_sales_assignee !== undefined) {
      patch.default_sales_assignee = parsed.data.default_sales_assignee;
    }
    if (parsed.data.booking_availability !== undefined) {
      patch.booking_availability = parsed.data.booking_availability;
    }
    if (parsed.data.ui_locale !== undefined) {
      patch.ui_locale = parsed.data.ui_locale;
    }
    if (parsed.data.quote_company_name !== undefined) {
      patch.quote_company_name = parsed.data.quote_company_name?.trim() || null;
    }
    if (parsed.data.google_reviews_url !== undefined) {
      patch.google_reviews_url = parsed.data.google_reviews_url?.trim() || null;
    }
    if (parsed.data.review_request_template_id !== undefined) {
      patch.review_request_template_id = parsed.data.review_request_template_id;
    }

    const { data, error: dbError } = await supabase
      .from("user_settings")
      .upsert(patch, { onConflict: "user_id" })
      .select(
      "default_currency, default_sales_assignee, booking_availability, ui_locale, quote_logo_storage_path, quote_company_name, google_reviews_url, review_request_template_id, updated_at"
    )
      .single();

    if (dbError) {
      return NextResponse.json(
        {
          error: humanizeDbError(dbError.message),
          hint: "Run migrations 014 and 022 in Supabase.",
        },
        { status: 500 }
      );
    }

    const quote_logo_url = await resolveQuoteLogoUrl(
      supabase,
      data.quote_logo_storage_path as string | null | undefined
    );
    return NextResponse.json({ ...data, quote_logo_url });
  } catch (err) {
    console.error("PATCH /api/settings:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
