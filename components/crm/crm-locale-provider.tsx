"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultCrmLocale,
  getCrmDictionary,
  isCrmLocale,
  type CrmDictionary,
  type CrmLocale,
} from "@/lib/crm/i18n";

type Ctx = {
  locale: CrmLocale;
  dict: CrmDictionary;
  setLocale: (locale: CrmLocale) => void;
};

const CrmLocaleContext = createContext<Ctx | null>(null);

export function CrmLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: string | null;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<CrmLocale>(
    initialLocale && isCrmLocale(initialLocale) ? initialLocale : defaultCrmLocale
  );
  const [dict, setDict] = useState<CrmDictionary | null>(null);

  useEffect(() => {
    void getCrmDictionary(locale).then(setDict);
  }, [locale]);

  const setLocale = useCallback((next: CrmLocale) => {
    setLocaleState(next);
    void fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ui_locale: next }),
    });
  }, []);

  const value = useMemo(
    () => ({
      locale,
      dict: dict ?? ({} as CrmDictionary),
      setLocale,
    }),
    [locale, dict, setLocale]
  );

  if (!dict) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-body-muted text-sm">
        …
      </div>
    );
  }

  return (
    <CrmLocaleContext.Provider value={value}>{children}</CrmLocaleContext.Provider>
  );
}

export function useCrmLocale() {
  const ctx = useContext(CrmLocaleContext);
  if (!ctx) {
    throw new Error("useCrmLocale must be used within CrmLocaleProvider");
  }
  return ctx;
}
