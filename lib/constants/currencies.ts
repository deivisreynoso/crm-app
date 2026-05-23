export const WORKSPACE_CURRENCIES = ["USD", "MXN"] as const;

export type WorkspaceCurrency = (typeof WORKSPACE_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<WorkspaceCurrency, string> = {
  USD: "US Dollar (USD)",
  MXN: "Mexican Peso (MXN)",
};
