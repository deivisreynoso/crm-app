"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import type { WorkspaceBranding } from "@/lib/branding/workspace-branding";

type Props = { token: string };

const BRAND_FALLBACK = "#1D9E75";

const COPY = {
  en: {
    title: "How was your project?",
    rating: "Overall rating",
    worked: "What worked well?",
    improve: "What could we improve?",
    recommend: "Would you recommend us?",
    yes: "Yes",
    maybe: "Maybe",
    no: "No",
    submit: "Submit feedback",
    thanks: "Thank you for your feedback!",
    already: "You already submitted feedback for this project.",
    invalid: "This feedback link is invalid or expired.",
    loading: "Loading…",
    submitError: "Could not submit. Please try again.",
  },
  es: {
    title: "¿Cómo fue tu proyecto?",
    rating: "Calificación general",
    worked: "¿Qué funcionó bien?",
    improve: "¿Qué podríamos mejorar?",
    recommend: "¿Nos recomendarías?",
    yes: "Sí",
    maybe: "Tal vez",
    no: "No",
    submit: "Enviar feedback",
    thanks: "¡Gracias por tu feedback!",
    already: "Ya enviaste feedback para este proyecto.",
    invalid: "Este enlace de feedback no es válido o expiró.",
    loading: "Cargando…",
    submitError: "No se pudo enviar. Intenta de nuevo.",
  },
} as const;

export function PublicProjectFeedbackPage({ token }: Props) {
  const [locale, setLocale] = useState<"en" | "es">("es");
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(5);
  const [whatWorked, setWhatWorked] = useState("");
  const [whatToImprove, setWhatToImprove] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<"yes" | "maybe" | "no">("yes");
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [error, setError] = useState<"invalid" | "submit" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [branding, setBranding] = useState<WorkspaceBranding | null>(null);

  useEffect(() => {
    axios
      .get(`/api/public/project-feedback/${token}`)
      .then((res) => {
        setLocale(res.data.locale === "en" ? "en" : "es");
        if (res.data.branding) setBranding(res.data.branding);
        if (res.data.already_submitted) {
          setAlready(true);
          setDone(true);
        }
      })
      .catch(() => setError("invalid"))
      .finally(() => setLoading(false));
  }, [token]);

  const t = COPY[locale];
  const brandColor = branding?.primary_color ?? BRAND_FALLBACK;
  const companyName = branding?.company_name ?? "ClickIn 360";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/public/project-feedback/${token}`, {
        score,
        what_worked: whatWorked || undefined,
        what_to_improve: whatToImprove || undefined,
        would_recommend: wouldRecommend,
      });
      setDone(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setAlready(true);
        setDone(true);
      } else {
        setError("submit");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm">{COPY.es.loading}</p>
      </div>
    );
  }

  if (error === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-red-600 text-sm text-center">{t.invalid}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 py-10 px-4"
      style={{ fontFamily: branding?.font_family }}
    >
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border p-6 space-y-4">
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt="" className="h-10 w-auto object-contain" />
        ) : null}
        <p className="text-xs uppercase tracking-wide text-slate-500">{companyName}</p>
        <h1 className="text-xl font-semibold text-slate-900">{t.title}</h1>
        {done ? (
          <p className="text-emerald-700 text-sm">{already ? t.already : t.thanks}</p>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            <label className="block text-sm">
              {t.rating}
              <select
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              {t.worked}
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2"
                rows={2}
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              {t.improve}
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2"
                rows={2}
                value={whatToImprove}
                onChange={(e) => setWhatToImprove(e.target.value)}
              />
            </label>
            <fieldset className="text-sm space-y-1">
              <legend>{t.recommend}</legend>
              {(["yes", "maybe", "no"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="recommend"
                    value={value}
                    checked={wouldRecommend === value}
                    onChange={() => setWouldRecommend(value)}
                  />
                  {t[value]}
                </label>
              ))}
            </fieldset>
            {error === "submit" ? (
              <p className="text-sm text-red-600">{t.submitError}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={submitting} style={{ background: brandColor }}>
              {submitting ? "…" : t.submit}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
