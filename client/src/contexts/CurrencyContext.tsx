import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "ZAR";

export const CURRENCY_CODES: CurrencyCode[] = ["USD", "EUR", "GBP", "ZAR"];

interface CurrencyState {
  currency: CurrencyCode;
  rates: Record<string, number>;
  ratesUpdatedAt: string | null;
  ratesLoading: boolean;
  setCurrency: (c: CurrencyCode) => void;
  refreshRates: () => Promise<void>;
  /** Convert a USD amount into the selected currency */
  convertFromUsd: (usdAmount: number) => number;
  /** Convert an amount in the selected currency back to USD (for APIs that store USD) */
  convertToUsd: (amountInSelected: number) => number;
  /** Format a USD amount in the selected currency */
  formatMoney: (usdAmount: number, opts?: { maximumFractionDigits?: number }) => string;
  /**
   * Rewrite price labels that contain USD/$ amounts using live rates
   * e.g. "From $120/night" → "From €110/night" when EUR is selected
   */
  formatPriceLabel: (label: string | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyState | null>(null);
const KEY = "travelguide_currency";
const FALLBACK_RATES: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, ZAR: 18.5 };

function isCurrencyCode(v: string | null): v is CurrencyCode {
  return v === "USD" || v === "EUR" || v === "GBP" || v === "ZAR";
}

/** Replace $-style and USD-style amounts in a free-text price label */
export function rewritePriceLabel(
  label: string,
  formatUsd: (n: number) => string,
): string {
  if (!label.trim()) return label;
  let out = label;
  // $1,234.50 or $50
  out = out.replace(/\$\s*([\d,]+(?:\.\d+)?)/g, (_m, num: string) => {
    const usd = Number(String(num).replace(/,/g, ""));
    return Number.isFinite(usd) ? formatUsd(usd) : _m;
  });
  // USD 50 / 50 USD
  out = out.replace(/\bUSD\s*([\d,]+(?:\.\d+)?)/gi, (_m, num: string) => {
    const usd = Number(String(num).replace(/,/g, ""));
    return Number.isFinite(usd) ? formatUsd(usd) : _m;
  });
  out = out.replace(/([\d,]+(?:\.\d+)?)\s*USD\b/gi, (_m, num: string) => {
    const usd = Number(String(num).replace(/,/g, ""));
    return Number.isFinite(usd) ? formatUsd(usd) : _m;
  });
  return out;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return "USD";
    const saved = localStorage.getItem(KEY);
    return isCurrencyCode(saved) ? saved : "USD";
  });
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  const refreshRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const res = await fetch("/api/live/fx?base=USD&symbols=EUR,GBP,ZAR");
      const d = await res.json();
      const r = (d.data?.rates || {}) as Record<string, number>;
      setRates({ USD: 1, ...FALLBACK_RATES, ...r });
      setRatesUpdatedAt(new Date().toISOString());
    } catch {
      setRates((prev) => ({ ...FALLBACK_RATES, ...prev, USD: 1 }));
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRates();
    const id = window.setInterval(refreshRates, 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refreshRates]);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem(KEY, c);
  }, []);

  const convertFromUsd = useCallback(
    (usdAmount: number) => {
      if (!Number.isFinite(usdAmount)) return 0;
      const rate = rates[currency] || 1;
      return usdAmount * rate;
    },
    [currency, rates],
  );

  const convertToUsd = useCallback(
    (amountInSelected: number) => {
      if (!Number.isFinite(amountInSelected)) return 0;
      const rate = rates[currency] || 1;
      return rate === 0 ? amountInSelected : amountInSelected / rate;
    },
    [currency, rates],
  );

  const formatMoney = useCallback(
    (usdAmount: number, opts?: { maximumFractionDigits?: number }) => {
      const n = convertFromUsd(usdAmount);
      const digits = opts?.maximumFractionDigits ?? (currency === "ZAR" ? 0 : 2);
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: digits,
        minimumFractionDigits: digits === 0 ? 0 : undefined,
      }).format(n);
    },
    [convertFromUsd, currency],
  );

  const formatPriceLabel = useCallback(
    (label: string | null | undefined) => {
      if (!label) return "";
      if (currency === "USD") return label;
      return rewritePriceLabel(label, (usd) => formatMoney(usd));
    },
    [currency, formatMoney],
  );

  const value = useMemo(
    () => ({
      currency,
      rates,
      ratesUpdatedAt,
      ratesLoading,
      setCurrency,
      refreshRates,
      convertFromUsd,
      convertToUsd,
      formatMoney,
      formatPriceLabel,
    }),
    [
      currency,
      rates,
      ratesUpdatedAt,
      ratesLoading,
      setCurrency,
      refreshRates,
      convertFromUsd,
      convertToUsd,
      formatMoney,
      formatPriceLabel,
    ],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency requires CurrencyProvider");
  return ctx;
}

export function CurrencySwitcher({ showRefresh = true }: { showRefresh?: boolean }) {
  const { currency, setCurrency, rates, ratesLoading, ratesUpdatedAt, refreshRates } = useCurrency();
  return (
    <div className="flex items-center gap-1">
      <select
        aria-label="Display currency"
        className="text-xs border border-border rounded-md px-2 py-1 bg-background"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        title={[
          "Prices convert with live FX (base USD)",
          ...Object.entries(rates).map(([k, v]) => `${k}: ${v}`),
          ratesUpdatedAt ? `Updated ${new Date(ratesUpdatedAt).toLocaleTimeString()}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      >
        {CURRENCY_CODES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {showRefresh && (
        <button
          type="button"
          className="text-[10px] text-primary hover:underline px-1"
          onClick={() => refreshRates()}
          disabled={ratesLoading}
          title="Refresh exchange rates"
          aria-label="Refresh exchange rates"
        >
          {ratesLoading ? "…" : "FX"}
        </button>
      )}
    </div>
  );
}
