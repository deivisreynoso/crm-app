"use client";

import { TrackedLink } from "@/components/website/tracked-link";
import { PackageCard } from "@/components/website/package-card";

export { PackageCard } from "@/components/website/package-card";
import {
  ArrowRight,
  Bot,
  MessageCircle,
  Phone,
  ShoppingCart,
  Sparkles,
  Workflow,
  Zap,
  Headphones,
  Shield,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WebsiteFaq } from "@/components/website/website-faq";
import { WebsiteGoogleReviews } from "@/components/website/website-google-reviews";
import { SubtleCta } from "@/components/website/subtle-cta";
import { ChatOpenButton } from "@/components/website/chat-open-trigger";
import { HeroMascot } from "@/components/website/hero-mascot";
import type { Locale, WebsiteDictionary } from "@/lib/website/i18n";

type Props = { lang: Locale; dict: WebsiteDictionary };

const stepIcons = [MessageCircle, Zap, Database, Bot, Headphones];

export function WebsiteHomeSections({ lang, dict }: Props) {
  return (
    <>
      {/* Hero — primary CTAs */}
      <section className="website-hero-glow text-white relative overflow-hidden min-h-0 lg:min-h-[min(80vh,720px)] flex items-center">
        <div className="absolute inset-0 website-dot-grid opacity-[0.07] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="website-stagger text-center lg:text-left space-y-6">
              <span className="website-pill bg-white/15 border-white/30 text-white inline-flex">
                <Sparkles className="w-3.5 h-3.5" />
                {dict.hero.badge}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.12] font-[family-name:var(--font-heading)] text-white">
                <span className="block">{dict.hero.headlineLine1}</span>
                <span className="block mt-1">
                  {dict.hero.headlineLine2}
                  <span className="text-[#7dd3fc]">{dict.hero.headlineAccent}</span>
                </span>
              </h1>
              <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {dict.hero.subheadline}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                <TrackedLink
                  href={`/${lang}/book-call`}
                  ctaName={dict.hero.ctaPrimary}
                  ctaLocation="hero"
                  className="website-cta-primary inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl text-base w-full sm:w-auto"
                >
                  {dict.hero.ctaPrimary}
                  <ArrowRight className="w-4 h-4" />
                </TrackedLink>
                <ChatOpenButton className="website-cta-secondary inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl text-base w-full sm:w-auto">
                  <MessageCircle className="w-4 h-4" />
                  {dict.hero.ctaSecondary}
                </ChatOpenButton>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-md mx-auto lg:mx-0">
                {dict.hero.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-3 text-center"
                  >
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-white/75 leading-tight mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <HeroMascot />
          </div>
        </div>
      </section>

      {/* Problem — subtle chat CTA */}
      <section id="problem" className="py-20 sm:py-28 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
              {dict.problem.title}
            </h2>
            <p className="mt-4 text-body-muted text-lg">{dict.problem.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            <ProblemCard
              icon={ShoppingCart}
              title={dict.problem.beforeTitle}
              points={dict.problem.beforePoints}
              accent="from-[#38b6ff]/20 to-[#3e5fde]/10"
            />
            <ProblemCard
              icon={MessageCircle}
              title={dict.problem.afterTitle}
              points={dict.problem.afterPoints}
              accent="from-[#c96dd8]/20 to-[#9f41af]/10"
            />
          </div>
          <div className="mt-10 flex justify-center">
            <SubtleCta lang={lang} variant="chat" label={dict.ctaSubtle.chat} />
          </div>
        </div>
      </section>

      {/* Solution — subtle book CTA */}
      <section id="solution" className="py-20 sm:py-28 website-dot-grid bg-[var(--surface-subtle)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
              {dict.solution.title}
            </h2>
            <p className="mt-4 text-body-muted text-lg">{dict.solution.subtitle}</p>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {dict.solution.steps.map((step, i) => {
              const Icon = stepIcons[i] ?? Workflow;
              return (
                <li
                  key={step.title}
                  className="website-card-lift relative rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="absolute top-4 right-4 text-2xl font-bold text-[var(--secondary)]/30">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-heading text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-body-muted leading-relaxed">{step.desc}</p>
                </li>
              );
            })}
          </ol>
          <div className="mt-10 flex justify-center">
            <SubtleCta lang={lang} variant="book" label={dict.ctaSubtle.book} />
          </div>
        </div>
      </section>

      {/* Offers — two packages + voice add-on */}
      <section id="offers" className="py-20 sm:py-28 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
              {dict.offers.sectionTitle}
            </h2>
            <p className="mt-4 text-body-muted text-lg">{dict.offers.sectionSubtitle}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {dict.offers.packages.map((pkg) => (
              <PackageCard key={pkg.label} lang={lang} dict={dict} pkg={pkg} />
            ))}
          </div>

          <OfferOutcomesSection dict={dict} />

          <article className="mt-8 rounded-3xl border border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)] p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-[var(--accent)]/15 flex items-center justify-center text-[var(--primary)]">
              <Phone className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                  {dict.offers.voice.subtitle}
                </p>
                <h3 className="text-xl font-bold text-heading mt-1">{dict.offers.voice.title}</h3>
              </div>
              <p className="text-sm text-body-muted leading-relaxed">{dict.offers.voice.desc}</p>
              <ul className="flex flex-wrap gap-2">
                {dict.offers.voice.bullets.map((b) => (
                  <li
                    key={b}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--card-border)] text-heading"
                  >
                    {b}
                  </li>
                ))}
              </ul>
              <SubtleCta lang={lang} variant="book" label={dict.ctaSubtle.book} />
            </div>
          </article>
        </div>
      </section>

      {/* Platforms — subtle chat */}
      <section id="platforms" className="py-20 sm:py-28 bg-[var(--surface-subtle)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
              {dict.platforms.title}
            </h2>
            <p className="mt-4 text-body-muted">{dict.platforms.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <PlatformList title={dict.platforms.platformsTitle} items={dict.platforms.platforms} />
            <PlatformList title={dict.platforms.channelsTitle} items={dict.platforms.channels} />
          </div>
          <div className="mt-10 flex justify-center">
            <SubtleCta lang={lang} variant="chat" label={dict.ctaSubtle.chat} />
          </div>
        </div>
      </section>

      {/* About — subtle book */}
      <section id="about" className="py-20 sm:py-28 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
                {dict.about.title}
              </h2>
              <p className="mt-3 text-lg text-[var(--secondary)] font-medium">{dict.about.subtitle}</p>
              <div className="mt-6 space-y-4 text-body-muted leading-relaxed">
                {dict.about.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <div className="mt-8">
                <SubtleCta lang={lang} variant="book" label={dict.ctaSubtle.book} />
              </div>
            </div>
            <div className="grid gap-4">
              {dict.about.values.map((v) => (
                <div
                  key={v.title}
                  className="website-card-lift flex gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--secondary)]/15 flex items-center justify-center text-[var(--primary)]">
                    {v.title.includes("Datos") || v.title.includes("Connected") ? (
                      <Database className="w-5 h-5" />
                    ) : v.title.includes("Canal") || v.title.includes("channel") ? (
                      <MessageCircle className="w-5 h-5" />
                    ) : (
                      <Shield className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-heading">{v.title}</h3>
                    <p className="text-sm text-body-muted mt-1">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <WebsiteGoogleReviews dict={dict} />

      <WebsiteFaq dict={dict} />

      {/* Chat — N8N embed when configured */}
      <section id="chat" className="py-16 bg-[var(--background)] scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--secondary)]/20 text-[var(--primary)] mb-4">
              <Bot className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-heading">{dict.chat.title}</h2>
            <p className="mt-2 text-sm text-body-muted max-w-md mx-auto">{dict.chat.desc}</p>
          </div>
          <div className="flex justify-center">
            <ChatOpenButton className="website-cta-primary inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl text-base">
              <MessageCircle className="w-4 h-4" />
              {dict.chat.title}
            </ChatOpenButton>
          </div>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <TrackedLink
              href={`/${lang}/book-call`}
              ctaName={dict.nav.book}
              ctaLocation="chat-section"
            >
              <Button variant="ghost" className="text-[var(--muted)]">
                {dict.nav.book}
              </Button>
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* Final CTA — single focused action */}
      <section className="website-hero-glow text-white py-20 sm:py-24">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-5">
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)]">
            {dict.cta.title}
          </h2>
          <p className="text-lg text-white/90">{dict.cta.subtitle}</p>
          <TrackedLink
            href={`/${lang}/book-call`}
            className="inline-block pt-2"
            ctaName={dict.cta.book}
            ctaLocation="final-cta"
          >
            <button
              type="button"
              className="website-cta-primary inline-flex items-center justify-center gap-2 h-12 px-10 rounded-xl text-base"
            >
              {dict.cta.book}
              <ArrowRight className="w-4 h-4" />
            </button>
          </TrackedLink>
          <p className="pt-2">
            <SubtleCta
              lang={lang}
              variant="chat"
              label={dict.ctaSubtle.chat}
              className="!text-white/80 hover:!text-white"
            />
          </p>
        </div>
      </section>
    </>
  );
}

function ProblemCard({
  icon: Icon,
  title,
  points,
  accent,
}: {
  icon: typeof ShoppingCart;
  title: string;
  points: string[];
  accent: string;
}) {
  return (
    <div
      className={`website-card-lift rounded-3xl border border-[var(--card-border)] bg-gradient-to-br ${accent} p-8 shadow-[var(--shadow-sm)]`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[var(--card)] flex items-center justify-center text-[var(--primary)] shadow-sm mb-5">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-heading mb-4">{title}</h3>
      <ul className="space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-sm text-body-muted">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--secondary)] shrink-0" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OfferOutcomesSection({ dict }: { dict: WebsiteDictionary }) {
  const o = dict.offers.outcomes;
  return (
    <div className="mt-10 rounded-3xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-6 sm:p-10">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h3 className="text-xl sm:text-2xl font-bold text-heading font-[family-name:var(--font-heading)]">
          {o.title}
        </h3>
        <p className="mt-2 text-sm text-body-muted">{o.subtitle}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <ul className="space-y-2">
          {o.benefits.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-body-muted">
              <span className="text-[var(--secondary)] font-bold">·</span>
              {b}
            </li>
          ))}
        </ul>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-heading mb-3">
            {o.idealTitle}
          </h4>
          <div className="flex flex-wrap gap-2">
            {o.idealFor.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--card)] text-heading border border-[var(--card-border)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function PlatformList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
      <h3 className="font-bold text-heading mb-4">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-[var(--primary)]/8 text-heading border border-[var(--card-border)]"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
