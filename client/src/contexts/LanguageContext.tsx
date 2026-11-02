import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSessionId } from "@/lib/session";
import { LANGUAGE_LABELS, LANGUAGE_LOCALES, LANGUAGES, type Language } from "@/i18n/languages";
import { interpolate, translations } from "@/i18n/translations";

export type { Language } from "@/i18n/languages";
export { LANGUAGES, LANGUAGE_LABELS };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  languageLabel: string;
  /** Locale for Intl date and time formatting */
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const KEY = "tourism_chatbot_language";

function isLanguage(v: string | null): v is Language {
  return v === "en" || v === "es" || v === "fr" || v === "de" || v === "zh" || v === "sw";
}

/** The first of the browser's preferred languages that the app supports, if any. */
function browserLanguage(): Language | null {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const primary = tag.toLowerCase().split("-")[0];
    if (isLanguage(primary)) return primary;
  }
  return null;
}

function syncLanguageToServer(lang: Language) {
  fetch(`/api/context/${getSessionId()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: lang }),
  }).catch(() => {});
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    // An explicit choice wins; otherwise follow the browser. Only explicit choices are stored.
    const stored = localStorage.getItem(KEY);
    return isLanguage(stored) ? stored : (browserLanguage() ?? "en");
  });

  useEffect(() => {
    document.documentElement.lang = language;
    syncLanguageToServer(language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(KEY, lang);
    syncLanguageToServer(lang);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const raw = translations[language]?.[key] || translations.en[key] || key;
      return interpolate(raw, vars);
    },
    [language],
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, languageLabel: LANGUAGE_LABELS[language], locale: LANGUAGE_LOCALES[language] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <select
      aria-label={t("language")}
      className="text-xs border border-border rounded-md px-2 py-1 bg-background"
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
    >
      {LANGUAGES.map((l) => (
        <option key={l} value={l}>
          {LANGUAGE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
