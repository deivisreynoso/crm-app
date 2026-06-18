"use client";

import { useRef, useState } from "react";
import axios from "axios";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_CSV_HEADERS, rowToCsvLine } from "@/lib/contacts/csv";
import { formatApiError } from "@/lib/validation-errors";

type ExportFilters = {
  search?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
};

type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  results: { row: number; success: boolean; error?: string }[];
};

type Props = {
  filters: ExportFilters;
  onImported: () => void;
  compact?: boolean;
  canExport?: boolean;
};

function buildExportUrl(filters: ExportFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.createdFrom) params.set("created_from", filters.createdFrom);
  if (filters.createdTo) params.set("created_to", filters.createdTo);
  const q = params.toString();
  return `/api/contacts/export${q ? `?${q}` : ""}`;
}

function templateCsv(): string {
  const header = CONTACT_CSV_HEADERS.join(",");
  const sample = rowToCsvLine([
    "Jane",
    "Lopez",
    "jane@example.com",
    "+15551234567",
    "Acme Store",
    "Owner",
    "import",
    "lead",
    "",
    "Shopify",
    "abandoned carts",
    "email, WhatsApp",
    "has_ecommerce,support_overload",
    "",
    "vip",
    "",
    "",
    "",
    "",
    "",
  ]);
  return `${header}\r\n${sample}`;
}

export function ContactsImportExport({
  filters,
  onImported,
  compact = false,
  canExport = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await axios.get(buildExportUrl(filters), {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers["content-disposition"]?.match(/filename="(.+)"/)?.[1] ??
        "contacts-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    } catch (err) {
      setError(formatApiError(err, "Export failed."));
    } finally {
      setExporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([templateCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post<ImportResult>("/api/contacts/import", form);
      setMessage(
        `Import finished: ${data.created} created, ${data.skipped} skipped (duplicates), ${data.failed} failed.`
      );
      if (data.created > 0) onImported();
    } catch (err) {
      setError(formatApiError(err, "Import failed."));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const btnClass = compact
    ? "inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--sidebar-hover)] transition-colors disabled:opacity-50"
    : undefined;

  return (
    <div className={compact ? "contents" : "flex flex-col gap-2"}>
      <div className={compact ? "flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-2"}>
        {compact ? (
          <>
            {canExport && (
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExport()}
                className={btnClass}
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? "Exporting…" : "Export"}
              </button>
            )}
            <button
              type="button"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
              className={btnClass}
            >
              <Upload className="w-3.5 h-3.5" />
              {importing ? "Importing…" : "Import"}
            </button>
            <button
              type="button"
              onClick={downloadTemplate}
              className="text-xs font-medium text-[var(--secondary)] hover:text-[var(--primary)] transition-colors px-1"
            >
              Template
            </button>
          </>
        ) : (
          <>
            {canExport && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={() => void handleExport()}
              >
                <Download className="w-4 h-4 mr-1.5" />
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {importing ? "Importing…" : "Import CSV"}
            </Button>
            <button
              type="button"
              onClick={downloadTemplate}
              className="text-xs text-[var(--secondary)] hover:underline"
            >
              Download template
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
      {!compact && message && (
        <p className="text-sm text-[var(--success)] bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
          {message}
        </p>
      )}
      {!compact && error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {compact && (message || error) && (
        <p
          className={`text-xs px-2 py-1 rounded-md ${
            error
              ? "text-red-600 bg-red-50 border border-red-100"
              : "text-[var(--success)] bg-emerald-50 border border-emerald-100"
          }`}
        >
          {error ?? message}
        </p>
      )}
    </div>
  );
}
