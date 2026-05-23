"use client";

import { use } from "react";
import { DocumentEditor } from "@/components/documents/document-editor";

type PageProps = { params: Promise<{ id: string }> };

export default function DocumentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return <DocumentEditor documentId={id} />;
}
