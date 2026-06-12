"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/website/i18n";

type Step = "cid" | "form" | "done";

export type SupportWidgetLabels = {
  title: string;
  subtitle: string;
  cidLabel: string;
  continue: string;
  verifying: string;
  subject: string;
  description: string;
  priority: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityUrgent: string;
  back: string;
  submit: string;
  submitting: string;
  doneTitle: string;
  doneBody: string;
  genericError: string;
  submitError: string;
};

type PublicSupportWidgetProps = {
  embed?: boolean;
  enabled?: boolean;
  disabledMessage?: string;
  locale?: Locale;
  labels?: SupportWidgetLabels;
};

export function PublicSupportWidget({
  embed,
  enabled = true,
  disabledMessage,
  locale = "en",
  labels,
}: PublicSupportWidgetProps) {
  const copy: SupportWidgetLabels = labels ?? {
    title: "Customer support",
    subtitle: "Enter your Customer ID (CID) to open a support request.",
    cidLabel: "Customer ID",
    continue: "Continue",
    verifying: "Verifying…",
    subject: "Subject",
    description: "Description",
    priority: "Priority",
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",
    priorityUrgent: "Urgent",
    back: "Back",
    submit: "Submit ticket",
    submitting: "Submitting…",
    doneTitle: "Request received",
    doneBody:
      "Your reference number is {reference}. A confirmation email will be sent if we have your email on file.",
    genericError: "Unable to verify customer ID.",
    submitError: "Could not submit your request. Please try again.",
  };

  const [step, setStep] = useState<Step>("cid");
  const [customerId, setCustomerId] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function validateCid(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post<{
        valid: boolean;
        session_token?: string;
        error?: string;
      }>("/api/public/support/validate-cid", {
        customer_id: customerId.trim(),
        language: locale,
      });
      if (!data.valid || !data.session_token) {
        setError(data.error ?? copy.genericError);
        return;
      }
      setSessionToken(data.session_token);
      setStep("form");
    } catch {
      setError(copy.genericError);
    } finally {
      setLoading(false);
    }
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post<{ reference: string }>(
        "/api/public/support/tickets",
        { subject, description, priority },
        { headers: { "x-support-session": sessionToken } }
      );
      setReference(data.reference);
      setStep("done");
    } catch {
      setError(copy.submitError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={
        embed
          ? "p-6 bg-[var(--card)] text-heading min-h-[480px]"
          : "max-w-lg mx-auto p-6 sm:p-10 rounded-3xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-md)]"
      }
    >
      <h1 className="text-2xl font-bold text-heading mb-2">{copy.title}</h1>
      <p className="text-body-muted text-sm mb-6">{copy.subtitle}</p>

      {!enabled && (
        <p className="text-sm text-body-muted bg-[var(--surface-subtle)] border border-[var(--card-border)] rounded-lg px-4 py-3 mb-4">
          {disabledMessage ??
            "Customer support tickets are not available at the moment. Please contact us via chat or email."}
        </p>
      )}

      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {enabled && step === "cid" && (
        <form onSubmit={validateCid} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{copy.cidLabel}</label>
            <input
              className="input-field w-full"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="CID-2026-00001"
              required
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? copy.verifying : copy.continue}
          </Button>
        </form>
      )}

      {enabled && step === "form" && (
        <form onSubmit={submitTicket} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{copy.subject}</label>
            <input
              className="input-field w-full"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{copy.description}</label>
            <textarea
              className="input-field w-full min-h-[120px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={10000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{copy.priority}</label>
            <select
              className="input-field w-full"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as typeof priority)
              }
            >
              <option value="low">{copy.priorityLow}</option>
              <option value="medium">{copy.priorityMedium}</option>
              <option value="high">{copy.priorityHigh}</option>
              <option value="urgent">{copy.priorityUrgent}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("cid")}>
              {copy.back}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? copy.submitting : copy.submit}
            </Button>
          </div>
        </form>
      )}

      {enabled && step === "done" && (
        <div className="space-y-4 text-center py-6">
          <p className="text-lg font-semibold text-heading">{copy.doneTitle}</p>
          <p className="text-body-muted text-sm">
            {copy.doneBody.split("{reference}")[0]}
            <span className="font-mono font-medium text-heading">{reference}</span>
            {copy.doneBody.split("{reference}")[1] ?? ""}
          </p>
        </div>
      )}
    </div>
  );
}
