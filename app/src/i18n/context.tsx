"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { translations, type Locale, type TranslationKeys } from "./translations";

interface I18nContextValue {
  locale: Locale;
  t: TranslationKeys;
  toggle: () => void;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggle = useCallback(
    () => setLocaleState((prev) => (prev === "en" ? "zh" : "en")),
    []
  );

  return (
    <I18nContext.Provider
      value={{ locale, t: translations[locale], toggle, setLocale }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
