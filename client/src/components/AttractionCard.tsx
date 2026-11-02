import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPinned, Ticket, Heart } from "lucide-react";
import type { MapLocation } from "@/components/ChatMap";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { localizeLocation } from "@shared/locationI18n";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AttractionCardProps {
  location: MapLocation & { ratingAverage?: number; ratingCount?: number };
  onBook?: (loc: MapLocation) => void;
}

export function AttractionCard({ location, onBook }: AttractionCardProps) {
  const { formatPriceLabel } = useCurrency();
  const { language, t } = useLanguage();
  const loc = localizeLocation(location, language);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;
  const [favorite, setFavorite] = useState(false);

  const imageSrc = loc.imageUrl || "/travelguide-logo.svg";

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFavorite((v) => !v);
    if (!favorite) {
      toast.success(t?.("savedToFavorites") ?? "Saved to favorites");
    } else {
      toast("Removed from favorites");
    }
  }

  return (
    <div className="w-64 rounded-xl overflow-hidden theme-surface border border-border/60 relative">
      <div className="relative">
        <img
          src={imageSrc}
          alt={loc.name}
          className="h-28 w-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/travelguide-logo.svg";
          }}
        />
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={
            favorite
              ? (t?.("removeFavorite") ?? "Remove from favorites")
              : (t?.("saveFavorite") ?? "Save to favorites")
          }
          onClick={handleFavorite}
          className="absolute top-2 right-2 w-9 h-9 rounded-md flex items-center justify-center bg-white/5 border border-border/30"
        >
          <Heart className={`w-4 h-4 ${favorite ? "text-red-400" : "text-foreground/80"}`} />
        </button>
      </div>

      <div className="p-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <p className="text-sm font-semibold text-foreground leading-tight">{loc.name}</p>
          <div className="ml-auto flex gap-1">
            {loc.familyFriendly && <Badge variant="outline">{t?.("family") ?? "Family"}</Badge>}
            {loc.wheelchairAccessible && <Badge variant="outline">{t?.("accessible") ?? "Accessible"}</Badge>}
            {loc.budgetTier && <Badge variant="secondary" className="capitalize">{loc.budgetTier}</Badge>}
          </div>
        </div>

        {loc.ratingCount ? (
          <p className="text-[10px] text-amber-700">
            ★ {loc.ratingAverage} · {t("reviewsCount", { count: loc.ratingCount })}
          </p>
        ) : null}

        {loc.hours && (
          <p className="text-[10px] text-muted-foreground">
            {t("hours")}: {loc.hours}
          </p>
        )}

        {loc.price && <p className="text-xs text-primary font-medium">{formatPriceLabel(loc.price)}</p>}

        {loc.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{loc.description}</p>}

        <div className="flex gap-1.5 pt-1">
          <Button size="sm" className="h-7 text-[10px] flex-1" onClick={() => onBook?.(location)}>
            <Ticket className="w-3 h-3 mr-1" />
            {t("book")}
          </Button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex items-center justify-center h-7 text-[10px] rounded-md border border-input bg-background hover:bg-accent px-2"
          >
            <MapPinned className="w-3 h-3 mr-1" />
            {t("directions")}
          </a>
        </div>

        <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
          <ExternalLink className="w-3 h-3" />
          {t("openInMaps")}
        </a>
      </div>
    </div>
  );
}
