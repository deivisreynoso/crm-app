"use client";

import { Card } from "@/components/ui/card";
import { useOperationsAnalytics } from "@/hooks/useOperationsAnalytics";
import type { AnalyticsDateRange } from "@/components/analytics/analytics-date-filters";

interface OperationsDashboardProps {
  dateRange: AnalyticsDateRange;
}

export function OperationsDashboard({ dateRange }: OperationsDashboardProps) {
  const { data, isLoading, error } = useOperationsAnalytics(dateRange);

  if (isLoading) {
    return <p className="text-body-muted text-sm">Loading operations metrics…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-[var(--error)] text-sm">Could not load operations metrics.</p>
    );
  }

  const cards = [
    { label: "Leads", value: data.leads },
    { label: "Prospects", value: data.prospects },
    { label: "Active contacts", value: data.activeContacts },
    { label: "Open tickets", value: data.openTickets },
    { label: "In progress", value: data.ticketsInProgress },
    { label: "Urgent tickets", value: data.urgentTickets },
    { label: "Closed (range)", value: data.ticketsClosedInRange },
    { label: "Upcoming meetings", value: data.upcomingAppointments },
    { label: "Appointments (range)", value: data.appointmentsInRange },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} padding="md">
            <p className="text-xs font-semibold uppercase tracking-wide text-body-muted">
              {c.label}
            </p>
            <p className="text-2xl font-bold text-heading mt-2">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-3">Tickets by status</h3>
          <ul className="space-y-2 text-sm">
            {data.ticketsByStatus.length === 0 ? (
              <li className="text-body-muted">No tickets in range</li>
            ) : (
              data.ticketsByStatus.map((row) => (
                <li key={row.status} className="flex justify-between">
                  <span className="capitalize text-body-muted">{row.status.replace("_", " ")}</span>
                  <span className="font-medium text-heading">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-3">Tickets by priority</h3>
          <ul className="space-y-2 text-sm">
            {data.ticketsByPriority.length === 0 ? (
              <li className="text-body-muted">No tickets in range</li>
            ) : (
              data.ticketsByPriority.map((row) => (
                <li key={row.priority} className="flex justify-between">
                  <span className="capitalize text-body-muted">{row.priority}</span>
                  <span className="font-medium text-heading">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
