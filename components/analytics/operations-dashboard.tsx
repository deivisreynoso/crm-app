"use client";

import {
  Calendar,
  Contact,
  Headphones,
  Target,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useOperationsAnalytics } from "@/hooks/useOperationsAnalytics";
import type { AnalyticsDateRange } from "@/components/analytics/analytics-date-filters";
import {
  AnalyticsErrorCard,
  AnalyticsHorizontalBarChart,
  AnalyticsKpiCard,
  AnalyticsLoadingGrid,
  AnalyticsSectionHeader,
} from "@/components/analytics/analytics-ui";

interface OperationsDashboardProps {
  dateRange: AnalyticsDateRange;
}

export function OperationsDashboard({ dateRange }: OperationsDashboardProps) {
  const { data, isLoading, error } = useOperationsAnalytics(dateRange);

  if (isLoading) {
    return <AnalyticsLoadingGrid count={9} />;
  }

  if (error || !data) {
    return (
      <AnalyticsErrorCard message="Could not load operations metrics. Try adjusting the date range." />
    );
  }

  const rangeLabel = `${dateRange.start_date} — ${dateRange.end_date}`;

  return (
    <div className="space-y-6">
      <AnalyticsSectionHeader
        eyebrow="Operations overview"
        subtitle={rangeLabel}
        meta="CRM activity in the selected date range"
      />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-body-muted mb-3">
          Contacts & pipeline intake
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <AnalyticsKpiCard label="Leads" value={data.leads} icon={UserPlus} accent="sky" />
          <AnalyticsKpiCard label="Prospects" value={data.prospects} icon={Target} accent="navy" />
          <AnalyticsKpiCard
            label="Active contacts"
            value={data.activeContacts}
            icon={Users}
            accent="magenta"
          />
          <AnalyticsKpiCard
            label="Total contacts"
            value={data.totalContacts}
            icon={Contact}
            accent="navy"
            hint="All statuses in workspace"
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-body-muted mb-3">
          Service tickets
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <AnalyticsKpiCard
            label="Open tickets"
            value={data.openTickets}
            icon={Ticket}
            accent="warning"
          />
          <AnalyticsKpiCard
            label="In progress"
            value={data.ticketsInProgress}
            icon={TrendingUp}
            accent="sky"
          />
          <AnalyticsKpiCard
            label="Urgent"
            value={data.urgentTickets}
            icon={Headphones}
            accent="warning"
            hint="High priority open tickets"
          />
          <AnalyticsKpiCard
            label="Closed in range"
            value={data.ticketsClosedInRange}
            icon={Ticket}
            accent="success"
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-body-muted mb-3">
          Appointments
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnalyticsKpiCard
            label="Upcoming meetings"
            value={data.upcomingAppointments}
            icon={Calendar}
            accent="magenta"
            hint="Scheduled from today forward"
          />
          <AnalyticsKpiCard
            label="Appointments in range"
            value={data.appointmentsInRange}
            icon={Calendar}
            accent="sky"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnalyticsHorizontalBarChart
          title="Tickets by status"
          subtitle="Distribution in selected period"
          data={data.ticketsByStatus}
          labelKey="status"
          valueKey="count"
          emptyMessage="No tickets in this date range"
        />
        <AnalyticsHorizontalBarChart
          title="Tickets by priority"
          subtitle="Open and closed tickets combined"
          data={data.ticketsByPriority}
          labelKey="priority"
          valueKey="count"
          emptyMessage="No tickets in this date range"
        />
      </div>
    </div>
  );
}
