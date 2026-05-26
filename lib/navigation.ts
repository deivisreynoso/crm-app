import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  Paperclip,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  labelKey?: keyof typeof import("./crm/locales/en.json")["nav"];
  icon: LucideIcon;
  description?: string;
}

export const MAIN_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    labelKey: "home",
    icon: LayoutDashboard,
    description: "Dashboard overview",
  },
  {
    href: "/accounts",
    label: "Accounts",
    labelKey: "accounts",
    icon: Building2,
    description: "Companies you work with",
  },
  {
    href: "/contacts",
    label: "Contacts",
    labelKey: "contacts",
    icon: Users,
    description: "People at your accounts",
  },
  {
    href: "/opportunities",
    label: "Pipelines",
    labelKey: "pipelines",
    icon: TrendingUp,
    description: "Sales pipeline board",
  },
  {
    href: "/tickets",
    label: "Service Tickets",
    labelKey: "tickets",
    icon: Ticket,
    description: "Customer support",
  },
  {
    href: "/analytics",
    label: "Analytics",
    labelKey: "analytics",
    icon: BarChart3,
    description: "Pipeline metrics and charts",
  },
  {
    href: "/payments",
    label: "Payments",
    labelKey: "payments",
    icon: CreditCard,
    description: "Payment history",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    href: "/quotes",
    label: "Quotes",
    labelKey: "quotes",
    icon: FileText,
    description: "Quotes & estimates",
  },
  {
    href: "/attachments",
    label: "Attachments",
    labelKey: "attachments",
    icon: Paperclip,
    description: "Uploaded files",
  },
  {
    href: "/calendar",
    label: "Calendar",
    labelKey: "calendar",
    icon: Calendar,
    description: "Meetings & events",
  },
];
