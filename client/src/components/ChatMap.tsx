import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BRAND } from "@shared/travel";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { localizeLocation } from "@shared/locationI18n";

export interface MapLocation {
  id: string;
  name: string;
  type: "attraction" | "hotel" | "emergency";
  lat: number;
  lng: number;
  description?: string;
  price?: string;
  hours?: string;
  imageUrl?: string;
  distanceKm?: number;

  /* UI-friendly metadata (optional) */
  familyFriendly?: boolean;
  wheelchairAccessible?: boolean;
  budgetTier?: string;
  ratingAverage?: number;
  ratingCount?: number;
}

interface ChatMapProps {
  locations: MapLocation[];
  selectedLocation?: MapLocation;
  onLocationSelect?: (location: MapLocation) => void;
}

export function ChatMap({ locations, selectedLocation, onLocationSelect }: ChatMapProps) {
  const { formatPriceLabel } = useCurrency();
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(
      [BRAND.defaultCenter.lat, BRAND.defaultCenter.lng],
      BRAND.defaultZoom,
    );
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (mapboxToken) {
      L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        {
          maxZoom: 19,
          tileSize: 512,
          zoomOffset: -1,
          attribution: "&copy; Mapbox &copy; OpenStreetMap",
        },
      ).addTo(map);
    } else {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
    }
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const color = (type: string) =>
      type === "hotel" ? "#ea580c" : type === "emergency" ? "#dc2626" : "#0891b2";
    locations.forEach((raw) => {
      const loc = localizeLocation(raw, language);
      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius: selectedLocation?.id === loc.id ? 10 : 7,
        color: "#fff",
        weight: 2,
        fillColor: color(loc.type),
        fillOpacity: 0.95,
      });
      const priceText = loc.price ? formatPriceLabel(loc.price) : "";
      marker.bindPopup(`<strong>${loc.name}</strong><br/>${loc.description || priceText || ""}`);
      marker.on("click", () => onLocationSelect?.(raw));
      group.addLayer(marker);
    });
    if (locations.length === 1) map.setView([locations[0].lat, locations[0].lng], 11);
    else if (locations.length > 1) {
      map.fitBounds(L.latLngBounds(locations.map((l) => [l.lat, l.lng] as [number, number])).pad(0.2));
    }
  }, [locations, selectedLocation, onLocationSelect, formatPriceLabel, language]);

  return (
    // isolate: keeps Leaflet's high z-indexes inside the map so menus and dialogs open above it.
    <div className="relative isolate w-full h-full">
      {/* Top-right: Leaflet's zoom control owns the top-left corner. */}
      <div className="absolute top-3 right-3 z-[1000] bg-background/95 backdrop-blur px-3 py-1.5 rounded-lg border shadow-sm">
        <p className="text-xs font-semibold">
          Live map ({import.meta.env.VITE_MAPBOX_TOKEN ? "Mapbox" : "OpenStreetMap"})
        </p>
        {locations.length > 0 && (
          <p className="text-[10px] text-muted-foreground">{locations.length} pins</p>
        )}
      </div>
      <div ref={containerRef} className="w-full h-full min-h-[240px]" />
    </div>
  );
}
