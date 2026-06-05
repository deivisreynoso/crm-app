"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Check, Clock } from "lucide-react";
import { ga4Events } from "@/lib/analytics/ga4-events";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/phone";
import type { Locale } from "@/lib/website/i18n";

type Props = { lang: Locale };

type BookingSlot = { time: string; label: string };

type AvailabilityMeta = {
  hint: string;
  min_date: string;
  max_date: string;
  meeting_duration_minutes: number;
  timezone: string;
};

type SubmitResult = {
  returning_visitor: boolean;
};

function formatDisplayDate(dateStr: string, lang: Locale): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function WebsiteBookingForm({ lang }: Props) {
  const bookingStarted = useRef(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [availability, setAvailability] = useState<AvailabilityMeta | null>(null);

  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);

  const labels =
    lang === "es"
      ? {
          stepContact: "Tus datos",
          stepQualify: "Tu negocio",
          stepSchedule: "Agendar",
          name: "Nombre",
          email: "Correo",
          phone: "Teléfono",
          phoneHint: "Selecciona +52 (México) o +1 (EE.UU.)",
          company: "Empresa (opcional)",
          platform: "Plataforma eCommerce",
          friction: "Mayor desafío",
          channels: "Canales de soporte",
          frictionPoint: "Describe el punto de fricción",
          pickDate: "Elige un día",
          pickTime: "Elige un horario",
          pickTimeHint: "Solo mostramos horarios disponibles para el día que elijas.",
          loadingSlots: "Cargando horarios…",
          noSlots: "No hay horarios este día. Prueba otra fecha.",
          selected: "Tu cita",
          duration: "min",
          next: "Siguiente",
          back: "Atrás",
          submit: "Confirmar llamada",
          successNew:
            "¡Gracias! Recibimos tu solicitud. Te contactaremos para confirmar tu llamada.",
          successReturning:
            "¡Bienvenido de nuevo! Registramos tu nueva solicitud de llamada. Nuestro equipo te contactará pronto.",
          nextActions: "¿Qué puedes hacer ahora?",
          chat: "Hablar con IA",
          home: "Volver al inicio",
          login: "Acceder al CRM",
          loginHint: "Si tienes cuenta de equipo, inicia sesión para ver tu historial.",
        }
      : {
          stepContact: "Your details",
          stepQualify: "Your business",
          stepSchedule: "Schedule",
          name: "Name",
          email: "Email",
          phone: "Phone",
          phoneHint: "Choose +52 (Mexico) or +1 (US)",
          company: "Company (optional)",
          platform: "eCommerce platform",
          friction: "Biggest challenge",
          channels: "Support channels",
          frictionPoint: "Describe your main friction point",
          pickDate: "Pick a day",
          pickTime: "Pick a time",
          pickTimeHint: "We only show open slots for the day you select.",
          loadingSlots: "Loading times…",
          noSlots: "No times on this day. Try another date.",
          selected: "Your call",
          duration: "min",
          next: "Next",
          back: "Back",
          submit: "Confirm call",
          successNew:
            "Thank you! We received your request and will contact you to confirm your call.",
          successReturning:
            "Welcome back! Your new call request is logged. Our team will follow up soon.",
          nextActions: "What you can do next",
          chat: "Chat with AI",
          home: "Back to home",
          login: "Sign in to CRM",
          loginHint: "If you have a team account, sign in to view your history.",
        };

  const stepLabels = [labels.stepContact, labels.stepQualify, labels.stepSchedule];

  const [dialCode, setDialCode] = useState("+52");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    company: "",
    platform: "Shopify",
    friction_area: "before-purchase",
    communication_channels: "web-chat",
    friction_point: "",
    date: "",
    time: "",
  });

  useEffect(() => {
    void fetch(`/api/leads/booking-availability?lang=${lang}`)
      .then((r) => r.json())
      .then((data: AvailabilityMeta) => setAvailability(data))
      .catch(() => null);
  }, [lang]);

  const loadSlots = useCallback(
    async (date: string) => {
      if (!date) {
        setSlots([]);
        setSlotsMessage(null);
        return;
      }
      setSlotsLoading(true);
      setSlotsMessage(null);
      setForm((f) => ({ ...f, time: "" }));
      try {
        const res = await fetch(
          `/api/leads/booking-slots?date=${encodeURIComponent(date)}&lang=${lang}`
        );
        const data = (await res.json()) as {
          slots?: BookingSlot[];
          message?: string | null;
        };
        setSlots(data.slots ?? []);
        setSlotsMessage(data.message ?? null);
      } catch {
        setSlots([]);
        setSlotsMessage(labels.noSlots);
      } finally {
        setSlotsLoading(false);
      }
    },
    [lang, labels.noSlots]
  );

  useEffect(() => {
    if (!bookingStarted.current) {
      bookingStarted.current = true;
      ga4Events.bookingStart("discovery", "booking-page");
    }
  }, []);

  function goToNextStep() {
    setStep((s) => {
      const next = s + 1;
      if (next === 3 && form.date) {
        void loadSlots(form.date);
      }
      return next;
    });
  }

  const fullPhone = formatPhone(dialCode, form.phoneNumber);
  const selectedSlot = slots.find((s) => s.time === form.time);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.time) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/form-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_info: {
            name: form.name,
            email: form.email,
            phone: fullPhone,
            company: form.company || undefined,
          },
          qualification: {
            platform: form.platform,
            friction_area: [form.friction_area],
            communication_channels: [form.communication_channels],
            friction_point: form.friction_point,
          },
          calendar_selection: {
            date: form.date,
            time: form.time,
            timezone: availability?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          source: "form",
          language: lang,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        returning_visitor?: boolean;
        contact_id?: string;
        calendar_event_id?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Submission failed");
      }

      const bookingId = data.calendar_event_id ?? data.contact_id ?? "unknown";
      ga4Events.formSubmit("booking_form", "book-call-page");
      ga4Events.bookingComplete(
        bookingId,
        "discovery",
        `${form.date} ${form.time}`
      );

      setSubmitResult({ returning_visitor: Boolean(data.returning_visitor) });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    const returning = submitResult?.returning_visitor;
    return (
      <div className="space-y-4">
        <p
          className={`text-sm rounded-lg p-4 ${
            returning
              ? "text-[var(--primary)] bg-[var(--primary)]/10"
              : "text-emerald-700 bg-emerald-500/10"
          }`}
        >
          {returning ? labels.successReturning : labels.successNew}
        </p>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4 space-y-3">
          <p className="text-xs font-semibold text-heading uppercase tracking-wide">
            {labels.nextActions}
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Link href={`/${lang}#chat`}>
              <Button type="button" variant="outline" size="sm">
                {labels.chat}
              </Button>
            </Link>
            <Link href={`/${lang}`}>
              <Button type="button" variant="outline" size="sm">
                {labels.home}
              </Button>
            </Link>
            <Link href="/login">
              <Button type="button" size="sm">
                {labels.login}
              </Button>
            </Link>
          </div>
          <p className="text-xs text-body-muted">{labels.loginHint}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}
      className="space-y-5"
    >
      <nav aria-label="Progress" className="flex items-center gap-2">
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const completed = step > n;
          return (
            <div key={label} className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  active
                    ? "bg-[var(--primary)] text-white"
                    : completed
                      ? "bg-[var(--secondary)]/20 text-[var(--secondary)]"
                      : "bg-[var(--surface-subtle)] text-body-muted border border-[var(--card-border)]"
                }`}
              >
                {completed ? <Check className="w-3.5 h-3.5" /> : n}
              </span>
              <span
                className={`text-xs font-medium truncate hidden sm:block ${
                  active ? "text-heading" : "text-body-muted"
                }`}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <span className="h-px flex-1 bg-[var(--card-border)] min-w-[8px]" />
              )}
            </div>
          );
        })}
      </nav>

      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg p-3">{error}</p>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              {labels.name}
            </label>
            <input
              className="input-field w-full"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              {labels.email}
            </label>
            <input
              className="input-field w-full"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              {labels.phone}
            </label>
            <p className="text-[10px] text-body-muted mb-1">{labels.phoneHint}</p>
            <div className="flex gap-2">
              <select
                className="input-field w-[5.5rem] shrink-0"
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                aria-label="Country code"
              >
                <option value="+52">+52 MX</option>
                <option value="+1">+1 US</option>
              </select>
              <input
                className="input-field flex-1 min-w-0"
                type="tel"
                inputMode="tel"
                required
                placeholder={dialCode === "+52" ? "55 1234 5678" : "555 123 4567"}
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    phoneNumber: e.target.value.replace(/[^\d\s()-]/g, ""),
                  }))
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              {labels.company}
            </label>
            <input
              className="input-field w-full"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              {labels.platform}
            </label>
            <select
              className="input-field w-full"
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            >
              <option>Shopify</option>
              <option>WooCommerce</option>
              <option>Tiendanube</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              {labels.friction}
            </label>
            <select
              className="input-field w-full"
              value={form.friction_area}
              onChange={(e) => setForm((f) => ({ ...f, friction_area: e.target.value }))}
            >
              <option value="before-purchase">
                {lang === "es" ? "Antes de comprar" : "Before purchase"}
              </option>
              <option value="after-purchase">
                {lang === "es" ? "Después de comprar" : "After purchase"}
              </option>
              <option value="both">{lang === "es" ? "Ambos" : "Both"}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              {labels.channels}
            </label>
            <input
              className="input-field w-full"
              value={form.communication_channels}
              onChange={(e) =>
                setForm((f) => ({ ...f, communication_channels: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              {labels.frictionPoint}
            </label>
            <textarea
              className="input-field w-full min-h-[80px]"
              value={form.friction_point}
              onChange={(e) => setForm((f) => ({ ...f, friction_point: e.target.value }))}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          {availability?.hint && (
            <p className="text-xs text-body-muted flex items-start gap-2 rounded-lg bg-[var(--surface-subtle)] p-3 border border-[var(--card-border)]">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-[var(--primary)]" />
              <span>{availability.hint}</span>
            </p>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-heading mb-2">
              <Calendar className="w-3.5 h-3.5" />
              {labels.pickDate}
            </label>
            <input
              type="date"
              className="input-field w-full"
              required
              min={availability?.min_date}
              max={availability?.max_date}
              value={form.date}
              onChange={(e) => {
                const date = e.target.value;
                setForm((f) => ({ ...f, date, time: "" }));
                void loadSlots(date);
              }}
            />
          </div>

          {form.date && (
            <div>
              <label className="block text-xs font-medium text-heading mb-1">
                {labels.pickTime}
              </label>
              <p className="text-[10px] text-body-muted mb-3">{labels.pickTimeHint}</p>

              {slotsLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 rounded-lg bg-[var(--surface-subtle)] animate-pulse"
                    />
                  ))}
                </div>
              ) : slots.length > 0 ? (
                <div
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                  role="listbox"
                  aria-label={labels.pickTime}
                >
                  {slots.map((slot) => {
                    const selected = form.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setForm((f) => ({ ...f, time: slot.time }))}
                        className={`h-10 rounded-lg text-sm font-medium border transition-all ${
                          selected
                            ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                            : "bg-[var(--card)] text-heading border-[var(--card-border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-body-muted rounded-lg border border-dashed border-[var(--card-border)] p-4 text-center">
                  {slotsMessage ?? labels.noSlots}
                </p>
              )}
            </div>
          )}

          {form.date && selectedSlot && availability && (
            <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-heading uppercase tracking-wide">
                  {labels.selected}
                </p>
                <p className="text-sm font-medium text-heading mt-0.5">
                  {formatDisplayDate(form.date, lang)} · {selectedSlot.label}
                </p>
                <p className="text-xs text-body-muted mt-1">
                  {availability.meeting_duration_minutes} {labels.duration}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-[var(--card-border)]">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            {labels.back}
          </Button>
        )}
        {step < 3 ? (
          <Button
            type="button"
            className="ml-auto"
            onClick={goToNextStep}
            disabled={
              step === 1 &&
              (!form.name.trim() || !form.email.trim() || !form.phoneNumber.trim())
            }
          >
            {labels.next}
          </Button>
        ) : (
          <Button
            type="submit"
            className="ml-auto"
            disabled={loading || !form.date || !form.time}
          >
            {loading ? "…" : labels.submit}
          </Button>
        )}
      </div>
    </form>
  );
}
