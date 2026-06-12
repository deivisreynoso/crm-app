import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  Paperclip,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";

export type NavIconAccent = "navy" | "sky" | "magenta" | "success";

export interface NavItem {
  href: string;
  label: string;
  labelKey?: keyof typeof import("./crm/locales/en.json")["nav"];
  icon: LucideIcon;
  iconAccent?: NavIconAccent;
  description?: string;
  /** Hide from sidebar when user cannot write (e.g. viewer demo) */
  requiresWrite?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    labelKey: "home",
    icon: LayoutDashboard,
    iconAccent: "navy",
    description: "Dashboard overview",
  },
  {
    href: "/contacts",
    label: "Contacts",
    labelKey: "contacts",
    icon: Users,
    iconAccent: "sky",
    description: "People at your companies",
  },
  {
    href: "/opportunities",
    label: "Pipelines",
    labelKey: "pipelines",
    icon: TrendingUp,
    iconAccent: "success",
    description: "Sales pipeline board",
  },
  {
    href: "/tickets",
    label: "Service Tickets",
    labelKey: "tickets",
    icon: Ticket,
    iconAccent: "magenta",
    description: "Customer support",
  },
  {
    href: "/analytics",
    label: "Analytics",
    labelKey: "analytics",
    icon: BarChart3,
    iconAccent: "sky",
    description: "Pipeline metrics and charts",
  },
  {
    href: "/finances",
    label: "Finances",
    labelKey: "finances",
    icon: CreditCard,
    iconAccent: "success",
    description: "Revenue, invoices, and expenses",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    href: "/quotes",
    label: "Quotes",
    labelKey: "quotes",
    icon: FileText,
    iconAccent: "navy",
    description: "Quotes, products & branding",
  },
  {
    href: "/attachments",
    label: "Attachments",
    labelKey: "attachments",
    icon: Paperclip,
    iconAccent: "sky",
    description: "Uploaded files",
  },
  {
    href: "/calendar",
    label: "Calendar",
    labelKey: "calendar",
    icon: Calendar,
    iconAccent: "navy",
    description: "Meetings & events",
  },
];
