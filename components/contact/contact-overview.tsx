"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { InlineEditableField } from "@/components/ui/inline-editable-field";
import { InlineSelectField } from "@/components/ui/inline-select-field";
import { PhoneInputInline } from "@/components/ui/phone-input";
import { RecordDates } from "@/components/ui/record-dates";
import { JOB_TITLE_OPTIONS } from "@/lib/constants/job-titles";
import {
  COUNTRIES,
  getCountryByCode,
  getStatesForCountry,
  getTimezoneForLocation,
} from "@/lib/constants/countries";
import { formatTimezone } from "@/lib/constants/contact-fields";
import { formatApiError } from "@/lib/validation-errors";
import { TagsChips } from "@/components/forms/tags-chips";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { formatDateTimeInTimeZone } from "@/lib/utils/datetime";
import { useDisplayTimeZone } from "@/hooks/useDisplayTimeZone";
import { EntityCustomFieldsOverview } from "@/components/custom-fields/entity-custom-fields-overview";
import { CustomerIdField } from "@/components/contact/customer-id-field";
import { cn } from "@/lib/utils";
import type { Contact, ContactFormInput } from "@/types";

interface ContactOverviewProps {
  contact: Contact;
  onSaveField: (patch: Partial<ContactFormInput>) => Promise<void>;
}

const fieldGrid = "grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-5 gap-y-4";
const fieldCell = "min-w-0";

function SectionTitle({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-body-muted">
        {title}
      </h3>
      {hint && <p className="text-xs text-body-muted mt-0.5">{hint}</p>}
    </div>
  );
}

