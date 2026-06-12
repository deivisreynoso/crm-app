export type Ga4EventCategory =
  | "conversion"
  | "lead"
  | "booking"
  | "engagement"
  | "interaction"
  | "other";

export type Ga4EventMeta = {
  label: string;
  category: Ga4EventCategory;
  description: string;
  isKeyConversion?: boolean;
};

/** Known custom events fired from lib/analytics/ga4-events.ts on the marketing site. */
export const GA4_WEBSITE_EVENT_CATALOG: Record<string, Ga4EventMeta> = {
  generate_lead: {
    label: "Lead generated",
    category: "conversion",
    description: "Qualified lead conversion (booking or form)",
    isKeyConversion: true,
  },
  booking_completed: {
    label: "Booking completed",
    category: "conversion",
    description: "Visitor finished the booking flow",
    isKeyConversion: true,
  },
  form_submission: {
    label: "Form submitted",
    category: "lead",
    description: "Contact or lead capture form submitted",
    isKeyConversion: true,
  },
  booking_initiated: {
    label: "Booking started",
    category: "booking",
    description: "Visitor opened or started booking",
  },
  cta_click: {
    label: "CTA click",
    category: "interaction",
    description: "Primary call-to-action clicked",
  },
  chat_initiated: {
    label: "Chat opened",
    category: "interaction",
    description: "Web chat widget or inline chat opened",
  },
  chat_message_sent: {
    label: "Chat message",
    category: "interaction",
    description: "User sent a chat message",
  },
  scroll_depth: {
    label: "Scroll depth",
    category: "engagement",
    description: "Page scroll milestone (50% / 75% / 90%)",
  },
  service_viewed: {
    label: "Service viewed",
    category: "engagement",
    description: "Service or package detail viewed",
  },
  pricing_viewed: {
    label: "Pricing viewed",
    category: "engagement",
    description: "Pricing tier or package card viewed",
  },
  faq_clicked: {
    label: "FAQ expanded",
    category: "engagement",
    description: "FAQ question opened",
  },
  testimonial_viewed: {
    label: "Testimonial viewed",
    category: "engagement",
    description: "Review or testimonial card viewed",
  },
  email_clicked: {
    label: "Email link click",
    category: "interaction",
    description: "mailto link clicked",
  },
  phone_clicked: {
    label: "Phone link click",
    category: "interaction",
    description: "tel link clicked",
  },
  social_clicked: {
    label: "Social link click",
    category: "interaction",
    description: "Social profile link clicked",
  },
};

export const GA4_EVENT_CATEGORY_LABELS: Record<Ga4EventCategory, string> = {
  conversion: "Conversions",
  lead: "Lead capture",
  booking: "Booking funnel",
  engagement: "Engagement",
  interaction: "Interactions",
  other: "Other events",
};

export const GA4_EVENT_CATEGORY_COLORS: Record<Ga4EventCategory, string> = {
  conversion: "#10b981",
  lead: "#1b318b",
  booking: "#38b6ff",
  engagement: "#c96dd8",
  interaction: "#6366f1",
  other: "#9ca3af",
};

export function resolveGa4EventMeta(eventName: string): Ga4EventMeta {
  return (
    GA4_WEBSITE_EVENT_CATALOG[eventName] ?? {
      label: eventName.replace(/_/g, " "),
      category: "other",
      description: "Custom or automatic GA4 event",
    }
  );
}
