import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Calendar,
  FileText,
  LayoutDashboard,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export const MAIN_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    description: "Dashboard overview",
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: Building2,
    description: "Companies you work with",
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Users,
    description: "People at your accounts",
  },
  {
    href: "/opportunities",
    label: "Opportunities",
    icon: TrendingUp,
    description: "Sales pipeline",
  },
  {
    href: "/tickets",
    label: "Service Tickets",
    icon: Ticket,
    description: "Customer support",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    href: "/documents",
    label: "Documents",
    icon: FileText,
    description: "Files & attachments",
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: Calendar,
    description: "Meetings & events",
  },
];
