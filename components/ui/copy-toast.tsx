"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function useCopyToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(t);
  }, [message]);

  function showCopied(label = "Copied") {
    setMessage(label);
  }

  const toast = message ? (
    <span
      role="status"
      className={cn(
        "inline-flex items-center rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm",
        "animate-in fade-in duration-200"
      )}
    >
      {message}
    </span>
  ) : null;

  return { showCopied, toast };
}
