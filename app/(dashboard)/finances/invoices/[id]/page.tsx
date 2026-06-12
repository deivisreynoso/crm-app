"use client";

import { use } from "react";
import { InvoiceEditor } from "@/components/finances/invoice-editor";

type PageProps = { params: Promise<{ id: string }> };

export default function InvoiceDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return <InvoiceEditor invoiceId={id} />;
}
