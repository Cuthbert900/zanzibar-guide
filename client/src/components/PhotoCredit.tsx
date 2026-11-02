import type { CreditedPhoto } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PhotoCredit({ photo, className }: { photo: CreditedPhoto; className?: string }) {
  const { t } = useLanguage();
  return (
    <span className={className}>
      {t("photo")}:{" "}
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
        {photo.author}
      </a>
      ,{" "}
      <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
        {photo.license}
      </a>
      , {t("viaCommons")}
    </span>
  );
}
