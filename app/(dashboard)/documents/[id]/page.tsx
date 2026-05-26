"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDocument } from "@/hooks/useDocument";
import { isQuoteDocument } from "@/lib/documents/kinds";

type PageProps = { params: Promise<{ id: string }> };

/** Legacy route: forwards to /quotes or /attachments by document type. */
export default function DocumentLegacyRedirectPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: doc, isLoading } = useDocument(id);

  useEffect(() => {
    if (!doc) return;
    router.replace(isQuoteDocument(doc.type) ? `/quotes/${id}` : `/attachments/${id}`);
  }, [doc, id, router]);

  if (isLoading || !doc) {
    return <p className="text-body-muted text-sm">Loading…</p>;
  }

  return null;
}
