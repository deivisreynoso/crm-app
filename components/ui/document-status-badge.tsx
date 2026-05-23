import { Badge } from "@/components/ui/badge";
import type { CrmDocument } from "@/types";

const labels: Record<CrmDocument["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  accepted: "Accepted",
  rejected: "Rejected",
};

export function DocumentStatusBadge({
  status,
}: {
  status: CrmDocument["status"];
}) {
  const variant =
    status === "accepted" || status === "signed"
      ? "success"
      : status === "rejected"
        ? "error"
        : status === "sent"
          ? "default"
          : "neutral";

  return <Badge variant={variant}>{labels[status]}</Badge>;
}
