import {
  Compass,
  CalendarDays,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { TripWizardPanel } from "@/components/TripWizardPanel";
import { StorytellerPanel } from "@/components/StorytellerPanel";
import { SuitabilityWeatherPanel } from "@/components/SuitabilityWeatherPanel";
import { CatalogSearchPanel } from "@/components/CatalogSearchPanel";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { ReviewsPanel } from "@/components/ReviewsPanel";
import { TravelProfilePanel } from "@/components/TravelProfilePanel";
import { RoutePlannerPanel } from "@/components/RoutePlannerPanel";
import { ArrivalLogisticsPanel } from "@/components/ArrivalLogisticsPanel";
import {
  AlsoVisitedPanel,
  ComparePanel,
  GamificationPanel,
  PriceAlertPanel,
  TrendingPanel,
} from "@/components/EngagementPanels";
import { BudgetCalculatorPanel } from "@/components/BudgetCalculatorPanel";
import { CurrencyConverterPanel } from "@/components/CurrencyConverterPanel";
import { SpendingTrackerPanel } from "@/components/SpendingTrackerPanel";
import { FavoritesPanel } from "@/components/FavoritesPanel";
import { DiningGuidePanel } from "@/components/DiningGuidePanel";
import { BookingsPanel } from "@/components/BookingsPanel";
import { HandoffPanel } from "@/components/HandoffPanel";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { FaqPanel } from "@/components/FaqPanel";
import { CompanionPanel } from "@/components/CompanionPanel";
import { PolicyModePanel } from "@/components/PolicyModePanel";
import { OpenDataSearch } from "@/components/OpenDataSearch";
import { BrochureUploadPanel } from "@/components/BrochureUploadPanel";
import { TransportInfoPanel } from "@/components/EngagementPanels";
import { PackingListPanel } from "@/components/PackingListPanel";
import { PhraseTranslatorPanel } from "@/components/PhraseTranslatorPanel";
import { SouvenirsPanel } from "@/components/SouvenirsPanel";
import { DocumentVaultPanel } from "@/components/DocumentVaultPanel";
import { GamificationPanel as GamificationPanel2 } from "@/components/EngagementPanels";
import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";

export function Tools() {
  const { t, language } = useLanguage();
  const { favorites, removeFavorite } = useFavorites();
  const [toolCategory, setToolCategory] = useState<string | null>(null);

  const toolCategories = [
    {
      id: "discover",
      title: t("essentials"),
      description: t("discoverToolsDescription"),
      icon: Compass,
      count: 8,
    },
    {
      id: "plan",
      title: t("planAndBook"),
      description: t("planToolsDescription"),
      icon: CalendarDays,
      count: 13,
    },
    {
      id: "help",
      title: t("helpAndInfo"),
      description: t("helpToolsDescription"),
      icon: ShieldCheck,
      count: 11,
    },
    {
      id: "extras",
      title: t("extras"),
      description: t("extraToolsDescription"),
      icon: Sparkles,
      count: 2,
    },
  ];

  return (
    <div>
      {!toolCategory && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {toolCategories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setToolCategory(category.id)}
                className="group flex min-h-24 items-start gap-3 rounded-md border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <CategoryIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                    {category.title}
                    <span className="text-[10px] font-normal text-muted-foreground">{category.count}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {category.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {toolCategory && (
        <button type="button" onClick={() => setToolCategory(null)}>
          &larr; {t("allTools")}
        </button>
      )}

      {toolCategory === "discover" && (
        <>
          <ItineraryPanel onTripBuilt={() => {}} />
          <TripWizardPanel onTripBuilt={() => {}} onDecision={() => {}} />
          <StorytellerPanel locationId={undefined} />
          <SuitabilityWeatherPanel locationId={undefined} />
          <CatalogSearchPanel onResults={() => {}} onSelect={() => {}} />
          <AvailabilityCalendar itemId="" itemName="" onSelectDate={() => {}} />
          <ReviewsPanel locationId="" locationName="" />
          <TravelProfilePanel onSelect={() => {}} />
        </>
      )}

      {toolCategory === "plan" && (
        <>
          <RoutePlannerPanel favorites={favorites} onRouteBuilt={() => {}} />
          <ArrivalLogisticsPanel onBook={() => {}} />
          <ComparePanel candidates={[]} />
          <PriceAlertPanel itemId="" itemName="" />
          <BudgetCalculatorPanel activityCandidates={[]} />
          <CurrencyConverterPanel />
          <SpendingTrackerPanel />
          <FavoritesPanel favorites={favorites} onRemove={removeFavorite} onSelect={() => {}} />
          <TrendingPanel onSelect={() => {}} />
          <AlsoVisitedPanel locationId="" onSelect={() => {}} />
          <DiningGuidePanel />
          <BookingsPanel refreshKey={0} />
          <HandoffPanel messages={[]} onStatus={() => {}} />
        </>
      )}

      {toolCategory === "help" && (
        <>
          <PreferencesPanel language={language} />
          <FaqPanel />
          <CompanionPanel locationIds={[]} />
          <PolicyModePanel />
          <OpenDataSearch onResults={() => {}} />
          <BrochureUploadPanel />
          <TransportInfoPanel location={undefined} />
          <PackingListPanel />
          <PhraseTranslatorPanel />
          <SouvenirsPanel attractionIds={[]} />
          <DocumentVaultPanel />
        </>
      )}

      {toolCategory === "extras" && (
        <>
          <GamificationPanel2 />
          <AccessibilityPanel />
        </>
      )}
    </div>
  );
}
