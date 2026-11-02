import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  AlertCircle,
  PanelRight,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  Compass,
  Search,
  CalendarDays,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChatMap, MapLocation } from "@/components/ChatMap";
import { BookingModal } from "@/components/BookingModal";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { FaqPanel } from "@/components/FaqPanel";
import { FavoritesPanel } from "@/components/FavoritesPanel";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { OpenDataSearch } from "@/components/OpenDataSearch";
import { CompanionPanel } from "@/components/CompanionPanel";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { HandoffPanel } from "@/components/HandoffPanel";
import { BrochureUploadPanel } from "@/components/BrochureUploadPanel";
import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { RoutePlannerPanel } from "@/components/RoutePlannerPanel";
import { PackingListPanel } from "@/components/PackingListPanel";
import { SouvenirsPanel } from "@/components/SouvenirsPanel";
import { PhraseTranslatorPanel } from "@/components/PhraseTranslatorPanel";
import { DocumentVaultPanel } from "@/components/DocumentVaultPanel";
import { CatalogSearchPanel } from "@/components/CatalogSearchPanel";
import { ReviewsPanel } from "@/components/ReviewsPanel";
import { CurrencyConverterPanel } from "@/components/CurrencyConverterPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { STONE_TOWN_PHOTO } from "@/const";
import PhotoCredit from "@/components/PhotoCredit";
import "./explore-page.css";
import { BudgetCalculatorPanel } from "@/components/BudgetCalculatorPanel";
import { DiningGuidePanel } from "@/components/DiningGuidePanel";
import { SpendingTrackerPanel } from "@/components/SpendingTrackerPanel";
import { StorytellerPanel } from "@/components/StorytellerPanel";
import { SuitabilityWeatherPanel } from "@/components/SuitabilityWeatherPanel";
import { TripWizardPanel } from "@/components/TripWizardPanel";
import { ArrivalLogisticsPanel } from "@/components/ArrivalLogisticsPanel";
import { PolicyModePanel } from "@/components/PolicyModePanel";
import {
  AlsoVisitedPanel,
  ComparePanel,
  GamificationPanel,
  PriceAlertPanel,
  TransportInfoPanel,
  TrendingPanel,
} from "@/components/EngagementPanels";
import { TravelProfilePanel } from "@/components/TravelProfilePanel";
import { BookingsPanel } from "@/components/BookingsPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFavorites } from "@/hooks/useFavorites";
import AccountMenu from "@/components/AccountMenu";
import LanguageMenu from "@/components/LanguageMenu";
import { useLanguage } from "@/contexts/LanguageContext";
import { CurrencySwitcher } from "@/contexts/CurrencyContext";
import { BRAND } from "@shared/travel";
import type { SafetyAdvisory } from "@shared/catalog";
import { rememberGuestBooking } from "@/lib/bookings";

// A short result from a tool (emergency lookup, trip wizard, handoff, payment) shown above the tools.
interface ToolNotice {
  id: string;
  text: string;
}

interface BookingTarget {
  id: string;
  name: string;
  type: "hotel" | "attraction" | "tour";
  price: string;
}

const FEATURE_IMAGES = {
  attractions: STONE_TOWN_PHOTO.src,
  safety:
    "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=80",
  booking:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
};

