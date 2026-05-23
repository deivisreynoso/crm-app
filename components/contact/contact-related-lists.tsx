"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Note, OpportunityWithContact, Task } from "@/types";

interface ContactRelatedListsProps {
  contactId: string;
  opportunities: OpportunityWithContact[];
  tasks: Task[];
  notes: Note[];
  onNewOpportunity?: () => void;
}

function RelatedSection({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">
          {title}{" "}
          <span className="text-slate-500 font-normal">({count})</span>
        </h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ContactRelatedLists({
  contactId,
  opportunities,
  tasks,
  notes,
  onNewOpportunity,
}: ContactRelatedListsProps) {
  const openTasks = tasks.filter((t) => t.status !== "completed");

  return (
    <div className="space-y-4">
      <RelatedSection
        title="Opportunities"
        count={opportunities.length}
        action={
          onNewOpportunity ? (
            <Button type="button" size="sm" variant="outline" onClick={onNewOpportunity}>
              New
            </Button>
          ) : (
            <Link href="/opportunities">
              <Button type="button" size="sm" variant="outline">
                View board
              </Button>
            </Link>
          )
        }
      >
        {opportunities.length === 0 ? (
          <p className="text-sm text-slate-500">No opportunities yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {opportunities.map((opp) => (
              <li key={opp.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  href="/opportunities"
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  {opp.title}
                </Link>
                {opp.value != null && Number(opp.value) > 0 && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    {formatCurrency(Number(opp.value), opp.currency)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </RelatedSection>

      <RelatedSection title="Tasks" count={openTasks.length}>
        {openTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No open tasks.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {openTasks.map((task) => (
              <li key={task.id} className="py-2 first:pt-0 last:pb-0 text-sm">
                <span className="font-medium text-slate-900">{task.title}</span>
                {task.due_date && (
                  <span className="text-xs text-slate-500 block">
                    Due {formatDate(task.due_date)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </RelatedSection>

      <RelatedSection title="Activity" count={notes.length}>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">No activity logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.slice(0, 5).map((note) => (
              <li key={note.id} className="text-sm">
                <span className="text-xs uppercase text-slate-500">
                  {note.activity_type}
                </span>
                <p className="text-slate-700 line-clamp-2">{note.content}</p>
              </li>
            ))}
          </ul>
        )}
      </RelatedSection>

      <RelatedSection title="Cases" count={0}>
        <p className="text-sm text-slate-500">
          Cases coming soon. Contact ID: {contactId.slice(0, 8)}…
        </p>
      </RelatedSection>
    </div>
  );
}