export function ContactOverview({ contact, onSaveField }: ContactOverviewProps) {
  const { canWrite, canManage } = useWorkspaceCapabilities();
  const { dict } = useCrmLocale();
  const r = dict.reviewRequest;
  const f = dict.contacts.fields;
  const co = dict.common;
  const ct = dict.contacts;
  const readOnly = !canWrite;
  const displayTz = useDisplayTimeZone(contact.timezone);
  const [country, setCountry] = useState(contact.country ?? "");

  useEffect(() => {
    setCountry(contact.country ?? "");
  }, [contact.country]);

  const states = getStatesForCountry(country);

  const hasAdditionalDetails = Boolean(
    contact.country ||
      contact.state ||
      contact.city ||
      contact.postal_code ||
      contact.timezone
  );
  const [showAdditional, setShowAdditional] = useState(hasAdditionalDetails);

  useEffect(() => {
    if (hasAdditionalDetails) setShowAdditional(true);
  }, [hasAdditionalDetails]);

  async function saveField(patch: Partial<ContactFormInput>) {
    try {
      await onSaveField(patch);
    } catch (err) {
      throw new Error(formatApiError(err, "Failed to save"));
    }
  }

  const save =
    (field: keyof ContactFormInput) => async (value: string) => {
      await saveField({ [field]: value } as Partial<ContactFormInput>);
    };

  async function handleCountryChange(code: string) {
    setCountry(code);
    const statesForCountry = getStatesForCountry(code);
    const stateStillValid = statesForCountry.some((s) => s.name === contact.state);
    const nextState = stateStillValid ? contact.state : "";
    const tz = getTimezoneForLocation(code, nextState);
    await saveField({
      country: code,
      state: nextState ?? "",
      timezone: tz,
    });
  }

  async function handleStateChange(stateName: string) {
    const tz = getTimezoneForLocation(country, stateName);
    await saveField({ state: stateName, timezone: tz });
  }

  return (
    <div className="space-y-6">
      {/* Primary contact fields */}
      <section>
        {canManage && (
          <div className="mb-4">
            <CustomerIdField
              contactId={contact.id}
              customerId={contact.customer_id}
              canManage={canManage}
            />
          </div>
        )}
        <div className={fieldGrid}>
          <div className={fieldCell}>
            <InlineEditableField
              label={f.email}
              value={contact.email}
              readOnly={readOnly}
              onSave={save("email")}
            />
          </div>
          <div className={fieldCell}>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1 block">
                {f.phone}
              </label>
              <PhoneInputInline
                value={contact.phone}
                readOnly={readOnly}
                onSave={save("phone")}
              />
            </div>
          </div>
          <div className={fieldCell}>
            <InlineEditableField
              label={f.company}
              value={contact.company}
              placeholder={ct.companyPlaceholder}
              readOnly={readOnly}
              onSave={save("company")}
            />
          </div>
          <div className={fieldCell}>
            <InlineEditableField
              label={f.website}
              value={contact.website}
              placeholder={ct.websitePlaceholder}
              readOnly={readOnly}
              onSave={save("website")}
            />
          </div>
          <div className={fieldCell}>
            <InlineSelectField
              label={f.jobTitle}
              value={contact.title}
              options={JOB_TITLE_OPTIONS}
              allowEmpty
              emptyLabel={co.selectEmpty}
              readOnly={readOnly}
              onSave={save("title")}
            />
          </div>
          <div className={fieldCell}>
            <InlineSelectField
              label={f.status}
              value={contact.status}
              options={[
                { value: "lead", label: ct.statusLead },
                { value: "prospect", label: ct.statusProspect },
                { value: "active", label: ct.statusActive },
                { value: "inactive", label: ct.statusInactive },
              ]}
              readOnly={readOnly}
              onSave={async (v) => saveField({ status: v as Contact["status"] })}
            />
          </div>
          <div className={cn(fieldCell, "min-[420px]:col-span-2")}>
            <InlineEditableField
              label={f.source}
              value={contact.source}
              placeholder={ct.sourcePlaceholder}
              readOnly={readOnly}
              onSave={save("source")}
            />
          </div>
          <div className={cn(fieldCell, "min-[420px]:col-span-2")}>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1 block">
              {f.tags}
            </label>
            <TagsChips
              tags={contact.tags ?? []}
              readOnly={readOnly}
              onChange={(next) => void saveField({ tags: next.join(", ") })}
            />
          </div>
        </div>
      </section>

      {/* About — neutral, full width */}
      <section className="pt-1">
        <InlineEditableField
          label={f.about}
          value={contact.notes}
          placeholder={ct.aboutPlaceholder}
          multiline
          readOnly={readOnly}
          onSave={save("notes")}
          className="[&_textarea]:min-h-[88px] [&_textarea]:text-sm"
        />
      </section>

      {/* Insights — light blue panel */}
      <section
        className={cn(
          "rounded-lg border border-sky-200/90 p-4",
          "bg-sky-50/90 dark:bg-sky-950/25 dark:border-sky-800/50"
        )}
      >
        <SectionTitle title={ct.insightsTitle} hint={ct.insightsHint} />
        <div className={fieldGrid}>
          <div className={fieldCell}>
            <InlineEditableField
              label={f.platform}
              value={contact.platform}
              placeholder={ct.platformPlaceholder}
              readOnly={readOnly}
              onSave={save("platform")}
            />
          </div>
          <div className={fieldCell}>
            <InlineEditableField
              label={f.communicationChannels}
              value={contact.communication_channels}
              placeholder={ct.channelsPlaceholder}
              readOnly={readOnly}
              onSave={save("communication_channels")}
            />
          </div>
          <div className={cn(fieldCell, "min-[420px]:col-span-2")}>
            <InlineEditableField
              label={f.frictionArea}
              value={contact.friction_area}
              placeholder={ct.frictionPlaceholder}
              multiline
              readOnly={readOnly}
              onSave={save("friction_area")}
              className="[&_textarea]:min-h-[64px]"
            />
          </div>
          <div className={cn(fieldCell, "min-[420px]:col-span-2")}>
            <InlineEditableField
              label={f.signals}
              value={contact.signals}
              placeholder={ct.signalsPlaceholder}
              multiline
              readOnly={readOnly}
              onSave={save("signals")}
              className="[&_textarea]:min-h-[64px]"
            />
          </div>
          <div className={cn(fieldCell, "min-[420px]:col-span-2")}>
            <InlineEditableField
              label={f.aiSummary}
              value={contact.ai_summary}
              placeholder={ct.aiSummaryPlaceholder}
              multiline
              readOnly={readOnly}
              onSave={save("ai_summary")}
              className="[&_textarea]:min-h-[72px]"
            />
          </div>
        </div>
      </section>

      {/* Address & location — collapsible, before record dates */}
      <section className="border-t border-[var(--card-border)] pt-4">
        <button
          type="button"
          onClick={() => setShowAdditional((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left group"
          aria-expanded={showAdditional}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-body-muted group-hover:text-heading transition-colors">
            {ct.additionalDetails}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-body-muted transition-transform shrink-0",
              showAdditional && "rotate-180"
            )}
          />
        </button>
        {showAdditional && (
          <div className={cn(fieldGrid, "mt-4")}>
            <div className={fieldCell}>
              <InlineSelectField
                label={f.country}
                value={country}
                options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                allowEmpty
                emptyLabel={co.selectEmpty}
                readOnly={readOnly}
                onSave={handleCountryChange}
              />
            </div>
            <div className={fieldCell}>
              {states.length > 0 ? (
                <InlineSelectField
                  label={f.state}
                  value={contact.state}
                  options={states.map((s) => ({ value: s.name, label: s.name }))}
                  allowEmpty
                  emptyLabel={co.selectEmpty}
                  readOnly={readOnly}
                  onSave={handleStateChange}
                />
              ) : (
                <InlineEditableField
                  label={f.state}
                  value={contact.state}
                  readOnly={readOnly}
                  onSave={handleStateChange}
                />
              )}
            </div>
            <div className={fieldCell}>
              <InlineEditableField
                label={f.city}
                value={contact.city}
                readOnly={readOnly}
                onSave={save("city")}
              />
            </div>
            <div className={fieldCell}>
              <InlineEditableField
                label={f.postalCode}
                value={contact.postal_code}
                readOnly={readOnly}
                onSave={save("postal_code")}
              />
            </div>
            <div className={cn(fieldCell, "min-[420px]:col-span-2")}>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1 block">
                {f.timezone}
              </label>
              <p className="text-sm font-medium text-heading">
                {(() => {
                  const tz =
                    contact.timezone || getTimezoneForLocation(country, contact.state);
                  return tz ? formatTimezone(tz) : co.notSet;
                })()}
              </p>
              {country && (
                <p className="text-xs text-body-muted mt-0.5">
                  {getCountryByCode(country)?.name}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <RecordDates createdAt={contact.created_at} updatedAt={contact.updated_at} />

      <section className="border-t border-[var(--card-border)] pt-4 space-y-3">
        {contact.review_requested_at && (
          <p className="text-sm text-body-muted">
            {r?.lastSent ?? "Review invitation sent"}:{" "}
            <span className="text-heading font-medium">
              {formatDateTimeInTimeZone(contact.review_requested_at, displayTz)}
            </span>
          </p>
        )}
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 rounded border-[var(--card-border)]"
            checked={Boolean(contact.review_request_opt_out)}
            disabled={readOnly}
            onChange={(e) =>
              void saveField({ review_request_opt_out: e.target.checked })
            }
          />
          <span>
            <span className="font-medium text-heading block">
              {r?.optOut ?? "Do not ask for Google reviews"}
            </span>
            <span className="text-xs text-body-muted">{r?.optOutHint}</span>
          </span>
        </label>
      </section>

      <EntityCustomFieldsOverview
        entityType="contact"
        values={contact.custom_fields}
        readOnly={readOnly}
        onSave={async (custom_fields) => saveField({ custom_fields })}
      />
    </div>
  );
}
