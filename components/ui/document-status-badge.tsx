import { Badge } from "@/components/ui/badge";
import type { CrmDocument } from "@/types";
import { quoteExpiryStatus } from "@/lib/quotes/expiry";

const labels: Record<CrmDocument["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  accepted: "Accepted",
  rejected: "Rejected",
};

export function DocumentStatusBadge({
  status,
  expiresAt,
  validUntil,
}: {
  status: CrmDocument["status"];
  expiresAt?: string | null;
  validUntil?: string | null;
}) {
  const expiry = quoteExpiryStatus(expiresAt, validUntil, status);
  const label =
    expiry === "expired"
      ? "Expired"
      : expiry === "expiring_soon"
        ? "Expiring soon"
        : labels[status];

  const variant =
    expiry === "expired"
      ? "error"
      : expiry === "expiring_soon"
        ? "warning"
        : status === "accepted" || status === "signed"
          ? "success"
          : status === "rejected"
            ? "error"
            : status === "sent"
              ? "default"
              : "neutral";

  return <Badge variant={variant}>{label}</Badge>;
}
