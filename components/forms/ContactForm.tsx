"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactFormData } from "@/lib/validators";
import { JOB_TITLE_OPTIONS } from "@/lib/constants/job-titles";
import {
  COUNTRIES,
  getStatesForCountry,
  getTimezoneForLocation,
} from "@/lib/constants/countries";
import { formatTimezone } from "@/lib/constants/contact-fields";
import { Button } from "@/components/ui/button";
import { FormLabel, RequiredHint } from "@/components/ui/form-label";
import { PhoneInput } from "@/components/ui/phone-input";
import { TagsInput } from "@/components/forms/tags-input";
import { useCustomFields } from "@/hooks/useCustomFields";
import {
  EntityCustomFieldsForm,
  type CustomFieldValues,
} from "@/components/custom-fields/entity-custom-fields-form";
import type { ContactFormInput } from "@/types";

interface ContactFormProps {
  onSubmit: (data: ContactFormInput) => void | Promise<void>;
  defaultValues?: Partial<ContactFormData>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function ContactForm({
  onSubmit,
  defaultValues,
  isLoading,
  submitLabel = "Save Contact",
}: ContactFormProps) {
  const formDefaults = useMemo(
    () => ({
      status: "lead" as const,
      custom_fields: {},
      ...defaultValues,
    }),
    [defaultValues]
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: formDefaults,
  });

  useEffect(() => {
    reset(formDefaults);
  }, [formDefaults, reset]);

  const { data: customFieldDefs = [], isLoading: customFieldsLoading } =
    useCustomFields("contact");

  const country = useWatch({ control, name: "country" });
  const state = useWatch({ control, name: "state" });
  const timezone = useWatch({ control, name: "timezone" });
  const states = getStatesForCountry(country);

  useEffect(() => {
    if (!country) return;
    const tz = getTimezoneForLocation(country, state);
    if (tz) setValue("timezone", tz);
  }, [country, state, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FormLabel required htmlFor="first_name">
            First name
          </FormLabel>
          <input id="first_name" {...register("first_name")} className="input-field" />
          {errors.first_name && (
            <p className="text-sm text-[var(--error)] mt-1">{errors.first_name.message}</p>
          )}
        </div>
        <div>
          <FormLabel required htmlFor="last_name">
            Last name
          </FormLabel>
          <input id="last_name" {...register("last_name")} className="input-field" />
          {errors.last_name && (
            <p className="text-sm text-[var(--error)] mt-1">{errors.last_name.message}</p>
          )}
        </div>
        <div>
          <FormLabel htmlFor="email">Email</FormLabel>
          <input id="email" type="email" {...register("email")} className="input-field" />
          {errors.email && (
            <p className="text-sm text-[var(--error)] mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <FormLabel htmlFor="phone">Phone</FormLabel>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput id="phone" value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </div>
      <RequiredHint>Email or phone is required</RequiredHint>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FormLabel htmlFor="company">Company</FormLabel>
          <input id="company" {...register("company")} className="input-field" />
        </div>
        <div>
          <FormLabel htmlFor="website">Website</FormLabel>
          <input
            id="website"
            type="text"
            {...register("website")}
            className="input-field"
            placeholder="example.com"
            autoComplete="url"
          />
        </div>
        <div>
          <FormLabel htmlFor="title">Job title</FormLabel>
          <select id="title" {...register("title")} className="input-field">
            <option value="">Select title</option>
            {JOB_TITLE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel htmlFor="status">Status</FormLabel>
          <select id="status" {...register("status")} className="input-field">
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <FormLabel htmlFor="source">Source</FormLabel>
          <input id="source" {...register("source")} className="input-field" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FormLabel htmlFor="country">Country</FormLabel>
          <select id="country" {...register("country")} className="input-field">
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel htmlFor="state">State / Province</FormLabel>
          {states.length > 0 ? (
            <select id="state" {...register("state")} className="input-field">
              <option value="">Select state</option>
              {states.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <input id="state" {...register("state")} className="input-field" />
          )}
        </div>
        <div>
          <FormLabel htmlFor="city">City</FormLabel>
          <input id="city" {...register("city")} className="input-field" />
        </div>
        <div>
          <FormLabel htmlFor="postal_code">Postal code</FormLabel>
          <input id="postal_code" {...register("postal_code")} className="input-field" />
        </div>
        <div>
          <FormLabel htmlFor="timezone">Time zone</FormLabel>
          <input
            id="timezone"
            {...register("timezone")}
            readOnly
            className="input-field bg-[var(--background)]"
            placeholder="Set by country"
          />
          {(timezone || country) && (
            <p className="text-xs text-body-muted mt-1">
              {formatTimezone(
                timezone || getTimezoneForLocation(country, state) || ""
              )}
            </p>
          )}
        </div>
        <div>
          <FormLabel htmlFor="tags">Tags</FormLabel>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagsInput value={field.value ?? ""} onChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <div>
        <FormLabel htmlFor="notes">About</FormLabel>
        <textarea id="notes" {...register("notes")} rows={3} className="input-field" />
      </div>

      <Controller
        name="custom_fields"
        control={control}
        render={({ field }) => (
          <EntityCustomFieldsForm
            fields={customFieldDefs}
            isLoading={customFieldsLoading}
            values={(field.value as CustomFieldValues) ?? {}}
            onChange={field.onChange}
          />
        )}
      />

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
