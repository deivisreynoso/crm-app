"use client";

import { useEffect, useState } from "react";
import { InlineEditableField } from "@/components/ui/inline-editable-field";
import { InlineSelectField } from "@/components/ui/inline-select-field";
import { AssociationSelect } from "@/components/ui/association-select";
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
import { formatDateTime } from "@/lib/utils";
import { useCompanies } from "@/hooks/useCompanies";
import { EntityCustomFieldsOverview } from "@/components/custom-fields/entity-custom-fields-overview";
import type { Contact, ContactFormInput } from "@/types";

interface ContactOverviewProps {
  contact: Contact;
  onSaveField: (patch: Partial<ContactFormInput>) => Promise<void>;
}

export function ContactOverview({ contact, onSaveField }: ContactOverviewProps) {
  const { canWrite } = useWorkspaceCapabilities();
  const { dict } = useCrmLocale();
  const r = dict.reviewRequest;
  const readOnly = !canWrite;
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const [country, setCountry] = useState(contact.country ?? "");
  const [showAddress, setShowAddress] = useState(false);
  const states = getStatesForCountry(country);

  useEffect(() => {
    setCountry(contact.country ?? "");
  }, [contact.country]);

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

  const accountOptions = companies.map((c) => ({
    id: c.id,
    label: c.name,
    href: `/accounts/${c.id}`,
  }));

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
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <InlineEditableField label="Email" value={contact.email} readOnly={readOnly} onSave={save("email")} />
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1 block">
            Phone
          </label>
          <PhoneInputInline value={contact.phone} readOnly={readOnly} onSave={save("phone")} />
        </div>

        <AssociationSelect
          label="Account"
          value={contact.company_id ?? ""}
          options={accountOptions}
          placeholder={companiesLoading ? "Loading accounts…" : "Link to account"}
          onChange={async (id) => saveField({ company_id: id })}
          disabled={readOnly}
        />

        <InlineSelectField
          label="Job title"
          value={contact.title}
          options={JOB_TITLE_OPTIONS}
          allowEmpty
          emptyLabel="— Select —"
          readOnly={readOnly}
          onSave={save("title")}
        />

        <InlineSelectField
          label="Status"
          value={contact.status}
          options={[
            { value: "lead", label: "Lead" },
            { value: "prospect", label: "Prospect" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          readOnly={readOnly}
          onSave={async (v) =>
            saveField({ status: v as Contact["status"] })
          }
        />

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted block mb-1">
            Tags
          </label>
          <TagsChips
            tags={contact.tags ?? []}
            readOnly={readOnly}
            onChange={(next) => void saveField({ tags: next.join(", ") })}
          />
        </div>

      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-body-muted">
            Contact insights
          </p>
          <p className="text-xs text-body-muted mt-0.5">
            Populated by workflows and automation. Edit when needed.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 min-w-0">
          <InlineEditableField
            label="Platform"
            value={contact.platform}
            placeholder="e.g. Shopify, WooCommerce"
            readOnly={readOnly}
            onSave={save("platform")}
          />
          <InlineEditableField
            label="Friction area"
            value={contact.friction_area}
            placeholder="Not set yet"
            multiline
            readOnly={readOnly}
            onSave={save("friction_area")}
          />
          <InlineEditableField
            label="Communication channels"
            value={contact.communication_channels}
            placeholder="e.g. email, WhatsApp"
            readOnly={readOnly}
            onSave={save("communication_channels")}
          />
          <InlineEditableField
            label="Signals"
            value={contact.signals}
            placeholder="Intent, engagement"
            multiline
            className="sm:col-span-2"
            readOnly={readOnly}
            onSave={save("signals")}
          />
          <InlineEditableField
            label="AI summary"
            value={contact.ai_summary}
            placeholder="Summary from automation"
            multiline
            readOnly={readOnly}
            onSave={save("ai_summary")}
          />
        </div>
      </div>

      <RecordDates
        createdAt={contact.created_at}
        updatedAt={contact.updated_at}
      />

      <div>
        <button
          type="button"
          onClick={() => setShowAddress((v) => !v)}
          className="text-xs font-medium text-[var(--secondary)] hover:underline"
        >
          {showAddress ? "Hide" : "Show"} address & additional details
        </button>
        {showAddress && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-4 pt-4 border-t border-[var(--card-border)]">
            <InlineEditableField label="Source" value={contact.source} onSave={save("source")} />
            <InlineSelectField
              label="Country"
              value={country}
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              allowEmpty
              emptyLabel="— Select —"
              readOnly={readOnly}
              onSave={handleCountryChange}
            />
            {states.length > 0 ? (
              <InlineSelectField
                label="State / Province"
                value={contact.state}
                options={states.map((s) => ({ value: s.name, label: s.name }))}
                allowEmpty
                emptyLabel="— Select —"
                readOnly={readOnly}
                onSave={handleStateChange}
              />
            ) : (
              <InlineEditableField
                label="State / Province"
                value={contact.state}
                readOnly={readOnly}
                onSave={handleStateChange}
              />
            )}
            <InlineEditableField label="City" value={contact.city} onSave={save("city")} />
            <InlineEditableField
              label="Postal code"
              value={contact.postal_code}
              readOnly={readOnly}
            onSave={save("postal_code")}
            />
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1 block">
                Time zone
              </label>
              <p className="text-sm text-heading">
                {(() => {
                  const tz =
                    contact.timezone ||
                    getTimezoneForLocation(country, contact.state);
                  return tz ? formatTimezone(tz) : "Not set";
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
      </div>

      <div className="border-t border-[var(--card-border)] pt-5 space-y-3">
        {contact.review_requested_at && (
          <p className="text-sm text-body-muted">
            {r?.lastSent ?? "Review invitation sent"}:{" "}
            <span className="text-heading font-medium">
              {formatDateTime(contact.review_requested_at)}
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
      </div>

      <EntityCustomFieldsOverview
        entityType="contact"
        values={contact.custom_fields}
        readOnly={readOnly}
        onSave={async (custom_fields) => saveField({ custom_fields })}
      />
    </div>
  );
}
