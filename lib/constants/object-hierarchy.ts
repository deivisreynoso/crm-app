/**
 * ClickIn 360 CRM object model (Salesforce-aligned)
 *
 * Account (companies table)
 *   └── Contact (many) — contacts.company_id
 *         ├── Opportunity (many) — opportunities.contact_id + optional company_id
 *         ├── Case / Ticket (many) — tickets.contact_id and/or company_id
 *         ├── Document (many) — documents.contact_id and/or company_id
 *         ├── Calendar event (many) — calendar_events.contact_id and/or company_id
 *         ├── Task (many) — tasks.contact_id
 *         └── Activity note (many) — notes.entity_type = contact
 *
 * Account can also own directly (without picking a contact):
 *   Cases, Documents, Calendar events, Opportunities (via company_id)
 */

export const OBJECT_HIERARCHY_SUMMARY =
  "Account → Contacts → Opportunities, Cases, Documents, Calendar, Tasks";
