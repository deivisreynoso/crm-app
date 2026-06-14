import type { AppNotification } from "@/types";

/** CRM route for a notification's related record, when one exists. */
export function getNotificationHref(
  notification: Pick<
    AppNotification,
    "type" | "related_entity_type" | "related_entity_id"
  >
): string | null {
  const id = notification.related_entity_id?.trim();
  if (!id) return null;

  switch (notification.related_entity_type) {
    case "contact":
      return `/contacts/${id}`;
    case "ticket":
      return `/tickets/${id}`;
    case "opportunity":
      return "/opportunities";
    case "conversation":
      return `/conversations?highlight=${id}`;
    default:
      break;
  }

  if (notification.type === "task_reminder") {
    return `/contacts/${id}`;
  }

  if (notification.type === "conversation_review") {
    return `/conversations?highlight=${id}`;
  }

  return null;
}
