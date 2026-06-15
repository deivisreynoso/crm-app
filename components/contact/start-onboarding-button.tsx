"use client";

import { useState } from "react";
import axios from "axios";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToast } from "@/components/ui/copy-toast";
import { cn } from "@/lib/utils";

/** Matches outline Button styling when used as a quick-action chip */
export const START_ONBOARDING_CHIP_CLASS =
  "border-[var(--card-border)] bg-[var(--card)] text-heading hover:bg-[var(--sidebar-hover)]";

type Props = {
  contactId: string;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  variant?: "button" | "chip";
  className?: string;
};

export function StartOnboardingButton({
  contactId,
  disabled,
  label = "Start onboarding",
  loadingLabel = "Starting…",
  variant = "button",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const { showCopied } = useCopyToast();

  async function start() {
    setLoading(true);
    try {
      const { data } = await axios.post<{
        onboarding_url: string;
      }>(`/api/contacts/${contactId}/onboarding`);
      if (data.onboarding_url) {
        await navigator.clipboard.writeText(data.onboarding_url);
        showCopied("Onboarding link copied to clipboard");
      }
    } catch (err) {
      console.error(err);
      showCopied("Could not start onboarding");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "chip") {
    return (
      <button
        type="button"
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border transition-colors disabled:opacity-50",
          START_ONBOARDING_CHIP_CLASS,
          className
        )}
        onClick={() => void start()}
      >
        <Rocket className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {loading ? loadingLabel : label}
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || loading}
      className={className}
      onClick={() => void start()}
    >
      {loading ? loadingLabel : label}
    </Button>
  );
}
