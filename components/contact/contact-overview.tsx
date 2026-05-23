"use client";

import { cn, formatDate, formatWebsiteUrl } from "@/lib/utils";
import { formatTimezone } from "@/lib/constants/contact-fields";
import { InlineEditableField } from "@/components/ui/inline-editable-field";
import { formatTagsForInput } from "@/lib/tags";
import type { Contact, ContactFormInput } from "@/types";

interface ContactOverviewProps {
  contact: Contact;
  onSaveField: (patch: Partial<ContactFormInput>) => Promise<void>;
}

function TextBlock({
  label,
  value,
  multiline,
  onSave,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  return (
    <InlineEditableField
      label={label}
      value={value}
      multiline={multiline}
      onSave={onSave}
    />
  );
}

function formatAddress(contact: Contact): string | null {
  const parts = [
    contact.street_address,
    [contact.city, contact.state].filter(Boolean).join(", "),
    contact.postal_code,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : null;
}

export function ContactOverview({ contact, onSaveField }: ContactOverviewProps) {
  const address = formatAddress(contact);
  const save = (field: keyof ContactFormInput) => (value: string) =>
    onSaveField({ [field]: value } as Partial<ContactFormInput>);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
          Contact
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <InlineEditableField
            label="Email"
            value={contact.email}
            href={contact.email ? `mailto:${contact.email}` : undefined}
            onSave={save("email")}
          />
          <InlineEditableField
            label="Phone"
            value={contact.phone}
            onSave={save("phone")}
          />
          <InlineEditableField
            label="Company"
            value={contact.company}
            onSave={save("company")}
          />
          <InlineEditableField
            label="Job Title"
            value={contact.title}
            onSave={save("title")}
          />
          <InlineEditableField
            label="Tags"
            value={formatTagsForInput(contact.tags)}
            placeholder="e.g. whatsapp, hot-lead"
            onSave={async (value) => onSaveField({ tags: value })}
          />
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wide">Status</dt>
            <dd className="mt-1">
              <select
                value={contact.status}
                onChange={(e) =>
                  void onSaveField({
                    status: e.target.value as Contact["status"],
                  })
                }
                className="text-sm font-medium border border-slate-200 rounded px-2 py-1 text-slate-900"
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </dd>
          </div>
          <InlineEditableField
            label="Source"
            value={contact.source}
            onSave={save("source")}
          />
        </dl>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
          Communication
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <InlineEditableField
            label="Preferred Contact Method"
            value={contact.preferred_contact_method}
            onSave={save("preferred_contact_method")}
          />
          <InlineEditableField
            label="Preferred Language"
            value={contact.preferred_language}
            onSave={save("preferred_language")}
          />
          <InlineEditableField
            label="Communication Channels"
            value={contact.communication_channels}
            onSave={save("communication_channels")}
          />
        </dl>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
          Business context
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-4">
          <InlineEditableField
            label="Platform"
            value={contact.platform}
            placeholder="Set by automation"
            onSave={save("platform")}
          />
          <InlineEditableField
            label="Website"
            value={contact.website}
            href={contact.website ? formatWebsiteUrl(contact.website) : undefined}
            onSave={save("website")}
          />
        </dl>
        <div className="space-y-4">
          <TextBlock label="Signals" value={contact.signals} multiline onSave={save("signals")} />
          <TextBlock
            label="Friction Area"
            value={contact.friction_area}
            multiline
            onSave={save("friction_area")}
          />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
          Address
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <InlineEditableField
            label="Street Address"
            value={contact.street_address}
            onSave={save("street_address")}
          />
          <InlineEditableField label="City" value={contact.city} onSave={save("city")} />
          <InlineEditableField label="State" value={contact.state} onSave={save("state")} />
          <InlineEditableField
            label="Postal Code"
            value={contact.postal_code}
            onSave={save("postal_code")}
          />
          <InlineEditableField
            label="Time Zone"
            value={contact.timezone ? formatTimezone(contact.timezone) : ""}
            onSave={save("timezone")}
          />
          {address && (
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide">
                Full Address
              </dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-line">
                {address}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="pt-2 border-t border-slate-100">
        <TextBlock label="About" value={contact.notes} multiline onSave={save("notes")} />
        {contact.date_of_birth && (
          <div className="mt-4">
            <dt className="text-xs text-slate-500 uppercase tracking-wide">
              Date of Birth
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {formatDate(contact.date_of_birth)}
            </dd>
          </div>
        )}
      </section>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "related", label: "Related" },
  { id: "activity", label: "Activity" },
  { id: "tasks", label: "Tasks" },
] as const;

export type ContactTab = (typeof TABS)[number]["id"];

interface ContactTabsProps {
  activeTab: ContactTab;
  onTabChange: (tab: ContactTab) => void;
  activityCount: number;
  taskCount: number;
  relatedCount?: number;
}

export function ContactTabs({
  activeTab,
  onTabChange,
  activityCount,
  taskCount,
  relatedCount,
}: ContactTabsProps) {
  const counts: Record<ContactTab, number | undefined> = {
    overview: undefined,
    related: relatedCount,
    activity: activityCount,
    tasks: taskCount,
  };

  return (
    <nav className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === tab.id
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          {tab.label}
          {counts[tab.id] !== undefined && counts[tab.id]! > 0 && (
            <span className="ml-1.5 text-xs text-slate-400">
              ({counts[tab.id]})
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
