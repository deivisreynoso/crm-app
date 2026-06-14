import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-shell";
import { ConversationsInbox } from "@/components/conversations/conversations-inbox";

export default function ConversationsPage() {
  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Conversations"
        description="WhatsApp and webchat threads in one inbox"
      />
      <Suspense fallback={<p className="text-sm text-body-muted">Loading inbox…</p>}>
        <ConversationsInbox />
      </Suspense>
    </div>
  );
}
