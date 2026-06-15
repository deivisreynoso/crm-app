"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckSquare,
  FileText,
  Trash2,
  User,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getStageName, sortStages } from "@/lib/constants/pipelines";
import { getPipelineStageAccent } from "@/lib/constants/pipeline-stage-accent";
import { ProjectStageBadge } from "@/components/opportunities/project-stage-badge";
import type {
  ContactRelatedCounts,
  OpportunityWithContact,
  Pipeline,
  PipelineStage,
} from "@/types";

interface PipelineBoardProps {
  pipeline: Pipeline;
  opportunities: OpportunityWithContact[];
  onMoveStage: (opportunityId: string, stageId: string) => void | Promise<void>;
  onEdit: (opportunity: OpportunityWithContact) => void;
  onDelete?: (opportunity: OpportunityWithContact) => void;
  isMoving?: boolean;
  deletingId?: string | null;
  readOnly?: boolean;
}

const ICON_ACCENTS = {
  contact: {
    icon: "text-[var(--primary)]",
    hover: "hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] hover:text-[var(--primary)]",
  },
  quotes: {
    icon: "text-[var(--secondary)]",
    hover: "hover:bg-[color-mix(in_srgb,var(--secondary)_14%,transparent)] hover:text-[color-mix(in_srgb,var(--secondary)_90%,#0f1419)]",
  },
  appointments: {
    icon: "text-[var(--accent)]",
    hover: "hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:text-[var(--accent)]",
  },
  tasks: {
    icon: "text-[var(--success)]",
    hover: "hover:bg-[color-mix(in_srgb,var(--success)_12%,transparent)] hover:text-[var(--success)]",
  },
} as const;

function contactName(opp: OpportunityWithContact) {
  if (!opp.contact) return "No contact";
  return `${opp.contact.first_name} ${opp.contact.last_name}`;
}

function OpportunityActionIcons({
  contactId,
  counts,
}: {
  contactId: string;
  counts?: ContactRelatedCounts;
}) {
  const quotes = counts?.quotes ?? 0;
  const appointments = counts?.appointments ?? 0;
  const tasks = counts?.tasks ?? 0;

  const items = [
    {
      key: "contact" as const,
      href: `/contacts/${contactId}`,
      label: "Contact",
      icon: User,
      count: 0,
      showBadge: false,
    },
    {
      key: "quotes" as const,
      href: `/contacts/${contactId}`,
      label: "Quotes",
      icon: FileText,
      count: quotes,
      showBadge: true,
    },
    {
      key: "appointments" as const,
      href: `/calendar`,
      label: "Appointments",
      icon: Calendar,
      count: appointments,
      showBadge: true,
    },
    {
      key: "tasks" as const,
      href: `/contacts/${contactId}`,
      label: "Tasks",
      icon: CheckSquare,
      count: tasks,
      showBadge: true,
    },
  ];

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--card-border)]">
      {items.map(({ key, href, label, icon: Icon, count, showBadge }) => {
        const accent = ICON_ACCENTS[key];
        return (
          <Link
            key={key}
            href={href}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              accent.icon,
              accent.hover
            )}
            title={label}
            aria-label={
              showBadge && count > 0 ? `${label} (${count})` : label
            }
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {showBadge && count > 0 && (
              <span className="count-badge-accent absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
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
    <div className="flex gap-4 overflow-x-auto pb-4 items-start">
      {stages.map((stage, index) => {
        const cards = byStage.get(stage.id) ?? [];
        const total = stageTotal(stage.id);
        const accent = getPipelineStageAccent(stage, index);

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72 bg-[var(--background)] rounded-lg flex flex-col border border-[var(--card-border)] overflow-hidden"
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
            <div
              className={cn(
                "relative p-3 pt-3.5 border-b border-[var(--card-border)] shrink-0",
                accent.headerBgClass
              )}
            >
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-1",
                  accent.barClass
                )}
                aria-hidden
              />
              <h3
                className={cn(
                  "font-semibold text-sm",
                  accent.gradientTitle ? "text-brand-gradient" : accent.titleClass
                )}
              >
                {stage.name}
              </h3>
              <p className="text-xs text-body-muted mt-1">
                <span className="font-medium text-heading">{cards.length}</span>
                {" · "}
                <span className="font-medium text-[var(--secondary)]">
                  {formatCurrency(total)}
                </span>
              </p>
            </div>

            <div
              className={cn("p-2 space-y-2", readOnly ? "" : "min-h-[2.5rem]")}
            >
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
                  className={cn(
                    "bg-[var(--card)] border border-[var(--card-border)] rounded-md p-3 shadow-sm group/card relative",
                    readOnly ? "" : "cursor-grab active:cursor-grabbing"
                  )}
                >
                  {!readOnly && onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(opp);
                    }}
                    disabled={deletingId === opp.id}
                    className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-body-muted opacity-0 group-hover/card:opacity-100 hover:text-[var(--error)] hover:bg-[color-mix(in_srgb,var(--error)_10%,transparent)] transition-opacity disabled:opacity-50"
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
                    className={cn("text-left w-full", readOnly ? "" : "pr-6")}
                  >
                    <p className="font-medium text-sm text-heading">
                      {opp.title}
                    </p>
                    {opp.project_stage ? (
                      <div className="mt-1">
                        <ProjectStageBadge stage={opp.project_stage} />
                      </div>
                    ) : null}
                    <p className="text-xs text-[var(--primary)] mt-1">
                      {contactName(opp)}
                    </p>
                    {opp.contact?.company && (
                      <p className="text-xs text-body-muted">
                        {opp.contact.company}
                      </p>
                    )}
                    {opp.tags && opp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {opp.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-[color-mix(in_srgb,var(--accent)_10%,var(--card))] text-[var(--accent)] rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {opp.value != null && Number(opp.value) > 0 && (
                      <p className="text-xs font-semibold text-[var(--secondary)] mt-2">
                        {formatCurrency(Number(opp.value), opp.currency)}
                      </p>
                    )}
                  </button>
                  {opp.contact_id && (
                    <OpportunityActionIcons
                      contactId={opp.contact_id}
                      counts={opp.contact_counts}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {opportunities.some((o) => !stages.find((s) => s.id === o.stage)) && (
        <div className="flex-shrink-0 w-64 bg-[color-mix(in_srgb,var(--warning)_12%,var(--card))] border border-[color-mix(in_srgb,var(--warning)_35%,var(--card-border))] rounded-lg p-3">
          <p className="text-xs font-medium text-[color-mix(in_srgb,var(--warning)_85%,#0f1419)] mb-2">
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
                  className="text-heading hover:text-[var(--primary)]"
                >
                  {opp.title}
                </button>
                <span className="text-xs text-body-muted block">
                  Stage: {getStageName(stages, opp.stage)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
