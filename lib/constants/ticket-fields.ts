export const TICKET_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "closed", label: "Closed" },
] as const;

export const TICKET_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const TICKET_CATEGORIES = [
  "Billing",
  "Technical Support",
  "Account Access",
  "Product Question",
  "Feature Request",
  "Bug Report",
  "Onboarding",
  "Training",
  "General Inquiry",
  "Other",
] as const;
