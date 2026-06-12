"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle, Link2, Mail, Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import {
  deriveBillingStep,
  getBillingStepDefs,
  type BillingStep,
} from "@/lib/finances/billing-state";
import { cn } from "@/lib/utils";

type Props = {
  hasQuote: boolean;
  hasInvoice: boolean;
  quoteAccepted?: boolean;
  quoteId?: string;
  invoiceId?: string;
  invoiceStatus?: string;
  hasActiveLink: boolean;
  amountPaid: number;
  total: number;
  onInvoicePage?: boolean;
  onRequestSend?: () => void;
  onCreateInvoice?: () => void;
  className?: string;
};

const QUOTE_ICONS = [FileText, Receipt, Link2, Check] as const;
const STANDALONE_ICONS = [Receipt, Mail, Link2, Check] as const;

function stepActionCopy(
  step: BillingStep,
  hasQuote: boolean
): { title: string; body: string } {
  if (hasQuote) {
    return {
      1: {
        title: "Create an invoice",
        body: "Turn this accepted quote into a billable invoice to start collection.",
      },
      2: {
        title: "Send the invoice",
        body: "Review line items, then send the invoice to your customer.",
      },
      3: {
        title: "Collect payment",
        body: "Generate a payment link or log a manual payment on the invoice.",
      },
      4: {
        title: "Paid in full",
        body: "This invoice has been fully collected.",
      },
    }[step];
  }

  return {
    1: {
      title: "Invoice created",
      body: "Add line items and save your draft.",
    },
    2: {
      title: "Send the invoice",
      body: "Review line items, then send the invoice to your customer.",
    },
    3: {
      title: "Collect payment",
      body: "Generate a payment link or log a manual payment once the invoice is sent.",
    },
    4: {
      title: "Paid in full",
      body: "This invoice has been fully collected.",
    },
  }[step];
}

export function BillingWorkflowPanel({
  hasQuote,
  hasInvoice,
  quoteAccepted,
  quoteId,
  invoiceId,
  invoiceStatus,
  hasActiveLink,
  amountPaid,
  total,
  onInvoicePage,
  onRequestSend,
  onCreateInvoice,
  className,
}: Props) {
  const step = deriveBillingStep({
    hasQuote,
    hasInvoice,
    quoteAccepted,
    invoiceStatus,
    hasActiveLink,
    amountPaid,
    total,
  });

  const steps = getBillingStepDefs(hasQuote);
  const icons = hasQuote ? QUOTE_ICONS : STANDALONE_ICONS;
  const action = stepActionCopy(step, hasQuote);

  const showSendAction =
    step === 2 &&
    invoiceStatus === "draft" &&
    hasInvoice &&
    onInvoicePage &&
    onRequestSend;

  const showSendLink =
    step === 2 && invoiceStatus === "draft" && hasInvoice && !onInvoicePage && invoiceId;

  const showCreateInvoice = step === 1 && hasQuote && quoteAccepted && !hasInvoice && quoteId;

  return (
    <FormSection
      title="Billing workflow"
      description={
        hasQuote
          ? "Track collection for this quote-backed invoice."
          : "Track collection for this standalone invoice."
      }
      className={className}
    >
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map(({ step: s, label, description }, index) => {
          const done = step > s;
          const active = step === s;
          const Icon = icons[index] ?? Circle;
          return (
            <li
              key={s}
              className={cn(
                "rounded-lg border px-3 py-2.5 transition-colors",
                done
                  ? "border-[var(--secondary)]/40 bg-[var(--secondary)]/8"
                  : "border-[var(--card-border)] bg-[var(--background)]",
                active && "ring-2 ring-[var(--secondary)]/30"
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    done || active
                      ? "bg-[var(--secondary)] text-white"
                      : "bg-[var(--card-border)] text-body-muted"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      done || active ? "text-heading" : "text-body-muted"
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-[11px] text-body-muted mt-0.5 leading-snug hidden sm:block">
                    {description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-lg border border-[var(--secondary)]/25 bg-[var(--secondary)]/5 px-4 py-3">
        <p className="text-sm font-semibold text-heading">{action.title}</p>
        <p className="text-xs text-body-muted mt-1">{action.body}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {showCreateInvoice && onCreateInvoice && (
            <button
              type="button"
              onClick={onCreateInvoice}
              className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-3 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
            >
              Create invoice
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </button>
          )}
          {showCreateInvoice && !onCreateInvoice && quoteId && (
            <Link
              href={`/finances/invoices/new?quote_id=${quoteId}`}
              className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-3 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
            >
              Create invoice
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          )}

          {showSendAction && (
            <Button type="button" size="sm" onClick={onRequestSend}>
              <Mail className="h-4 w-4 mr-1.5" />
              Send invoice
            </Button>
          )}

          {showSendLink && (
            <Link
              href={`/finances/invoices/${invoiceId}`}
              className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-3 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
            >
              Open invoice to send
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          )}

          {step === 3 && onInvoicePage && (
            <a
              href="#payments"
              className="inline-flex h-9 items-center rounded-md border border-[var(--card-border)] px-3 text-xs font-medium hover:bg-[var(--sidebar-hover)]"
            >
              Go to payments
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </a>
          )}

          {step === 3 && !onInvoicePage && invoiceId && (
            <Link
              href={`/finances/invoices/${invoiceId}#payments`}
              className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-3 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
            >
              Manage payments
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          )}

          {step === 4 && (
            <Link
              href="/finances/transactions?type=income"
              className="inline-flex h-9 items-center rounded-md border border-[var(--card-border)] px-3 text-xs font-medium hover:bg-[var(--sidebar-hover)]"
            >
              View transactions
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          )}
        </div>
      </div>
    </FormSection>
  );
}
