"use client";

import { ContactSearchCombobox } from "@/components/forms/contact-search-combobox";

type ContactSelectProps = {
  value: string;
  onChange: (contactId: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label?: string;
  error?: string;
  placeholder?: string;
  className?: string;
};

/** @deprecated Prefer ContactSearchCombobox — kept for invoice/document forms. */
export function ContactSelect({
  className,
  placeholder: _placeholder,
  ...props
}: ContactSelectProps) {
  return (
    <div className={className}>
      <ContactSearchCombobox {...props} />
    </div>
  );
}
