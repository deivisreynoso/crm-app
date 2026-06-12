"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { formatApiError } from "@/lib/validation-errors";

type Props = {
  contactId: string;
  customerId?: string | null;
  canManage: boolean;
};

export function CustomerIdField({ contactId, customerId, canManage }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      await axios.post(`/api/contacts/${contactId}/customer-id`);
      await queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
    } catch (err) {
      setError(formatApiError(err, "Could not generate CID"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-sm">
      <p className="text-body-muted mb-1">Customer ID (CID)</p>
      {customerId ? (
        <p className="font-mono font-medium text-heading">{customerId}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-body-muted text-xs">Not assigned yet.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void generate()} disabled={loading}>
            {loading ? "Generating…" : "Generate CID"}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-[var(--error)] mt-1">{error}</p>}
    </div>
  );
}
