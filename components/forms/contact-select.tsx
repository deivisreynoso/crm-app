"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useContacts } from "@/hooks/useContacts";
import { FormLabel } from "@/components/ui/form-label";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types";

function formatContactLabel(c: Pick<Contact, "first_name" | "last_name" | "company" | "email">) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  const company = c.company?.trim() ? ` · ${c.company}` : "";
  const email = c.email ? ` (${c.email})` : "";
  return `${name}${company}${email}`;
}

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

export function ContactSelect({
  value,
  onChange,
  required,
  disabled,
  id = "contact-select",
  label = "Contact",
  error,
  placeholder = "Select a contact…",
  className,
}: ContactSelectProps) {
  const { data, isLoading } = useContacts(1, 200);
  const contacts = data?.data ?? [];
  const [resolved, setResolved] = useState<Contact | null>(null);

  const missingSelected = useMemo(
    () => Boolean(value && !contacts.some((c) => c.id === value)),
    [value, contacts]
  );

  useEffect(() => {
    if (!value || !missingSelected) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    void axios
      .get<Contact>(`/api/contacts/${value}`)
      .then((res) => {
        if (!cancelled) setResolved(res.data);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, missingSelected]);

  const options = useMemo(() => {
    if (!resolved || contacts.some((c) => c.id === resolved.id)) return contacts;
    return [resolved, ...contacts];
  }, [contacts, resolved]);

  return (
    <div className={className}>
      <FormLabel htmlFor={id} required={required}>
        {label}
      </FormLabel>
      <select
        id={id}
        className={cn(
          "input-field w-full",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || (isLoading && !value)}
        required={required}
      >
        <option value="">
          {isLoading && !value ? "Loading contacts…" : placeholder}
        </option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {formatContactLabel(c)}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-[var(--error)] mt-1">{error}</p>}
    </div>
  );
}
