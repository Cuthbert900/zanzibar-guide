import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { CURRENCY_CODES, useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";

export function CurrencyConverterPanel() {
  const { rates, currency, setCurrency, ratesUpdatedAt, ratesLoading, refreshRates, formatMoney } = useCurrency();
  const { t } = useLanguage();
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>(currency);

  // Keep converter "to" in sync with the global display currency
  useEffect(() => {
    setTo(currency);
  }, [currency]);

  const result = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return null;
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    const usd = n / fromRate;
    return Math.round(usd * toRate * 100) / 100;
  }, [amount, from, to, rates]);

  const usdEquivalent = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return null;
    const fromRate = rates[from] || 1;
    return n / fromRate;
  }, [amount, from, rates]);

  const swap = () => {
    setFrom(to);
    setTo(from);
    setCurrency(from);
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold flex items-center gap-1">
          <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
          {t("currencyConverter")}
        </p>
        <button
          type="button"
          className="text-[10px] text-primary inline-flex items-center gap-1 hover:underline"
          onClick={() => refreshRates()}
          disabled={ratesLoading}
        >
          <RefreshCw className={`w-3 h-3 ${ratesLoading ? "animate-spin" : ""}`} />
          {t("refreshRates")}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">{t("currencySiteWide")}</p>
      <div className="flex gap-2 items-center">
        <Input
          className="h-8 text-xs flex-1"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={t("amount")}
        />
        <select
          className="h-8 text-xs border rounded-md px-2 bg-background"
          value={from}
          onChange={(e) => setFrom(e.target.value as CurrencyCode)}
          aria-label="From currency"
        >
          {CURRENCY_CODES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={swap}
          className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
          aria-label="Swap currencies"
        >
          <ArrowLeftRight className="w-3 h-3" />
          {t("swap")}
        </button>
      </div>
      <div className="flex gap-2 items-center">
        <div className="h-8 flex-1 flex items-center px-2 rounded-md border bg-muted/40 text-xs font-medium">
          {result == null ? "—" : result.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <select
          className="h-8 text-xs border rounded-md px-2 bg-background"
          value={to}
          onChange={(e) => {
            const c = e.target.value as CurrencyCode;
            setTo(c);
            setCurrency(c);
          }}
          aria-label="To currency (site display)"
        >
          {CURRENCY_CODES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {usdEquivalent != null && from !== "USD" && (
        <p className="text-[10px] text-muted-foreground">≈ {formatMoney(usdEquivalent)} display rate</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        {t("liveFxBase")}
        {`: ${CURRENCY_CODES.map((c) => `${c} ${rates[c] ?? "—"}`).join(" · ")}`}
        {ratesUpdatedAt ? ` · ${new Date(ratesUpdatedAt).toLocaleTimeString()}` : ""}
      </p>
    </Card>
  );
}
