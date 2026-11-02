import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InterestTag } from "@shared/catalog";
import { getSessionId } from "@/lib/session";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";

const INTERESTS: InterestTag[] = ["cultural", "nature", "family", "adventure", "luxury", "budget", "relaxation", "dining"];

interface PreferencesPanelProps {
  language: string;
  onSaved?: () => void;
}

export function PreferencesPanel({ language, onSaved }: PreferencesPanelProps) {
  const { currency, convertFromUsd, convertToUsd, rates } = useCurrency();
  const { t } = useLanguage();
  const [budgetMax, setBudgetMax] = useState("200");
  const [partySize, setPartySize] = useState("2");
  const [interests, setInterests] = useState<InterestTag[]>(["nature"]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const sid = getSessionId();
    fetch(`/api/context/${sid}`)
      .then((r) => r.json())
      .then((d) => {
        const ctx = d.data;
        if (!ctx) return;
        if (ctx.budgetMax) setBudgetMax(String(Math.round(convertFromUsd(Number(ctx.budgetMax)))));
        if (ctx.partySize) setPartySize(String(ctx.partySize));
        if (ctx.interests?.length) setInterests(ctx.interests);
      })
      .catch(() => {});
    // Re-run when rates arrive so stored USD budgets display correctly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates.EUR, rates.GBP, rates.ZAR]);

  const toggle = (tag: InterestTag) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const save = async () => {
    const sid = getSessionId();
    const budgetUsd = Math.round(convertToUsd(Number(budgetMax) || 0)) || undefined;
    const res = await fetch(`/api/context/${sid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        budgetMax: budgetUsd,
        partySize: Number(partySize) || 1,
        interests,
      }),
    });
    const token = localStorage.getItem("travelguide_token");
    await fetch("/api/profile/learn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        sessionId: sid,
        interests,
        budgetMax: budgetUsd,
      }),
    }).catch(() => {});
    if (res.ok) {
      setStatus(t("preferencesSaved"));
      onSaved?.();
      setTimeout(() => setStatus(null), 2000);
    } else {
      setStatus(t("saveFailed"));
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs font-semibold text-foreground">{t("travelPreferences")}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">{t("budgetMaxNight", { currency })}</Label>
          <Input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} type="number" className="h-8" />
        </div>
        <div>
          <Label className="text-xs">{t("partySize")}</Label>
          <Input value={partySize} onChange={(e) => setPartySize(e.target.value)} type="number" min={1} className="h-8" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {INTERESTS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              interests.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <Button size="sm" className="w-full h-8" onClick={save}>
        Save profile
      </Button>
      {status && <p className="text-[10px] text-muted-foreground">{status}</p>}
    </div>
  );
}
