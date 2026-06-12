"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-shell";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { CreateEventModal } from "@/components/calendar/create-event-modal";
import { EventDetailModal } from "@/components/calendar/event-detail-modal";
import { resolveCalendarOwnerColor } from "@/lib/users/calendar-colors";
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from "@/hooks/useCalendarEvents";
import { APPOINTMENT_EVENT_COLOR, shiftMonth } from "@/lib/calendar/utils";
import { GoogleCalendarBanner } from "@/components/calendar/google-calendar-banner";
import type { CalendarEvent } from "@/types";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { useWorkspace } from "@/components/crm/workspace-provider";

type TeamMember = {
  id: string;
  label: string;
  calendar_color?: string | null;
};

type CalendarView = "mine" | "all" | string;

export function CalendarPage() {
  const { canWrite } = useWorkspaceCapabilities();
  const { ctx } = useWorkspace();
  const actorId = ctx?.actorUserId ?? "";

  const [month, setMonth] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("mine");
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    void axios
      .get<{ data: TeamMember[] }>("/api/team/members")
      .then(async (res) => {
        const list = res.data.data ?? [];
        const profileRes = await axios.get<{
          data: Array<{ id: string; calendar_color: string | null }>;
        }>("/api/team/calendar-colors").catch(() => ({ data: { data: [] } }));
        const colorMap = new Map(
          (profileRes.data.data ?? []).map((p) => [p.id, p.calendar_color])
        );
        setMembers(
          list.map((m) => ({
            ...m,
            calendar_color: colorMap.get(m.id) ?? null,
          }))
        );
      })
      .catch(() => setMembers([]));
  }, []);

  const range = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return {
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(end, "yyyy-MM-dd"),
    };
  }, [month]);

  const eventFilters = useMemo(() => {
    if (calendarView === "mine" && actorId) {
      return { ...range, assigned_to: actorId };
    }
    if (calendarView !== "all" && calendarView !== "mine") {
      return { ...range, assigned_to: calendarView };
    }
    return range;
  }, [range, calendarView, actorId]);

  const { data: events = [], isLoading } = useCalendarEvents(eventFilters);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const legendMembers = useMemo(() => {
    if (calendarView === "all") {
      const ids = new Set(
        events.map((e) => e.assigned_to).filter((id): id is string => !!id)
      );
      return members.filter((m) => ids.has(m.id));
    }
    if (calendarView !== "mine") {
      return members.filter((m) => m.id === calendarView);
    }
    return members.filter((m) => m.id === actorId);
  }, [calendarView, events, members, actorId]);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Calendar"
        description="Schedule meetings with contacts — color-coded by owner"
        actions={
          canWrite ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setCreateDate(new Date());
                setCreateOpen(true);
              }}
            >
              New meeting
            </Button>
          ) : undefined
        }
      />

      <GoogleCalendarBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--card-border)] hover:bg-[var(--sidebar-hover)]"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-heading min-w-[10rem] text-center">
            {format(month, "MMMM yyyy")}
          </h2>
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--card-border)] hover:bg-[var(--sidebar-hover)]"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input-field text-sm py-1.5"
            value={calendarView}
            onChange={(e) => setCalendarView(e.target.value as CalendarView)}
            aria-label="Calendar view"
          >
            <option value="mine">My Calendar</option>
            {members
              .filter((m) => m.id !== actorId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            <option value="all">All Calendars</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
            Today
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-body-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: APPOINTMENT_EVENT_COLOR }}
          />
          Website appointment
        </span>
        {legendMembers.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: resolveCalendarOwnerColor(m.calendar_color) }}
            />
            {m.label.replace(/\s*\(you.*\)/i, "").replace(/\s*\(owner\)/i, "")}
          </span>
        ))}
      </div>

      {isLoading ? (
        <p className="text-body-muted text-sm">Loading calendar…</p>
      ) : (
        <CalendarMonthView
          month={month}
          events={events}
          onSelectDate={
            canWrite
              ? (day) => {
                  setEditing(null);
                  setCreateDate(day);
                  setCreateOpen(true);
                }
              : undefined
          }
          onSelectEvent={setSelected}
        />
      )}

      <CreateEventModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        initialDate={createDate}
        initial={editing}
        isLoading={createEvent.isPending || updateEvent.isPending}
        onSubmit={async (data) => {
          if (editing) {
            await updateEvent.mutateAsync({ id: editing.id, data });
          } else {
            await createEvent.mutateAsync(data);
          }
        }}
      />

      <EventDetailModal
        event={selected}
        onClose={() => setSelected(null)}
        onEdit={
          canWrite
            ? () => {
                setEditing(selected);
                setSelected(null);
                setCreateOpen(true);
              }
            : undefined
        }
        onDelete={
          canWrite
            ? async () => {
                if (selected) await deleteEvent.mutateAsync(selected.id);
              }
            : undefined
        }
        deleteLoading={deleteEvent.isPending}
      />
    </div>
  );
}
