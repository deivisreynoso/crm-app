"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ListDeleteAction } from "@/components/ui/list-actions";
import { Pencil } from "lucide-react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
} from "@/components/ui/page-shell";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getPipelineStageAccentById } from "@/lib/constants/pipeline-stage-accent";
import type { OpportunityWithContact, PipelineStage } from "@/types";

interface OpportunityListViewProps {
  opportunities: OpportunityWithContact[];
  stages?: PipelineStage[];
  onEdit: (opp: OpportunityWithContact) => void;
  onDelete: (opp: OpportunityWithContact) => void;
  deletingId?: string | null;
  readOnly?: boolean;
}

export function OpportunityListView({
  opportunities,
  stages = [],
  onEdit,
  onDelete,
  deletingId,
  readOnly,
}: OpportunityListViewProps) {
  if (opportunities.length === 0) {
    return (
      <p className="text-sm text-body-muted py-8 text-center">
        No opportunities match your filters.
      </p>
    );
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeadCell>Title</DataTableHeadCell>
          <DataTableHeadCell>Contact</DataTableHeadCell>
          <DataTableHeadCell>Stage</DataTableHeadCell>
          <DataTableHeadCell>Value</DataTableHeadCell>
          <DataTableHeadCell>Updated</DataTableHeadCell>
          {!readOnly && (
          <DataTableHeadCell align="right">Actions</DataTableHeadCell>
          )}
        </tr>
      </DataTableHead>
      <DataTableBody>
        {opportunities.map((opp) => (
          <DataTableRow key={opp.id}>
            <DataTableCell>
              {readOnly ? (
                <span className="font-medium text-heading">{opp.title}</span>
              ) : (
              <button
                type="button"
                onClick={() => onEdit(opp)}
                className="font-medium text-heading hover:text-[var(--primary)] text-left"
              >
                {opp.title}
              </button>
              )}
            </DataTableCell>
            <DataTableCell>
              {opp.contact ? (
                <Link
                  href={`/contacts/${opp.contact.id}`}
                  className="text-[var(--secondary)] hover:underline text-sm"
                >
                  {opp.contact.first_name} {opp.contact.last_name}
                </Link>
              ) : (
                "—"
              )}
            </DataTableCell>
            <DataTableCell>
              {stages.length > 0 ? (
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                    getPipelineStageAccentById(opp.stage, stages).badgeClass
                  )}
                >
                  {opp.stage.replace(/_/g, " ")}
                </span>
              ) : (
                <Badge variant="info">{opp.stage.replace(/_/g, " ")}</Badge>
              )}
            </DataTableCell>
            <DataTableCell>
              {opp.value != null
                ? formatCurrency(Number(opp.value), opp.currency)
                : "—"}
            </DataTableCell>
            <DataTableCell>
              <span className="text-body-muted text-sm">
                {formatDate(opp.updated_at)}
              </span>
            </DataTableCell>
            {!readOnly && (
            <DataTableCell align="right">
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(opp)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--primary)] hover:bg-[var(--sidebar-hover)]"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <ListDeleteAction
                  onClick={() => onDelete(opp)}
                  disabled={deletingId === opp.id}
                />
              </div>
            </DataTableCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
