export type CrmObjectId =
  | "home"
  | "contacts"
  | "opportunities"
  | "tickets"
  | "documents"
  | "calendar"
  | "dashboard";

export interface CrmObjectDef {
  id: CrmObjectId;
  label: string;
  href: string;
  /** Tailwind bg class for icon tile */
  iconBg: string;
  /** Single letter or emoji glyph on tile */
  glyph: string;
  description?: string;
}

/** Salesforce App Launcher–style object list */
export const CRM_OBJECTS: CrmObjectDef[] = [
  {
    id: "home",
    label: "Dashboard",
    href: "/dashboard",
    iconBg: "bg-pink-500",
    glyph: "⌂",
    description: "Dashboard overview and business analytics",
  },
  {
    id: "contacts",
    label: "Contacts",
    href: "/contacts",
    iconBg: "bg-violet-600",
    glyph: "👤",
    description: "People and companies you work with",
  },
  {
    id: "opportunities",
    label: "Opportunities",
    href: "/opportunities",
    iconBg: "bg-amber-500",
    glyph: "◆",
    description: "Sales pipeline deals",
  },
  {
    id: "tickets",
    label: "Service Tickets",
    href: "/tickets",
    iconBg: "bg-rose-500",
    glyph: "▣",
    description: "Customer support service tickets",
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    iconBg: "bg-slate-500",
    glyph: "📄",
    description: "Files & attachments",
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    iconBg: "bg-teal-600",
    glyph: "📅",
    description: "Meetings & events",
  },
];

export function getCrmObject(id: CrmObjectId) {
  return CRM_OBJECTS.find((o) => o.id === id);
}
