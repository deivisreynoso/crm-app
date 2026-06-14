"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";

type Props = { token: string };

const COPY = {
  en: {
    title: "How did we do?",
    rating: "Overall rating",
    comment: "Comments (optional)",
    recommend: "Would you recommend us?",
    submit: "Submit feedback",
    thanks: "Thank you for your feedback!",
  },
  es: {
    title: "¿Cómo lo hicimos?",
    rating: "Calificación general",
    comment: "Comentarios (opcional)",
    recommend: "¿Nos recomendarías?",
    submit: "Enviar feedback",
    thanks: "¡Gracias por tu feedback!",
  },
};

export function PublicFeedbackPage({ token }: Props) {
  const [locale, setLocale] = useState<"en" | "es">("es");
  const [company, setCompany] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [recommend, setRecommend] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`/api/public/feedback/${token}`)
      .then((res) => {
        setLocale(res.data.locale === "en" ? "en" : "es");
        setCompany(res.data.company_name ?? "");
      })
      .catch(() => setError("Invalid feedback link."));
  }, [token]);

  const t = COPY[locale];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await axios.post(`/api/public/feedback/${token}`, {
      rating,
      comment,
      would_recommend: recommend,
      locale,
    });
    setDone(true);
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <p className="text-xs uppercase text-slate-500">{company}</p>
        <h1 className="text-xl font-semibold">{t.title}</h1>
        {done ? (
          <p className="text-emerald-700 text-sm">{t.thanks}</p>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            <label className="block text-sm">
              {t.rating}
              <select
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              {t.comment}
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recommend}
                onChange={(e) => setRecommend(e.target.checked)}
              />
              {t.recommend}
            </label>
            <Button type="submit" className="w-full">
              {t.submit}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
