"use client";

import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { ga4Events } from "@/lib/analytics/ga4-events";
import { GOOGLE_REVIEWS_URL } from "@/lib/website/google-reviews-url";
import type { WebsiteDictionary } from "@/lib/website/i18n";

type Props = {
  dict: WebsiteDictionary;
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-[var(--card-border)]"
          }`}
          strokeWidth={1.5}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function WebsiteGoogleReviews({ dict }: Props) {
  const { reviews } = dict;

  return (
    <section id="reviews" className="py-20 sm:py-28 bg-[var(--surface-subtle)] scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">
            {reviews.badge}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
            {reviews.title}
          </h2>
          <p className="mt-4 text-body-muted text-lg">{reviews.subtitle}</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <StarRow rating={5} />
            <span className="text-sm text-body-muted">{reviews.ratingNote}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.items.map((item) => (
            <article
              key={`${item.name}-${item.text.slice(0, 24)}`}
              className="website-card-lift flex flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]"
              onMouseEnter={() =>
                ga4Events.testimonialViewed(item.name, item.role ?? undefined)
              }
            >
              <StarRow rating={item.rating} />
              <blockquote className="mt-4 flex-1 text-sm text-heading leading-relaxed">
                &ldquo;{item.text}&rdquo;
              </blockquote>
              <footer className="mt-5 pt-4 border-t border-[var(--card-border)]">
                <p className="font-semibold text-heading text-sm">{item.name}</p>
                {item.role ? (
                  <p className="text-xs text-body-muted mt-0.5">{item.role}</p>
                ) : null}
              </footer>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-95 transition-opacity"
            onClick={() => ga4Events.socialClicked("google_reviews", "reviews-section")}
          >
            {reviews.cta}
            <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
