export type Language = "en" | "es" | "fr" | "de" | "zh" | "sw";

export const LANGUAGES: Language[] = ["en", "es", "fr", "de", "zh", "sw"];

/** Locale used for dates and times in each language. */
export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  zh: "zh-CN",
  sw: "sw-TZ",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  sw: "Kiswahili",
};
