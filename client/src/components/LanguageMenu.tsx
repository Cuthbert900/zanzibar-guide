import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGE_LABELS, LANGUAGES, useLanguage, type Language } from "@/contexts/LanguageContext";

/** Top-bar language picker; each language is listed in its own name so visitors can find theirs. */
export default function LanguageMenu() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("changeLanguage", { language: LANGUAGE_LABELS[language] })}
          className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold uppercase focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Globe size={15} aria-hidden="true" />
          {language}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup value={language} onValueChange={(value) => setLanguage(value as Language)}>
          {LANGUAGES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {LANGUAGE_LABELS[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
