"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useDuplicateReviews,
  useResolveDuplicate,
  useScanDuplicates,
} from "@/hooks/useDuplicateReviews";
import { formatApiError } from "@/lib/validation-errors";
import { useState } from "react";

function contactLabel(c?: { first_name: string; last_name: string; email?: string | null }) {
  if (!c) return "Unknown";
  const name = `${c.first_name} ${c.last_name}`.trim();
  return c.email ? `${name} (${c.email})` : name;
}

export function DuplicateReviewsPanel() {
  const { data: reviews = [], isLoading, refetch } = useDuplicateReviews("pending");
  const scan = useScanDuplicates();
  const resolve = useResolveDuplicate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setError(null);
    setMessage(null);
    try {
      const res = await scan.mutateAsync();
      const emailGroups = res.data.emailGroups ?? 0;
      const phoneGroups = res.data.phoneGroups ?? 0;
      setMessage(
        `Scanned ${res.data.scanned} contacts — ${res.data.created} new pair(s) queued (${emailGroups} matching email group(s), ${phoneGroups} matching phone group(s)).`
      );
      void refetch();
    } catch (err) {
      setError(formatApiError(err, "Scan failed"));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        Find contacts with the same email or phone number. Merge or dismiss each pair.
      </p>
      <Button
        size="sm"
        onClick={() => void handleScan()}
        disabled={scan.isPending}
      >
        {scan.isPending ? "Scanning…" : "Scan for duplicates"}
      </Button>
      {message && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {isLoading ? (
        <p className="text-sm text-body-muted">Loading queue…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-body-muted">No pending duplicates.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="border border-[var(--card-border)] rounded-lg p-4 bg-[var(--card)] space-y-3"
            >
              <div className="text-sm text-heading space-y-1">
                <p>
                  <Link
                    href={`/contacts/${r.contact1?.id ?? r.contact1_id}`}
                    className="text-[var(--primary)] hover:underline"
                  >
                    {contactLabel(r.contact1 ?? undefined)}
                  </Link>
                </p>
                <p className="text-body-muted text-xs">and</p>
                <p>
                  <Link
                    href={`/contacts/${r.contact2?.id ?? r.contact2_id}`}
                    className="text-[var(--primary)] hover:underline"
                  >
                    {contactLabel(r.contact2 ?? undefined)}
                  </Link>
                </p>
                {r.similarity_score != null && (
                  <p className="text-xs text-body-muted">
                    Match confidence: {Math.round(Number(r.similarity_score) * 100)}%
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() =>
                    void resolve.mutateAsync({
                      id: r.id,
                      action: "merge",
                      keep_contact_id: r.contact1_id,
                    })
                  }
                >
                  Keep first
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolve.isPending}
                  onClick={() =>
                    void resolve.mutateAsync({
                      id: r.id,
                      action: "merge",
                      keep_contact_id: r.contact2_id,
                    })
                  }
                >
                  Keep second
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolve.isPending}
                  onClick={() =>
                    void resolve.mutateAsync({ id: r.id, action: "dismiss" })
                  }
                >
                  Not a duplicate
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
