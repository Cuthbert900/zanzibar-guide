import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { MapLocation } from "@/components/ChatMap";
import type { InterestTag } from "@shared/catalog";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface CatalogItem extends MapLocation {
  usdPrice?: number | null;
  ratingAverage?: number;
  ratingCount?: number;
  distanceKm?: number;
  tags?: InterestTag[];
  wheelchairAccessible?: boolean;
}

interface CatalogSearchPanelProps {
  onResults: (locs: MapLocation[]) => void;
  onSelect?: (loc: MapLocation) => void;
}

const TAGS: InterestTag[] = ["cultural", "nature", "family", "adventure", "luxury", "budget", "relaxation", "dining"];

export function CatalogSearchPanel({ onResults, onSelect }: CatalogSearchPanelProps) {
  const { formatMoney, currency, convertToUsd } = useCurrency();
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "attraction" | "hotel">("all");
  const [tags, setTags] = useState<InterestTag[]>([]);
  const [budgetMax, setBudgetMax] = useState("500");
  const [minRating, setMinRating] = useState("0");
  const [maxDistance, setMaxDistance] = useState("");
  const [budgetTier, setBudgetTier] = useState("");
  const [wheelchair, setWheelchair] = useState(false);
  const [family, setFamily] = useState(false);
  const [pet, setPet] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (t: InterestTag) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const search = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (type !== "all") params.set("type", type);
      if (tags.length) params.set("tags", tags.join(","));
      if (budgetMax) params.set("budgetMax", String(Math.round(convertToUsd(Number(budgetMax) || 0))));
      if (Number(minRating) > 0) params.set("minRating", minRating);
      if (maxDistance) params.set("maxDistanceKm", maxDistance);
      if (budgetTier) params.set("budgetTier", budgetTier);
      if (wheelchair) params.set("wheelchair", "1");
      if (family) params.set("family", "1");
      if (pet) params.set("pet", "1");
      params.set("sort", sort);
      const res = await fetch(`/api/catalog/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      const rows = (data.data || []) as CatalogItem[];
      setItems(rows);
      onResults(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Search className="w-3.5 h-3.5" aria-hidden />
        {t("advancedSearch")}
      </p>
      <Input
        className="h-8 text-xs"
        placeholder={t("searchPlaceholder")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && search()}
      />
      <div className="grid grid-cols-2 gap-2">
        <select className="h-8 text-xs border rounded-md px-2 bg-background" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">All types</option>
          <option value="attraction">Attractions</option>
          <option value="hotel">Hotels</option>
        </select>
        <select className="h-8 text-xs border rounded-md px-2 bg-background" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="relevance">Sort: relevance</option>
          <option value="rating">Sort: rating</option>
          <option value="distance">Sort: distance</option>
          <option value="price_asc">Sort: price ↑</option>
          <option value="price_desc">Sort: price ↓</option>
          <option value="name">Sort: name</option>
        </select>
        <Input className="h-8 text-xs" type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder={`Max ${currency}`} aria-label={`Max budget (${currency})`} />
        <select className="h-8 text-xs border rounded-md px-2 bg-background" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
          <option value="0">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
        <Input
          className="h-8 text-xs"
          type="number"
          min={0}
          value={maxDistance}
          onChange={(e) => setMaxDistance(e.target.value)}
          placeholder="Max km from Vic Falls"
        />
        <select className="h-8 text-xs border rounded-md px-2 bg-background" value={budgetTier} onChange={(e) => setBudgetTier(e.target.value)}>
          <option value="">Any budget tier</option>
          <option value="budget">Budget</option>
          <option value="midrange">Mid-range</option>
          <option value="luxury">Luxury</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 text-[10px]">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} /> Wheelchair
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={family} onChange={(e) => setFamily(e.target.checked)} /> Family
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={pet} onChange={(e) => setPet(e.target.checked)} /> Pet-friendly
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleTag(t)}
            className={`text-[10px] px-2 py-0.5 rounded-md border ${
              tags.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-background"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <Button size="sm" className="h-8 text-xs w-full" onClick={search} disabled={loading}>
        {loading ? t("searching") : t("applyFilters")}
      </Button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {items.length > 0 && (
        <ul className="max-h-44 overflow-y-auto space-y-1.5 text-[10px]">
          {items.map((it) => (
            <li key={it.id}>
              <button type="button" className="w-full text-left rounded-md border px-2 py-1.5 hover:bg-accent" onClick={() => onSelect?.(it)}>
                <span className="font-medium text-foreground">{it.name}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {it.type}
                  {it.usdPrice != null ? ` · ${formatMoney(it.usdPrice)}` : ""}
                  {it.distanceKm != null ? ` · ${it.distanceKm}km` : ""}
                  {it.ratingCount ? ` · ★ ${it.ratingAverage}` : ""}
                  {it.wheelchairAccessible ? " · ♿" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
