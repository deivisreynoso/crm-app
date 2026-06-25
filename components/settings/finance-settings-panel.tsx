"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useFinanceCategories,
  useFinanceSettings,
  useUpdateFinanceSettings,
} from "@/hooks/useFinances";
import axios from "axios";

export function FinanceSettingsPanel() {
  const { data: settings, isLoading } = useFinanceSettings();
  const { data: categories = [] } = useFinanceCategories();
  const updateSettings = useUpdateFinanceSettings();

  const [currency, setCurrency] = useState<"USD" | "MXN">("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [prefix, setPrefix] = useState("INV-");
  const [dueDays, setDueDays] = useState("30");
  const [footer, setFooter] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newKind, setNewKind] = useState<"income" | "expense">("income");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrency((settings.default_currency as "USD" | "MXN") ?? "USD");
    setTaxRate(String(settings.finance_default_tax_rate ?? 0));
    setPrefix(settings.invoice_number_prefix ?? "INV-");
    setDueDays(String(settings.invoice_default_due_days ?? 30));
    setFooter(settings.invoice_default_footer_text ?? "");
  }, [settings]);

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading finance settings…</p>;
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings.mutateAsync({
      default_currency: currency,
      finance_default_tax_rate: Number(taxRate),
      invoice_number_prefix: prefix,
      invoice_default_due_days: Number(dueDays),
      invoice_default_footer_text: footer || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addCategory() {
    if (!newLabel.trim()) return;
    await axios.post("/api/settings/finances/categories", {
      kind: newKind,
      label: newLabel.trim(),
    });
    setNewLabel("");
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <form className="space-y-4" onSubmit={(e) => void saveSettings(e)}>
        <h3 className="text-sm font-semibold text-heading">General</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium block mb-1">Default currency</label>
            <select
              className="input-field w-full"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USD" | "MXN")}
            >
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Default tax rate (%)</label>
            <input
              type="number"
              step="0.01"
              className="input-field w-full"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Invoice prefix</label>
            <input
              className="input-field w-full"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Default due days</label>
            <input
              type="number"
              className="input-field w-full"
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Default invoice footer</label>
          <textarea
            className="input-field w-full min-h-[80px]"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={updateSettings.isPending}>
            Save settings
          </Button>
          {saved && <span className="text-xs text-emerald-700">Saved</span>}
        </div>
        {settings?.invoice_number_locked && (
          <p className="text-xs text-body-muted">
            Invoice starting number is locked because invoices already exist.
          </p>
        )}
      </form>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-heading">Stripe</h3>
        <p className="text-sm text-body-muted">
          {settings?.stripe_configured
            ? "Stripe is configured on the server."
            : "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your environment."}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-heading">Categories</h3>
        <ul className="text-sm divide-y divide-[var(--card-border)] border border-[var(--card-border)] rounded-lg">
          {categories.map((c) => (
            <li key={c.id} className="flex justify-between px-3 py-2">
              <span>
                {c.label}{" "}
                <span className="text-body-muted text-xs">({c.kind})</span>
              </span>
              {c.is_system && <span className="text-xs text-body-muted">system</span>}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 items-end">
          <select
            className="input-field"
            value={newKind}
            onChange={(e) => setNewKind(e.target.value as "income" | "expense")}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input
            className="input-field flex-1 min-w-[12rem]"
            placeholder="New category label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => void addCategory()}>
            Add category
          </Button>
        </div>
      </section>
    </div>
  );
}
