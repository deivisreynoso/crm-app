"use client";

import { InlineEditableField } from "@/components/ui/inline-editable-field";
import type { Company } from "@/types";

export type AccountPatch = Partial<{
  name: string;
  website: string;
  phone: string;
  industry: string;
  company_size: string;
  revenue: string;
  account_summary: string;
}>;

interface AccountOverviewProps {
  account: Company;
  onSaveField: (patch: AccountPatch) => Promise<void>;
}

export function AccountOverview({ account, onSaveField }: AccountOverviewProps) {
  const save =
    (field: keyof AccountPatch) => (value: string) =>
      onSaveField({ [field]: value } as AccountPatch);

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      <InlineEditableField
        label="Account name"
        value={account.name}
        required
        onSave={save("name")}
      />
      <InlineEditableField
        label="Industry"
        value={account.industry}
        onSave={save("industry")}
      />
      <InlineEditableField
        label="Website"
        value={account.website}
        href={
          account.website
            ? account.website.startsWith("http")
              ? account.website
              : `https://${account.website}`
            : undefined
        }
        onSave={save("website")}
      />
      <InlineEditableField
        label="Phone"
        value={account.phone}
        onSave={save("phone")}
      />
      <InlineEditableField
        label="Company size"
        value={account.company_size}
        onSave={save("company_size")}
      />
      <InlineEditableField
        label="Revenue"
        value={account.revenue}
        onSave={save("revenue")}
      />
      <div className="sm:col-span-2">
        <InlineEditableField
          label="Account summary"
          value={account.account_summary}
          multiline
          onSave={save("account_summary")}
        />
      </div>
    </dl>
  );
}
