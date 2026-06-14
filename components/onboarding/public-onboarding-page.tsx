"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";

type Props = { token: string };

type OnboardingData = {
  contact: { first_name: string; last_name: string; email?: string | null };
  company_name: string;
  locale: "en" | "es";
  onboarding_completed_at: string | null;
};

const COPY = {
  en: {
    title: "Welcome — let's get started",
    subtitle: "Tell us a bit about your business so we can prepare your kickoff.",
    platform: "E-commerce platform",
    goals: "Primary goals",
    timeline: "Desired timeline",
    notes: "Anything else we should know?",
    submit: "Submit questionnaire",
    thanks: "Thank you! Your onboarding questionnaire has been received.",
    already: "You already completed this questionnaire.",
  },
  es: {
    title: "Bienvenido — comencemos",
    subtitle: "Cuéntanos sobre tu negocio para preparar tu kickoff.",
    platform: "Plataforma eCommerce",
    goals: "Objetivos principales",
    timeline: "Timeline deseado",
    notes: "¿Algo más que debamos saber?",
    submit: "Enviar cuestionario",
    thanks: "¡Gracias! Recibimos tu cuestionario de onboarding.",
    already: "Ya completaste este cuestionario.",
  },
};

export function PublicOnboardingPage({ token }: Props) {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState("");
  const [goals, setGoals] = useState("");
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    axios
      .get(`/api/public/onboarding/${token}`)
      .then((res) => {
        setData(res.data);
        if (res.data.onboarding_completed_at) setDone(true);
      })
      .catch(() => setError("This onboarding link is invalid or expired."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-red-600">{error ?? "Not found"}</p>
      </div>
    );
  }

  const t = COPY[data.locale] ?? COPY.es;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await axios.post(`/api/public/onboarding/${token}`, {
      locale: data!.locale,
      responses: { platform, goals, timeline, notes },
    });
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">{data.company_name}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{t.title}</h1>
        <p className="text-sm text-slate-600">
          {t.subtitle} {data.contact.first_name ? `— ${data.contact.first_name}` : ""}
        </p>
        {done ? (
          <p className="text-emerald-700 text-sm">{data.onboarding_completed_at ? t.already : t.thanks}</p>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            <Field label={t.platform} value={platform} onChange={setPlatform} />
            <Field label={t.goals} value={goals} onChange={setGoals} />
            <Field label={t.timeline} value={timeline} onChange={setTimeline} />
            <Field label={t.notes} value={notes} onChange={setNotes} multiline />
            <Button type="submit" className="w-full">
              {t.submit}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-800">{label}</span>
      {multiline ? (
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
