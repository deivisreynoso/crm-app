import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import {
  bookingAvailabilitySchema,
  DEFAULT_BOOKING_AVAILABILITY,
} from "@/lib/website/booking-availability";
import { humanizeDbError } from "@/lib/validation-errors";

const patchSchema = z.object({
  booking_availability: z
    .object({
      timezone: z.string().min(1),
      days: z.array(z.number().int().min(0).max(6)),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
      min_notice_hours: z.number().int().min(0).max(168),
      max_days_ahead: z.number().int().min(1).max(90),
      meeting_duration_minutes: z.number().int().min(15).max(120),
      buffer_minutes: z.number().int().min(0).max(60),
    })
    .optional(),
  google_reviews_url: z
    .string()
    .max(2000)
    .refine((v) => v === "" || /^https?:\/\//i.test(v))
    .optional()
    .or(z.literal("")),
  review_request_template_id: z.string().uuid().nullable().optional(),
});

/** Member-accessible workspace settings (all roles with write access). */
export async function PATCH(req: NextRequest) {
  const { workspaceOwnerId, role, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWorkspaceWrite(role!);
  if (writeError) return writeError;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.booking_availability) {
    patch.booking_availability = bookingAvailabilitySchema.parse(
      parsed.data.booking_availability
    );
  }
  if (parsed.data.google_reviews_url !== undefined) {
    patch.google_reviews_url = parsed.data.google_reviews_url?.trim() || null;
  }
  if (parsed.data.review_request_template_id !== undefined) {
    patch.review_request_template_id = parsed.data.review_request_template_id;
  }

  const supabase = createServerSideClient();
  const { data, error: dbError } = await supabase
    .from("user_settings")
    .upsert({ user_id: workspaceOwnerId!, ...patch }, { onConflict: "user_id" })
    .select(
      "booking_availability, google_reviews_url, review_request_template_id, updated_at"
    )
    .single();

  if (dbError) {
    return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
  }

  return NextResponse.json({
    booking_availability: bookingAvailabilitySchema.parse(
      data.booking_availability ?? DEFAULT_BOOKING_AVAILABILITY
    ),
    google_reviews_url: data.google_reviews_url,
    review_request_template_id: data.review_request_template_id,
    updated_at: data.updated_at,
  });
}
