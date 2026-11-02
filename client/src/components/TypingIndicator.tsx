import { useLanguage } from "@/contexts/LanguageContext";

type TypingIndicatorProps = {
  text?: string;
};

export default function TypingIndicator({ text }: TypingIndicatorProps) {
  const { t } = useLanguage();
  return (
    <span className="zd-typing" aria-live="polite" role="status">
      <i />
      <i />
      <i />
      <span>{text ?? t("findingDetails")}</span>
    </span>
  );
}
