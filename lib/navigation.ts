import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CreditCard,
  FileText,
  HardDrive,
  LayoutDashboard,
  MessageSquare,
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
    label: "Dashboard",
    labelKey: "home",
    icon: LayoutDashboard,
    iconAccent: "navy",
    description: "Dashboard overview and business analytics",
  },
  {
    href: "/conversations",
    label: "Conversations",
    labelKey: "conversations",
    icon: MessageSquare,
    iconAccent: "sky",
    description: "WhatsApp and webchat inbox",
  },
  {
    href: "/calendar",
    label: "Calendars",
    labelKey: "calendar",
    icon: Calendar,
    iconAccent: "navy",
    description: "Meetings & events",
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
    href: "/contacts",
    label: "Contacts",
    labelKey: "contacts",
    icon: Users,
    iconAccent: "sky",
    description: "People at your companies",
  },
  {
    href: "/quotes",
    label: "Quotes",
    labelKey: "quotes",
    icon: FileText,
    iconAccent: "navy",
    description: "Quotes, products & branding",
  },
  {
    href: "/finances",
    label: "Finances",
    labelKey: "finances",
    icon: CreditCard,
    iconAccent: "success",
    description: "Revenue, invoices, and expenses",
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
    href: "/attachments",
    label: "Attachments",
    labelKey: "attachments",
    icon: Paperclip,
    iconAccent: "sky",
    description: "Uploaded files linked to contacts",
  },
  {
    href: "/media",
    label: "Media",
    labelKey: "media",
    icon: HardDrive,
    iconAccent: "navy",
    description: "Workspace Google Drive",
  },
];

/** @deprecated Use MAIN_NAV — secondary section removed from sidebar */
export const SECONDARY_NAV: NavItem[] = [];
