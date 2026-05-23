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
  getTimezoneForCountry,
} from "@/lib/constants/countries";
import { formatTimezone } from "@/lib/constants/contact-fields";
import { formatApiError } from "@/lib/validation-errors";
import { formatTagsForInput } from "@/lib/tags";
import { useCompanies } from "@/hooks/useCompanies";
import { EntityCustomFieldsOverview } from "@/components/custom-fields/entity-custom-fields-overview";
import type { Contact, ContactFormInput } from "@/types";

interface ContactOverviewProps {
  contact: Contact;
  onSaveField: (patch: Partial<ContactFormInput>) => Promise<void>;
}

export function ContactOverview({ contact, onSaveField }: ContactOverviewProps) {
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const [country, setCountry] = useState(contact.country ?? "");
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
    const patch: Partial<ContactFormInput> = { country: code };
    const tz = getTimezoneForCountry(code);
    if (tz) patch.timezone = tz;
    await saveField(patch);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      <InlineEditableField label="Email" value={contact.email} onSave={save("email")} />
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1 block">
          Phone
        </label>
        <PhoneInputInline value={contact.phone} onSave={save("phone")} />
      </div>

      <AssociationSelect
        label="Account"
        value={contact.company_id ?? ""}
        options={accountOptions}
        placeholder={companiesLoading ? "Loading accounts…" : "Link to account"}
        onChange={async (id) => saveField({ company_id: id })}
      />

      <InlineSelectField
        label="Job title"
        value={contact.title}
        options={JOB_TITLE_OPTIONS}
        allowEmpty
        emptyLabel="— Select —"
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
        onSave={async (v) =>
          saveField({ status: v as Contact["status"] })
        }
      />

      <InlineEditableField label="Source" value={contact.source} onSave={save("source")} />

      <InlineSelectField
        label="Country"
        value={country}
        options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
        allowEmpty
        emptyLabel="— Select —"
        onSave={handleCountryChange}
      />

      {states.length > 0 ? (
        <InlineSelectField
          label="State / Province"
          value={contact.state}
          options={states.map((s) => ({ value: s.name, label: s.name }))}
          allowEmpty
          emptyLabel="— Select —"
          onSave={save("state")}
        />
      ) : (
        <InlineEditableField
          label="State / Province"
          value={contact.state}
          onSave={save("state")}
        />
      )}

      <InlineEditableField label="City" value={contact.city} onSave={save("city")} />
      <InlineEditableField
        label="Postal code"
        value={contact.postal_code}
        onSave={save("postal_code")}
      />

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1 block">
          Time zone
        </label>
        <p className="text-sm text-heading">
          {contact.timezone
            ? formatTimezone(contact.timezone)
            : country
              ? formatTimezone(getTimezoneForCountry(country))
              : "Not set"}
        </p>
        {country && (
          <p className="text-xs text-body-muted mt-0.5">
            {getCountryByCode(country)?.name}
          </p>
        )}
      </div>

      <InlineEditableField
        label="Tags"
        value={formatTagsForInput(contact.tags)}
        onSave={async (v) => saveField({ tags: v })}
      />

      <InlineEditableField
        label="About"
        value={contact.notes}
        multiline
        className="sm:col-span-2"
        onSave={save("notes")}
      />

      <EntityCustomFieldsOverview
        entityType="contact"
        values={contact.custom_fields}
        onSave={async (custom_fields) => saveField({ custom_fields })}
      />

      <RecordDates
        createdAt={contact.created_at}
        updatedAt={contact.updated_at}
        className="sm:col-span-2"
      />
    </div>
  );
}
