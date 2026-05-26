"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getStageName, sortStages } from "@/lib/constants/pipelines";
import type { OpportunityWithContact, Pipeline, PipelineStage } from "@/types";

interface PipelineBoardProps {
  pipeline: Pipeline;
  opportunities: OpportunityWithContact[];
  onMoveStage: (opportunityId: string, stageId: string) => void | Promise<void>;
  onEdit: (opportunity: OpportunityWithContact) => void;
  onDelete: (opportunity: OpportunityWithContact) => void;
  isMoving?: boolean;
  deletingId?: string | null;
  readOnly?: boolean;
}

function contactName(opp: OpportunityWithContact) {
  if (!opp.contact) return "No contact";
  return `${opp.contact.first_name} ${opp.contact.last_name}`;
}

export function PipelineBoard({
  pipeline,
  opportunities,
  onMoveStage,
  onEdit,
  onDelete,
  deletingId,
  readOnly,
}: PipelineBoardProps) {
  const stages = sortStages(pipeline.stages as PipelineStage[]);

  const byStage = useMemo(() => {
    const map = new Map<string, OpportunityWithContact[]>();
    for (const stage of stages) {
      map.set(stage.id, []);
    }
    for (const opp of opportunities) {
      if (!map.has(opp.stage)) {
        map.set(opp.stage, []);
      }
      map.get(opp.stage)!.push(opp);
    }
    return map;
  }, [opportunities, stages]);

  function stageTotal(stageId: string) {
    return (byStage.get(stageId) ?? []).reduce(
      (sum, o) => sum + (Number(o.value) || 0),
      0
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[min(85vh,900px)]">
      {stages.map((stage) => {
        const cards = byStage.get(stage.id) ?? [];
        const total = stageTotal(stage.id);

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72 bg-[var(--background)] rounded-lg flex flex-col min-h-[min(80vh,800px)] max-h-[min(90vh,1000px)] border border-[var(--card-border)]"
            onDragOver={
              readOnly
                ? undefined
                : (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }
            }
            onDrop={
              readOnly
                ? undefined
                : (e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("application/opportunity-id");
                    if (id) void onMoveStage(id, stage.id);
                  }
            }
          >
            <div className="p-3 border-b border-[var(--card-border)] bg-[var(--card)] rounded-t-lg shrink-0">
              <h3 className="font-semibold text-sm text-heading">
                {stage.name}
              </h3>
              <p className="text-xs text-body-muted mt-1">
                {cards.length} · {formatCurrency(total)}
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
              {cards.map((opp) => (
                <div
                  key={opp.id}
                  draggable={!readOnly}
                  onDragStart={
                    readOnly
                      ? undefined
                      : (e) => {
                          e.dataTransfer.setData("application/opportunity-id", opp.id);
                          e.dataTransfer.effectAllowed = "move";
                        }
                  }
                  className={`bg-white border border-slate-200 rounded-md p-3 shadow-sm group/card relative ${
                    readOnly ? "" : "cursor-grab active:cursor-grabbing"
                  }`}
                >
                  {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(opp);
                    }}
                    disabled={deletingId === opp.id}
                    className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 group-hover/card:opacity-100 hover:text-[var(--error)] hover:bg-red-50 transition-opacity disabled:opacity-50"
                    aria-label={`Delete ${opp.title}`}
                    title="Delete opportunity"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={() => !readOnly && onEdit(opp)}
                    disabled={readOnly}
                    className={`text-left w-full ${readOnly ? "" : "pr-6"}`}
                  >
                    <p className="font-medium text-sm text-slate-900">
                      {opp.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {contactName(opp)}
                    </p>
                    {opp.contact?.company && (
                      <p className="text-xs text-slate-500">
                        {opp.contact.company}
                      </p>
                    )}
                    {opp.tags && opp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {opp.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {opp.value != null && Number(opp.value) > 0 && (
                      <p className="text-xs font-medium text-slate-800 mt-2">
                        {formatCurrency(Number(opp.value), opp.currency)}
                      </p>
                    )}
                  </button>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                    <Link
                      href={`/contacts/${opp.contact_id}`}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      Contact
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {opportunities.some((o) => !stages.find((s) => s.id === o.stage)) && (
        <div className="flex-shrink-0 w-64 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-800 mb-2">
            Unassigned stage
          </p>
          {opportunities
            .filter((o) => !stages.find((s) => s.id === o.stage))
            .map((opp) => (
              <div key={opp.id} className="text-sm mb-2">
                <button
                  type="button"
                  onClick={() => !readOnly && onEdit(opp)}
                  disabled={readOnly}
                >
                  {opp.title}
                </button>
                <span className="text-xs text-slate-500 block">
                  Stage: {getStageName(stages, opp.stage)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
