import { MapLocation } from "@/components/ChatMap";
import { Heart, Trash2, MapPin, Hotel, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";

interface FavoritesPanelProps {
  favorites: MapLocation[];
  onRemove: (id: string) => void;
  onSelect?: (location: MapLocation) => void;
}

export function FavoritesPanel({ favorites, onRemove, onSelect }: FavoritesPanelProps) {
  const { t } = useLanguage();
  const { formatPriceLabel } = useCurrency();

  const getIcon = (type: string) => {
    switch (type) {
      case "hotel":
        return <Hotel className="w-4 h-4 text-orange-600" />;
      case "attraction":
        return <MapPin className="w-4 h-4 text-primary" />;
      case "emergency":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  if (favorites.length === 0) {
    return (
      <Card className="p-4 text-center border-border/50">
        <Heart className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">{t("noFavorites")}</p>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-primary/5">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          {t("favorites")} ({favorites.length})
        </h3>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {favorites.map((favorite) => (
          <div
            key={favorite.id}
            className="px-4 py-3 border-b border-border/30 hover:bg-muted/50 transition-colors last:border-b-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="mt-0.5">{getIcon(favorite.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{favorite.name}</p>
                  {favorite.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{favorite.description}</p>
                  )}
                  {favorite.price && (
                    <p className="text-xs text-primary font-semibold mt-1">{formatPriceLabel(favorite.price)}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {onSelect && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelect(favorite)}
                    className="h-7 px-2 text-xs"
                  >
                    View
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(favorite.id)}
                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
