import { getAnalyticsConsent } from "@/lib/website/analytics-consent";

export type Ga4DebugEntry = {
  event: string;
  payload: Record<string, string | number | undefined>;
  sent: boolean;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __ga4Log__?: Ga4DebugEntry[];
  }
}

const GTAG_RETRY_MS = 50;
const GTAG_MAX_ATTEMPTS = 40;

function canTrack(): boolean {
  return (
    typeof window !== "undefined" &&
    getAnalyticsConsent() === "granted" &&
    typeof window.gtag === "function"
  );
}

function logGa4Dev(
  event: string,
  payload: Record<string, string | number | undefined>,
  sent: boolean
) {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
    return;
  }
  window.__ga4Log__ = window.__ga4Log__ ?? [];
  window.__ga4Log__.push({ event, payload, sent });
  if (!sent) {
    console.debug("[GA4] skipped (consent or gtag missing)", event, payload);
  } else {
    console.debug("[GA4] event", event, payload);
  }
}

function sendEvent(
  event: string,
  params: Record<string, string | number | undefined>,
  attempt = 0
) {
  const payload = { ...params, timestamp: new Date().toISOString() };

  if (canTrack()) {
    logGa4Dev(event, payload, true);
    window.gtag!("event", event, payload);
    return;
  }

  if (
    typeof window !== "undefined" &&
    getAnalyticsConsent() === "granted" &&
    attempt < GTAG_MAX_ATTEMPTS
  ) {
    window.setTimeout(
      () => sendEvent(event, params, attempt + 1),
      GTAG_RETRY_MS
    );
    return;
  }

  logGa4Dev(event, payload, false);
}

export const ga4Events = {
  formSubmit: (formName: string, formId?: string) => {
    sendEvent("form_submission", {
      form_name: formName,
      form_id: formId ?? formName,
    });
  },

  bookingStart: (service?: string, source?: string) => {
    sendEvent("booking_initiated", {
      service: service ?? "discovery",
      source: source ?? "direct",
    });
  },

  bookingComplete: (bookingId: string, service?: string, date?: string) => {
    sendEvent("booking_completed", {
      booking_id: bookingId,
      service: service ?? "discovery",
      booking_date: date,
    });
    sendEvent("generate_lead", {
      lead_source: "booking_form",
      booking_id: bookingId,
    });
  },

  chatStart: (source?: string) => {
    sendEvent("chat_initiated", {
      source: source ?? "widget",
    });
  },

  chatMessage: (messageType?: string, messageLength?: string) => {
    sendEvent("chat_message_sent", {
      message_type: messageType ?? "user_message",
      message_length: messageLength ?? "medium",
    });
  },

  ctaClick: (ctaName: string, location: string, destination?: string) => {
    sendEvent("cta_click", {
      cta_name: ctaName,
      cta_location: location,
      destination: destination ?? "",
    });
  },

  scrollDepth: (depth: number, pageName?: string) => {
    sendEvent("scroll_depth", {
      depth_percentage: depth,
      page_name:
        pageName ??
        (typeof document !== "undefined" ? document.title : "page"),
    });
  },

  serviceViewed: (serviceName: string, category?: string) => {
    sendEvent("service_viewed", {
      service_name: serviceName,
      service_category: category ?? "general",
    });
  },

  pricingViewed: (pricingTier?: string) => {
    sendEvent("pricing_viewed", {
      pricing_tier: pricingTier ?? "all",
    });
  },

  faqClicked: (faqQuestion: string, faqCategory?: string) => {
    sendEvent("faq_clicked", {
      faq_question: faqQuestion,
      faq_category: faqCategory ?? "general",
    });
  },

  emailClicked: (email: string, location?: string) => {
    sendEvent("email_clicked", {
      email_address: email,
      location: location ?? "footer",
    });
  },

  phoneClicked: (phone: string, location?: string) => {
    sendEvent("phone_clicked", {
      phone_number: phone,
      location: location ?? "header",
    });
  },

  socialClicked: (platform: string, location?: string) => {
    sendEvent("social_clicked", {
      social_platform: platform,
      location: location ?? "footer",
    });
  },

  testimonialViewed: (testimonialAuthor: string, company?: string) => {
    sendEvent("testimonial_viewed", {
      author: testimonialAuthor,
      company: company ?? "unknown",
    });
  },
};