export default function Home() {
  const { language, t } = useLanguage();
  const { favorites, removeFavorite } = useFavorites();
  const [notices, setNotices] = useState<ToolNotice[]>([]);
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | undefined>();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingItem, setSelectedBookingItem] = useState<BookingTarget | undefined>();
  const [alerts, setAlerts] = useState<SafetyAdvisory[]>([]);
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolCategory, setToolCategory] = useState<string | null>(null);
  const [toolQuery, setToolQuery] = useState("");
  const [isXl, setIsXl] = useState(false);
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0);

  const addNotice = (text: string) =>
    setNotices((prev) => [...prev, { id: `${Date.now()}_${prev.length}`, text }].slice(-3));

  useEffect(() => {
    fetch("/api/safety/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const apply = () => setIsXl(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Stripe Checkout return — confirm payment and notify
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paidId = params.get("paid");
    if (!paidId) return;
    const token = localStorage.getItem("travelguide_token");
    fetch("/api/payments/confirm-stripe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ bookingId: paidId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.confirmationCode) {
          rememberGuestBooking(paidId);
          setBookingsRefreshKey((k) => k + 1);
          addNotice(`Payment confirmed. Confirmation code: ${d.data.confirmationCode}. Track: /bookings/${d.data.confirmationCode}`);
        }
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch(() => {});
  }, []);

  const findNearbyEmergency = () => {
    setEmergencyStatus("Locating…");
    if (!navigator.geolocation) {
      setEmergencyStatus("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await fetch(`/api/emergency/nearby?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Lookup failed");
          const locs = (data.data || []) as MapLocation[];
          setMapLocations(locs);
          setSelectedLocation(locs[0]);
          setEmergencyStatus(`Found ${locs.length} nearby support centers`);
          addNotice(
            `Nearest emergency support from your location:\n\n${locs
              .map((l: MapLocation & { distanceKm?: number }) => `• ${l.name}${l.distanceKm != null ? ` (${l.distanceKm} km)` : ""}${l.description ? `: ${l.description}` : ""}`)
              .join("\n")}`,
          );
        } catch (err) {
          setEmergencyStatus(err instanceof Error ? err.message : "Emergency lookup failed");
        }
      },
      () => setEmergencyStatus("Location permission denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const renderToolsRail = () => {
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
    const query = toolQuery.trim().toLocaleLowerCase();
    const visibleCategories = toolCategories.filter((category) =>
      `${category.title} ${category.description}`.toLocaleLowerCase().includes(query),
    );
    return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-foreground">{t("toolsAndMap")}</h2>
        <p className="text-[10px] text-muted-foreground">{t("toolsSubtitle")}</p>
      </div>

      {selectedLocation && (
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-[10px] font-medium uppercase text-muted-foreground">{t("inFocus")}</span>
          <span className="truncate text-sm font-semibold">{selectedLocation.name}</span>
        </div>
      )}

      <Card className="h-[240px] overflow-hidden border-border/70 shadow-sm">
        <ChatMap locations={mapLocations} selectedLocation={selectedLocation} onLocationSelect={setSelectedLocation} />
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="destructive" className="text-xs" onClick={findNearbyEmergency}>
          <AlertCircle className="mr-1 h-3.5 w-3.5" />
          {t("nearestEmergency")}
        </Button>
        {emergencyStatus && <span className="text-xs text-muted-foreground">{emergencyStatus}</span>}
      </div>

      {!toolCategory && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={toolQuery}
              onChange={(event) => setToolQuery(event.target.value)}
              placeholder={t("searchTools")}
              aria-label={t("searchTools")}
              className="h-10 rounded-md pl-9"
            />
          </div>
          {visibleCategories.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {visibleCategories.map((category) => {
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
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {t("noToolsFound")}
            </p>
          )}
        </div>
      )}

      {toolCategory && (
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Button type="button" size="sm" variant="ghost" className="-ml-2 gap-1" onClick={() => setToolCategory(null)}>
            <ChevronLeft className="h-4 w-4" />
            {t("allTools")}
          </Button>
        </div>
      )}

      {toolCategory === "discover" && <details open className="group border-b border-border/60 pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">
          {t("essentials")}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pt-2">
        <ItineraryPanel
          onTripBuilt={(trip) => {
            const stops = trip.days.flatMap((d) => d.stops || []);
            if (stops.length) {
              setMapLocations(stops);
              setSelectedLocation(stops[0]);
            }
          }}
        />

        <TripWizardPanel
          onTripBuilt={(stops, summary) => {
            if (stops.length) {
              setMapLocations(stops);
              setSelectedLocation(stops[0]);
            }
            if (summary) {
              addNotice(summary);
            }
          }}
          onDecision={(accepted, message) => {
            setToolsOpen(false);
            addNotice(accepted ? `✓ ${message}` : message);
          }}
        />

        <StorytellerPanel locationId={selectedLocation?.id} />
        <SuitabilityWeatherPanel locationId={selectedLocation?.id} />

        <CatalogSearchPanel
          onResults={(locs) => {
            setMapLocations(locs);
            if (locs[0]) setSelectedLocation(locs[0]);
          }}
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />

        {selectedLocation && (
          <AvailabilityCalendar
            itemId={selectedLocation.id}
            itemName={selectedLocation.name}
            onSelectDate={(day) => {
              setSelectedBookingItem({
                id: selectedLocation.id,
                name: selectedLocation.name,
                type:
                  selectedLocation.type === "hotel"
                    ? "hotel"
                    : selectedLocation.type === "attraction"
                      ? "attraction"
                      : "tour",
                price: day.priceLabel,
              });
              setBookingModalOpen(true);
              setToolsOpen(false);
            }}
          />
        )}

        <ReviewsPanel locationId={selectedLocation?.id} locationName={selectedLocation?.name} />

        <TravelProfilePanel
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />
        </div>
      </details>}

      {toolCategory === "plan" && <details open className="group border-b border-border/60 pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">
          {t("planAndBook")}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pt-2">

        <RoutePlannerPanel
          favorites={favorites}
          onRouteBuilt={(stops) => {
            setMapLocations(stops);
            if (stops[0]) setSelectedLocation(stops[0]);
          }}
        />

        <ArrivalLogisticsPanel
          onBook={(item) => {
            setSelectedBookingItem(item);
            setBookingModalOpen(true);
            setToolsOpen(false);
          }}
        />

        <ComparePanel candidates={mapLocations} />
        <PriceAlertPanel itemId={selectedLocation?.id} itemName={selectedLocation?.name} />
        <BudgetCalculatorPanel activityCandidates={mapLocations} />
        <CurrencyConverterPanel />
        <SpendingTrackerPanel />

        <FavoritesPanel
          favorites={favorites}
          onRemove={removeFavorite}
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />

        <TrendingPanel
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />
        <AlsoVisitedPanel
          locationId={selectedLocation?.id}
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />

        <DiningGuidePanel />

        <BookingsPanel refreshKey={bookingsRefreshKey} />

        <HandoffPanel
          messages={notices.map((n) => ({ type: "assistant" as const, content: n.text }))}
          onStatus={addNotice}
        />
        </div>
      </details>}

      {toolCategory === "help" && <details open className="group border-b border-border/60 pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">
          {t("helpAndInfo")}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pt-2">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="p-3 border-border/50">
            <PreferencesPanel language={language} />
          </Card>
          <Card className="p-3 border-border/50">
            <FaqPanel />
          </Card>
        </div>

        <CompanionPanel locationIds={mapLocations.map((l) => l.id).slice(0, 5)} />
        <PolicyModePanel />
        <OpenDataSearch
          onResults={(locs) => {
            setMapLocations(locs);
            if (locs[0]) setSelectedLocation(locs[0]);
          }}
        />
        <BrochureUploadPanel />
        <TransportInfoPanel location={selectedLocation} />
        <PackingListPanel />
        <PhraseTranslatorPanel />
        <SouvenirsPanel attractionIds={mapLocations.map((l) => l.id).slice(0, 5)} />
        <DocumentVaultPanel />
        </div>
      </details>}

      {toolCategory === "extras" && <details open className="group border-b border-border/60 pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">
          {t("extras")}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pt-2">

        <GamificationPanel />
        <AccessibilityPanel />
        </div>
      </details>}
    </div>
    );
  };

  return (
    <div className="explore-page min-h-screen">
      <header className="explore-header sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/travelguide-logo.svg" alt={BRAND.name} className="h-11 w-11 shrink-0 rounded-xl bg-primary/5 p-1 ring-1 ring-border/60" />
            <div className="min-w-0">
              <h1 className="travel-brand truncate text-xl text-foreground">{BRAND.name}</h1>
              <p className="truncate text-[11px] text-muted-foreground">{BRAND.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <CurrencySwitcher showRefresh={false} />
            <LanguageMenu />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2" aria-label={t("moreNavigation")}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("more")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{t("moreNavigation")}</DropdownMenuLabel>
                <DropdownMenuItem asChild><Link href="/">AI Chat</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/compare-trips">{t("compare")}</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
            <AccountMenu />
            <span className="explore-powered-by hidden md:inline-flex items-center gap-2 text-xs text-muted-foreground">
              {t("poweredBy")} {BRAND.poweredBy}
              {/* Two transparent renderings of the logo: navy lettering for light, pale lettering for dark. */}
              <img src="/images/cassava-ai-logo.png" alt="" className="h-4 w-auto dark:hidden" />
              <img src="/images/cassava-ai-logo-dark.png" alt="" className="hidden h-4 w-auto dark:block" />
            </span>
          </div>
        </div>
      </header>

      {alerts.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200/80">
          <div className="container mx-auto px-4 py-2 flex gap-3 overflow-x-auto text-xs text-amber-900">
            {alerts.map((a) => (
              <a key={a.id} href={a.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 hover:underline">
                <span className="font-semibold uppercase mr-1">{a.severity}</span>
                {a.title}
              </a>
            ))}
          </div>
        </div>
      )}

      <main className="explore-main container mx-auto px-4 py-8">
        {notices.length > 0 && (
          <section aria-live="polite" aria-label="Latest updates" className="mb-4 space-y-2">
            {notices.map((notice) => (
              <div key={notice.id} className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-accent p-3 text-sm text-accent-foreground">
                <p className="min-w-0 whitespace-pre-wrap">{notice.text}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2"
                  onClick={() => setNotices((prev) => prev.filter((n) => n.id !== notice.id))}
                >
                  Dismiss
                </Button>
              </div>
            ))}
          </section>
        )}
        <aside
          id="tools-panel"
          className="hidden xl:block"
          aria-label={t("toolsAndMap")}
        >
          {isXl && !toolsOpen ? renderToolsRail() : null}
        </aside>

        <p className="xl:hidden text-xs text-muted-foreground text-center">
          Tip: open <button type="button" className="text-primary underline" onClick={() => setToolsOpen(true)}>Tools</button>: Essentials (map, itinerary, search) → Plan & book → Help & info.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { img: FEATURE_IMAGES.attractions, credit: STONE_TOWN_PHOTO, title: "Discover Attractions", body: "Hours, fees, transport, and events from the mock Commission API." },
            { img: FEATURE_IMAGES.safety, credit: null, title: "Stay Safe & Informed", body: "Dynamic compliance feed with rule-based watch/alert severity." },
            { img: FEATURE_IMAGES.booking, credit: null, title: "Book securely", body: "Tokenized PCI-DSS shaped mock gateway, no card PANs stored." },
          ].map((block) => (
            <div key={block.title}>
              <div className="relative overflow-hidden rounded-xl mb-4 h-40">
                <img src={block.img} alt="" className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-foreground mb-1">{block.title}</h3>
              <p className="text-sm text-muted-foreground">{block.body}</p>
              {block.credit && (
                <PhotoCredit photo={block.credit} className="mt-1 block text-[11px] text-muted-foreground [&_a]:underline" />
              )}
            </div>
          ))}
        </div>
      </main>

      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-4">
          <SheetHeader className="mb-3">
            <SheetTitle>{t("toolsAndMap")}</SheetTitle>
          </SheetHeader>
          {toolsOpen ? renderToolsRail() : null}
        </SheetContent>
      </Sheet>

      {!toolsOpen && (
        <Button
          type="button"
          size="lg"
          className="explore-tools-fab fixed bottom-5 right-5 z-40 h-12 rounded-full px-5 shadow-lg xl:hidden"
          onClick={() => setToolsOpen(true)}
          aria-label={t("openTools")}
        >
          <PanelRight className="w-4 h-4 mr-2" />
          {t("tools")}
        </Button>
      )}

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        itemId={selectedBookingItem?.id}
        itemName={selectedBookingItem?.name}
        itemType={selectedBookingItem?.type}
        price={selectedBookingItem?.price}
        onBooked={() => setBookingsRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
