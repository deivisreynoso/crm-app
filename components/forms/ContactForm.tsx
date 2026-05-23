"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactFormData } from "@/lib/validators";
import { LANGUAGE_OPTIONS } from "@/lib/constants/activity";
import {
  PREFERRED_CONTACT_METHODS,
  TIMEZONE_OPTIONS,
  formatTimezone,
} from "@/lib/constants/contact-fields";
import { Button } from "@/components/ui/button";
import { FormLabel, RequiredHint } from "@/components/ui/form-label";
import { TagsInput } from "@/components/forms/tags-input";
import { useCompanies, useCreateCompany } from "@/hooks/useCompanies";
import type { ContactFormInput } from "@/types";

interface ContactFormProps {
  onSubmit: (data: ContactFormInput) => void | Promise<void>;
  defaultValues?: Partial<ContactFormData>;
  isLoading?: boolean;
  submitLabel?: string;
}

const inputClassName =
  "w-full px-4 py-2 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 pt-2 border-t border-slate-100 first:border-t-0 first:pt-0">
      <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function ContactForm({
  onSubmit,
  defaultValues,
  isLoading,
  submitLabel = "Save Contact",
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      status: "lead",
      ...defaultValues,
    },
  });

  const { data: companies = [] } = useCompanies();
  const createCompany = useCreateCompany();
  const [newCompanyName, setNewCompanyName] = useState("");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Section title="Basic info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FormLabel required htmlFor="first_name">
              First Name
            </FormLabel>
            <input id="first_name" {...register("first_name")} className={inputClassName} />
            {errors.first_name && (
              <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <FormLabel required htmlFor="last_name">
              Last Name
            </FormLabel>
            <input id="last_name" {...register("last_name")} className={inputClassName} />
            {errors.last_name && (
              <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="email">Email</FormLabel>
            <input id="email" type="email" {...register("email")} className={inputClassName} />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <FormLabel htmlFor="phone">Phone</FormLabel>
            <input id="phone" {...register("phone")} className={inputClassName} />
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>
        <RequiredHint>Email or phone is required</RequiredHint>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Account (Company)
            </label>
            <Controller
              name="company_id"
              control={control}
              render={({ field }) => (
                <select {...field} className={inputClassName}>
                  <option value="">No account linked</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            />
            <div className="flex gap-2 mt-2">
              <input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="New account name"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!newCompanyName.trim() || createCompany.isPending}
                onClick={async () => {
                  const res = await createCompany.mutateAsync({
                    name: newCompanyName.trim(),
                  });
                  setNewCompanyName("");
                  setValue("company_id", res.data.id);
                }}
              >
                Add
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company (legacy text)
            </label>
            <input {...register("company")} className={inputClassName} />
            <p className="text-xs text-slate-500 mt-1">
              Optional display name if not using an account record
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input {...register("title")} className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagsInput value={field.value ?? ""} onChange={field.onChange} />
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
            <input {...register("source")} className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select {...register("status")} className={inputClassName}>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Communication">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Preferred Contact Method
            </label>
            <select {...register("preferred_contact_method")} className={inputClassName}>
              <option value="">Select method</option>
              {PREFERRED_CONTACT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Preferred Language
            </label>
            <select {...register("preferred_language")} className={inputClassName}>
              <option value="">Select language</option>
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Communication Channels
          </label>
          <input
            {...register("communication_channels")}
            placeholder="e.g. Email, WhatsApp, Phone"
            className={inputClassName}
          />
          <p className="text-xs text-slate-500 mt-1">
            Separate multiple channels with commas
          </p>
        </div>
      </Section>

      <Section title="Business context">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Platform
            </label>
            <input
              {...register("platform")}
              className={inputClassName}
              placeholder="Filled by automation / AI"
            />
            <p className="text-xs text-slate-500 mt-1">
              Free text — usually set by integrations
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <input
              type="url"
              {...register("website")}
              placeholder="https://example.com"
              className={inputClassName}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Signals</label>
          <textarea
            {...register("signals")}
            rows={2}
            placeholder="Buying signals, intent indicators..."
            className={inputClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Friction Area
          </label>
          <textarea
            {...register("friction_area")}
            rows={2}
            placeholder="Objections, blockers, or pain points..."
            className={inputClassName}
          />
        </div>
      </Section>

      <Section title="Address">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Street Address
          </label>
          <input {...register("street_address")} className={inputClassName} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input {...register("city")} className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
            <input {...register("state")} className={inputClassName} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Postal Code
            </label>
            <input {...register("postal_code")} className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Time Zone
            </label>
            <select {...register("timezone")} className={inputClassName}>
              <option value="">Select timezone</option>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {formatTimezone(tz)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="About">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">About</label>
          <textarea
            {...register("notes")}
            rows={4}
            placeholder="Summary about this contact..."
            className={inputClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date of Birth
          </label>
          <input type="date" {...register("date_of_birth")} className={inputClassName} />
        </div>
      </Section>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
