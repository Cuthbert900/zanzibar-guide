import { Button } from "@/components/ui/button";
import { MessageCircle, Shield, Hotel, MapPin, AlertCircle, Ticket } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuickRepliesProps {
  onSelect: (question: string) => void;
  isLoading?: boolean;
}

export function QuickReplies({ onSelect, isLoading = false }: QuickRepliesProps) {
  const { t } = useLanguage();

  const quickQuestions = [
    { icon: MapPin, label: t("findAttractions"), question: t("attractions"), color: "text-primary", bgColor: "bg-primary/10 hover:bg-primary/20" },
    { icon: Hotel, label: t("hotelsStays"), question: t("hotels"), color: "text-orange-600", bgColor: "bg-orange-100 hover:bg-orange-200" },
    { icon: Shield, label: t("travelSafety"), question: t("safety"), color: "text-red-600", bgColor: "bg-red-100 hover:bg-red-200" },
    { icon: Ticket, label: t("bookTour"), question: t("tour"), color: "text-green-600", bgColor: "bg-green-100 hover:bg-green-200" },
    { icon: AlertCircle, label: t("emergencyHelp"), question: t("emergency"), color: "text-purple-600", bgColor: "bg-purple-100 hover:bg-purple-200" },
    { icon: MessageCircle, label: t("generalInfo"), question: t("general"), color: "text-blue-600", bgColor: "bg-blue-100 hover:bg-blue-200" },
  ];

  return (
    <div className="space-y-2" role="group" aria-label={t("quickQuestions")}>
      <p className="text-xs font-medium text-muted-foreground px-1">{t("quickQuestions")}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {quickQuestions.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              onClick={() => onSelect(item.question)}
              disabled={isLoading}
              variant="outline"
              className={`h-9 shrink-0 justify-start gap-2 px-3 text-left ${item.bgColor} border-border/50`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
              <span className="whitespace-nowrap text-xs font-medium text-foreground">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
