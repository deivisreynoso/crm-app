"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  CHANNEL_OPTIONS,
  ECOMMERCE_PLATFORM_OPTIONS,
  ESCALATION_TRIGGER_OPTIONS,
  getQuestionnaireCopy,
  GOAL_OPTIONS,
  INTEGRATION_OPTIONS,
  KB_DOCUMENT_OPTIONS,
  optionLabel,
  ORDER_INFO_OPTIONS,
  PERSONALITY_OPTIONS,
  QUESTIONNAIRE_SECTION_COUNT,
  RETURNS_ACCEPTED_OPTIONS,
  RETURNS_AUTOMATION_OPTIONS,
  SECTION_COPY,
  summarySections,
  TONE_OPTIONS,
  type CheckboxOption,
  type OnboardingLocale,
  type SelectOption,
} from "@/lib/onboarding/questionnaire-copy";
import {
  emptyQuestionnaireResponses,
  type OnboardingQuestionnaireResponses,
} from "@/lib/onboarding/questionnaire-types";

type Props = { token: string };

type OnboardingData = {
  contact: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  };
  company_name: string;
  locale: OnboardingLocale;
  onboarding_completed_at: string | null;
};

const BRAND = "#1D9E75";

type WizardPhase = "steps" | "summary" | "done";

export function PublicOnboardingPage({ token }: Props) {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<WizardPhase>("steps");
  const [responses, setResponses] = useState<OnboardingQuestionnaireResponses>(
    emptyQuestionnaireResponses
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wasAlreadyDone, setWasAlreadyDone] = useState(false);

  useEffect(() => {
    axios
      .get(`/api/public/onboarding/${token}`)
      .then((res) => {
        setData(res.data);
        const contact = res.data.contact;
        const owner = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
        setResponses((prev) => ({
          ...prev,
          project: {
            ...prev.project,
            company: contact.company ?? "",
            owner,
            email: contact.email ?? "",
            whatsapp: contact.phone ?? "",
          },
        }));
        if (res.data.onboarding_completed_at) {
          setWasAlreadyDone(true);
          setPhase("done");
        }
      })
      .catch(() => setError("invalid"))
      .finally(() => setLoading(false));
  }, [token]);

  const locale = data?.locale ?? "es";
  const t = getQuestionnaireCopy(locale);
  const total = QUESTIONNAIRE_SECTION_COUNT;
  const progressPct =
    phase === "summary" || phase === "done"
      ? 100
      : Math.round((step / total) * 100);

  const updateProject = useCallback(
    (key: keyof OnboardingQuestionnaireResponses["project"], value: string) => {
      setResponses((prev) => ({
        ...prev,
        project: { ...prev.project, [key]: value },
      }));
    },
    []
  );

  const updateAgent = useCallback(
    (key: keyof OnboardingQuestionnaireResponses["agent"], value: string) => {
      setResponses((prev) => ({
        ...prev,
        agent: { ...prev.agent, [key]: value },
      }));
    },
    []
  );

  const toggleArray = useCallback(
    (key: "goals" | "channels", value: string) => {
      setResponses((prev) => {
        const arr = prev[key];
        const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const toggleEscalation = useCallback((value: string) => {
    setResponses((prev) => {
      const arr = prev.escalation.triggers;
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, escalation: { ...prev.escalation, triggers: next } };
    });
  }, []);

  const toggleKb = useCallback((value: string) => {
    setResponses((prev) => {
      const arr = prev.knowledge_base.documents;
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, knowledge_base: { ...prev.knowledge_base, documents: next } };
    });
  }, []);

  const toggleOrderInfo = useCallback((value: string) => {
    setResponses((prev) => {
      const arr = prev.ecommerce.order_info_shared;
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, ecommerce: { ...prev.ecommerce, order_info_shared: next } };
    });
  }, []);

  const toggleIntegration = useCallback((value: string) => {
    setResponses((prev) => {
      const arr = prev.integrations.confirmed;
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, integrations: { ...prev.integrations, confirmed: next } };
    });
  }, []);

  async function submitQuestionnaire() {
    setSubmitting(true);
    setSubmitError(false);
    try {
      await axios.post(`/api/public/onboarding/${token}`, {
        locale,
        responses,
      });
      setPhase("done");
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  function copySummary() {
    const sections = summarySections(responses, locale);
    let text = `${t.pageTitle.toUpperCase()}\n${"=".repeat(28)}\n\n`;
    for (const section of sections) {
      text += `${section.title.toUpperCase()}\n`;
      for (const line of section.lines) {
        if (!line.endsWith(": —") && !line.endsWith(": ")) text += `${line}\n`;
      }
      text += "\n";
    }
    void navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(responses, null, 2)], { type: "application/json" });
    const slug = (responses.project.company || "client").toLowerCase().replace(/\s+/g, "-");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `onboarding-${slug}.json`;
    a.click();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f3]">
        <p className="text-[#5f5e5a]">{t.loading}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f3] px-4">
        <p className="text-red-600">{t.invalidLink}</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen bg-[#f5f5f3] py-8 px-4">
        <div className="max-w-[680px] mx-auto">
          <div
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl mb-4"
            style={{ background: "#E1F5EE", color: BRAND }}
          >
            ✓
          </div>
          <p className="text-[#5f5e5a] text-sm mb-1">{data.company_name}</p>
          <h1 className="text-lg font-semibold text-[#1a1a18] mb-3">
            {wasAlreadyDone ? t.already : t.thanks}
          </h1>
          {!wasAlreadyDone && (
            <div className="space-y-3 mt-6">
              {summarySections(responses, locale).map((section) => (
                <SummaryCard key={section.title} title={section.title} lines={section.lines} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] py-8 px-4">
      <div className="max-w-[680px] mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wide text-[#5f5e5a] mb-1">{data.company_name}</p>
          <h1 className="text-[22px] font-semibold text-[#1a1a18] mb-1.5">{t.pageTitle}</h1>
          <p className="text-sm text-[#5f5e5a] leading-relaxed">{t.pageSubtitle}</p>
        </header>

        <div className="h-[3px] bg-[#e5e5e3] rounded-sm mb-8 overflow-hidden">
          <div
            className="h-full rounded-sm transition-all duration-300"
            style={{ width: `${progressPct}%`, background: BRAND }}
          />
        </div>

        {phase === "summary" ? (
          <div>
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl mb-4"
              style={{ background: "#E1F5EE", color: BRAND }}
            >
              ✓
            </div>
            <h2 className="text-lg font-semibold text-[#1a1a18] mb-1">{t.doneTitle}</h2>
            <p className="text-sm text-[#5f5e5a] mb-6">{t.summarySubtitle}</p>
            <div className="space-y-3 mb-6">
              {summarySections(responses, locale).map((section) => (
                <SummaryCard key={section.title} title={section.title} lines={section.lines} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5 mb-6">
              <button
                type="button"
                onClick={copySummary}
                className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg border border-[#d3d1c7] bg-white text-[#5f5e5a] hover:bg-[#f5f5f3]"
              >
                {copied ? t.copied : t.copySummary}
              </button>
              <button
                type="button"
                onClick={downloadJson}
                className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg border border-[#d3d1c7] bg-white text-[#5f5e5a] hover:bg-[#f5f5f3]"
              >
                {t.downloadJson}
              </button>
            </div>
            {submitError && (
              <p className="text-sm text-red-600 mb-3">
                {locale === "en" ? "Could not submit. Please try again." : "No se pudo enviar. Intenta de nuevo."}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPhase("steps");
                  setStep(total);
                }}
              >
                {t.back}
              </Button>
              <Button
                type="button"
                className="text-white border-0"
                style={{ background: BRAND }}
                disabled={submitting}
                onClick={() => void submitQuestionnaire()}
              >
                {submitting ? t.submitting : t.submit}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: BRAND }}>
              {t.sectionLabel(step, total)}
            </p>
            <h2 className="text-lg font-semibold text-[#1a1a18] mb-6">
              {SECTION_COPY[step - 1].title[locale]}
            </h2>

            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label={t.fields.company} value={responses.project.company} onChange={(v) => updateProject("company", v)} />
                  <TextField label={t.fields.owner} value={responses.project.owner} onChange={(v) => updateProject("owner", v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label={t.fields.email} type="email" value={responses.project.email} onChange={(v) => updateProject("email", v)} />
                  <TextField label={t.fields.whatsapp} value={responses.project.whatsapp} onChange={(v) => updateProject("whatsapp", v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label={t.fields.launchDate} value={responses.project.launch_date} onChange={(v) => updateProject("launch_date", v)} />
                  <TextField label={t.fields.approver} value={responses.project.approver} onChange={(v) => updateProject("approver", v)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <CheckboxGroup
                  label={t.goalsHint}
                  options={GOAL_OPTIONS}
                  selected={responses.goals}
                  locale={locale}
                  onToggle={(v) => toggleArray("goals", v)}
                />
                <Divider />
                <CheckboxGroup
                  label={t.channelsHint}
                  options={CHANNEL_OPTIONS}
                  selected={responses.channels}
                  locale={locale}
                  onToggle={(v) => toggleArray("channels", v)}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label={t.fields.agentName} value={responses.agent.name} onChange={(v) => updateAgent("name", v)} />
                  <SelectField
                    label={t.fields.personality}
                    value={responses.agent.personality}
                    options={PERSONALITY_OPTIONS}
                    locale={locale}
                    onChange={(v) => updateAgent("personality", v)}
                  />
                </div>
                <SelectField
                  label={t.fields.tone}
                  value={responses.agent.tone}
                  options={TONE_OPTIONS}
                  locale={locale}
                  onChange={(v) => updateAgent("tone", v)}
                />
                <TextArea label={t.fields.responsibilities} value={responses.agent.responsibilities} placeholder={t.placeholders.responsibilities} onChange={(v) => updateAgent("responsibilities", v)} />
                <TextArea label={t.fields.restrictions} value={responses.agent.restrictions} placeholder={t.placeholders.restrictions} onChange={(v) => updateAgent("restrictions", v)} />
                <TextArea label={t.fields.exampleResponse} value={responses.agent.example_response} placeholder={t.placeholders.exampleResponse} onChange={(v) => updateAgent("example_response", v)} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <CheckboxGroup
                  label={t.escalationHint}
                  options={ESCALATION_TRIGGER_OPTIONS}
                  selected={responses.escalation.triggers}
                  locale={locale}
                  onToggle={toggleEscalation}
                />
                <TextArea
                  label={t.fields.escalationOther}
                  value={responses.escalation.other}
                  placeholder={locale === "en" ? "Describe any other situations…" : "Describe otras situaciones…"}
                  onChange={(v) =>
                    setResponses((prev) => ({ ...prev, escalation: { ...prev.escalation, other: v } }))
                  }
                />
                <Divider />
                <TextField
                  label={t.escalationWho}
                  value={responses.escalation.contact_name}
                  onChange={(v) =>
                    setResponses((prev) => ({ ...prev, escalation: { ...prev.escalation, contact_name: v } }))
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField
                    label={t.fields.escalationWa}
                    value={responses.escalation.contact_wa}
                    onChange={(v) =>
                      setResponses((prev) => ({ ...prev, escalation: { ...prev.escalation, contact_wa: v } }))
                    }
                  />
                  <TextField
                    label={t.fields.escalationHours}
                    value={responses.escalation.contact_hours}
                    placeholder={locale === "en" ? "e.g. Mon–Fri 9am–6pm CST" : "ej. Lun–Vie 9am–6pm CST"}
                    onChange={(v) =>
                      setResponses((prev) => ({ ...prev, escalation: { ...prev.escalation, contact_hours: v } }))
                    }
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <CheckboxGroup
                  label={t.kbHint}
                  options={KB_DOCUMENT_OPTIONS}
                  selected={responses.knowledge_base.documents}
                  locale={locale}
                  onToggle={toggleKb}
                />
                <TextField
                  label={t.fields.kbLocation}
                  value={responses.knowledge_base.location}
                  placeholder={t.placeholders.kbLocation}
                  onChange={(v) =>
                    setResponses((prev) => ({
                      ...prev,
                      knowledge_base: { ...prev.knowledge_base, location: v },
                    }))
                  }
                />
                <Divider />
                <SelectField
                  label={t.fields.ecommercePlatform}
                  value={responses.ecommerce.platform}
                  options={ECOMMERCE_PLATFORM_OPTIONS}
                  locale={locale}
                  onChange={(v) =>
                    setResponses((prev) => ({
                      ...prev,
                      ecommerce: { ...prev.ecommerce, platform: v },
                    }))
                  }
                />
                <CheckboxGroup
                  label={t.orderInfoHint}
                  options={ORDER_INFO_OPTIONS}
                  selected={responses.ecommerce.order_info_shared}
                  locale={locale}
                  onToggle={toggleOrderInfo}
                />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <SelectField
                  label={t.fields.returnsAccepted}
                  value={responses.returns.accepted}
                  options={RETURNS_ACCEPTED_OPTIONS}
                  locale={locale}
                  onChange={(v) =>
                    setResponses((prev) => ({ ...prev, returns: { ...prev.returns, accepted: v } }))
                  }
                />
                {responses.returns.accepted !== "No" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        label={t.fields.returnsWindow}
                        value={responses.returns.window_days}
                        placeholder="30"
                        onChange={(v) =>
                          setResponses((prev) => ({ ...prev, returns: { ...prev.returns, window_days: v } }))
                        }
                      />
                      <TextField
                        label={t.fields.refundApprover}
                        value={responses.returns.refund_approver}
                        onChange={(v) =>
                          setResponses((prev) => ({ ...prev, returns: { ...prev.returns, refund_approver: v } }))
                        }
                      />
                    </div>
                    <SelectField
                      label={t.fields.returnsAutomation}
                      value={responses.returns.automation}
                      options={RETURNS_AUTOMATION_OPTIONS}
                      locale={locale}
                      onChange={(v) =>
                        setResponses((prev) => ({ ...prev, returns: { ...prev.returns, automation: v } }))
                      }
                    />
                  </>
                )}
                <Divider />
                <CheckboxGroup
                  label={t.integrationsHint}
                  options={INTEGRATION_OPTIONS}
                  selected={responses.integrations.confirmed}
                  locale={locale}
                  onToggle={toggleIntegration}
                />
                <TextField
                  label={t.fields.integrationsOther}
                  value={responses.integrations.other}
                  placeholder={t.placeholders.integrationsOther}
                  onChange={(v) =>
                    setResponses((prev) => ({
                      ...prev,
                      integrations: { ...prev.integrations, other: v },
                    }))
                  }
                />
              </div>
            )}

            {step === 7 && (
              <div className="space-y-5">
                <TextField
                  label={t.fields.techContactName}
                  value={responses.contacts.technical.name}
                  onChange={(v) =>
                    setResponses((prev) => ({
                      ...prev,
                      contacts: { ...prev.contacts, technical: { ...prev.contacts.technical, name: v } },
                    }))
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField
                    label={t.fields.techContactEmail}
                    type="email"
                    value={responses.contacts.technical.email}
                    onChange={(v) =>
                      setResponses((prev) => ({
                        ...prev,
                        contacts: { ...prev.contacts, technical: { ...prev.contacts.technical, email: v } },
                      }))
                    }
                  />
                  <TextField
                    label={t.fields.techContactWa}
                    value={responses.contacts.technical.whatsapp}
                    onChange={(v) =>
                      setResponses((prev) => ({
                        ...prev,
                        contacts: { ...prev.contacts, technical: { ...prev.contacts.technical, whatsapp: v } },
                      }))
                    }
                  />
                </div>
                <Divider />
                <TextField
                  label={t.fields.commercialContactName}
                  value={responses.contacts.commercial.name}
                  onChange={(v) =>
                    setResponses((prev) => ({
                      ...prev,
                      contacts: { ...prev.contacts, commercial: { ...prev.contacts.commercial, name: v } },
                    }))
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField
                    label={t.fields.commercialContactEmail}
                    type="email"
                    value={responses.contacts.commercial.email}
                    onChange={(v) =>
                      setResponses((prev) => ({
                        ...prev,
                        contacts: { ...prev.contacts, commercial: { ...prev.contacts.commercial, email: v } },
                      }))
                    }
                  />
                  <TextField
                    label={t.fields.commercialContactWa}
                    value={responses.contacts.commercial.whatsapp}
                    onChange={(v) =>
                      setResponses((prev) => ({
                        ...prev,
                        contacts: { ...prev.contacts, commercial: { ...prev.contacts.commercial, whatsapp: v } },
                      }))
                    }
                  />
                </div>
                <Divider />
                <TextArea
                  label={t.fields.criticalDates}
                  value={responses.critical_dates}
                  placeholder={t.placeholders.criticalDates}
                  hint={t.criticalDatesHint}
                  onChange={(v) => setResponses((prev) => ({ ...prev, critical_dates: v }))}
                />
              </div>
            )}

            <nav className="flex justify-between items-center mt-8 pt-6 border-t border-[#e5e5e3]">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => {
                  setStep((s) => s - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-[13px] font-medium px-5 py-2 rounded-lg border border-[#d3d1c7] bg-white disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[#f5f5f3]"
              >
                ← {t.back}
              </button>
              <span className="text-[13px] text-[#888780]">{t.stepOf(step, total)}</span>
              <button
                type="button"
                onClick={() => {
                  if (step < total) {
                    setStep((s) => s + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    setPhase("summary");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="text-[13px] font-medium px-5 py-2 rounded-lg text-white"
                style={{ background: BRAND }}
              >
                {step === total ? `${t.finish} ✓` : `${t.next} →`}
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#e5e5e3]" />;
}

function SummaryCard({ title, lines }: { title: string; lines: string[] }) {
  const visible = lines.filter((l) => !l.endsWith(": —") && !l.endsWith(": "));
  if (visible.length === 0) return null;
  return (
    <div className="bg-[#f5f5f3] border border-[#e5e5e3] rounded-xl p-5">
      <p className="text-[11px] font-semibold tracking-widest uppercase mb-2.5" style={{ color: BRAND }}>
        {title}
      </p>
      {visible.map((line) => {
        const colon = line.indexOf(": ");
        const key = colon >= 0 ? line.slice(0, colon) : line;
        const val = colon >= 0 ? line.slice(colon + 2) : "";
        return (
          <div key={line} className="flex justify-between gap-3 text-[13px] mb-1.5 last:mb-0">
            <span className="text-[#5f5e5a] shrink-0">{key}</span>
            <span className="text-[#1a1a18] font-medium text-right">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[#5f5e5a] mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-[#d3d1c7] rounded-lg bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-[3px] focus:ring-[#1D9E75]/10"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[#5f5e5a] mb-1.5">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-[#d3d1c7] rounded-lg bg-white min-h-[80px] resize-y focus:outline-none focus:border-[#1D9E75] focus:ring-[3px] focus:ring-[#1D9E75]/10"
      />
      {hint && <p className="text-xs text-[#888780] mt-1 leading-relaxed">{hint}</p>}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  locale,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  locale: OnboardingLocale;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[#5f5e5a] mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-[#d3d1c7] rounded-lg bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-[3px] focus:ring-[#1D9E75]/10"
      >
        {options.map((opt) => (
          <option key={opt.value || "__empty"} value={opt.value}>
            {optionLabel(opt, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  locale,
  onToggle,
}: {
  label: string;
  options: CheckboxOption[];
  selected: string[];
  locale: OnboardingLocale;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <span className="block text-[13px] font-medium text-[#5f5e5a] mb-2">{label}</span>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2.5 px-3 py-2 border border-[#e5e5e3] rounded-lg cursor-pointer hover:bg-[#f5f5f3] hover:border-[#d3d1c7]"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="w-[15px] h-[15px] shrink-0 accent-[#1D9E75]"
            />
            <span className="text-sm text-[#1a1a18]">{optionLabel(opt, locale)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
