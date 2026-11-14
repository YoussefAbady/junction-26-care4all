"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Language } from "@/lib/survey";

/**
 * Only two harmless preferences ever touch browser storage: the language and the text size.
 * Nothing about a person's health is stored here.
 */
export type TextSize = "md" | "lg" | "xl";
const LANGUAGE = "care4ll-language";
const SIZE = "care4ll-text";
const listeners = new Set<() => void>();
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* storage may be blocked */ } listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
};
const savedLanguage = () => { const value = read(LANGUAGE); return value === "fi" || value === "en" ? value : null; };
const savedSize = (): TextSize => { const value = read(SIZE); return value === "lg" || value === "xl" ? value : "md"; };

type Prefs = {
  lang: Language;
  setLang: (language: Language) => void;
  /** Used only when the person has not picked a language yet, for example from their account. */
  suggest: (language: Language) => void;
  size: TextSize;
  setSize: (size: TextSize) => void;
  t: (en: string, fi: string) => string;
};
const Context = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const saved = useSyncExternalStore(subscribe, savedLanguage, () => null);
  const size = useSyncExternalStore(subscribe, savedSize, () => "md" as TextSize);
  const [suggested, suggest] = useState<Language>("en");
  const lang = saved ?? suggested;
  const setLang = useCallback((language: Language) => write(LANGUAGE, language), []);
  const setSize = useCallback((next: TextSize) => write(SIZE, next), []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { document.documentElement.dataset.text = size; }, [size]);
  const value = useMemo<Prefs>(() => ({ lang, setLang, suggest, size, setSize, t: (en, fi) => lang === "fi" ? fi : en }), [lang, setLang, size, setSize]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePrefs() {
  const value = useContext(Context);
  if (!value) throw new Error("usePrefs must be used inside PrefsProvider");
  return value;
}
