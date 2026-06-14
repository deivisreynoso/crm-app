"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useCopyToast } from "@/components/ui/copy-toast";

type Props = {
  contactId: string;
  disabled?: boolean;
};

export function StartOnboardingButton({ contactId, disabled }: Props) {
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

  return (
    <Button variant="outline" size="sm" disabled={disabled || loading} onClick={() => void start()}>
      {loading ? "Starting…" : "Start onboarding"}
    </Button>
  );
}
