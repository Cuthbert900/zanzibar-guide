import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchMyBookings,
  rememberGuestBooking,
  statusColor,
  statusLabel,
  trackBooking,
  type PublicBooking,
} from "@/lib/bookings";
import { Calendar, ExternalLink, RefreshCw, Search, Ticket } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingsPanelProps {
  /** Bump to reload after a new booking */
  refreshKey?: number;
}

export function BookingsPanel({ refreshKey = 0 }: BookingsPanelProps) {
  const { formatPriceLabel, formatMoney } = useCurrency();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackEmail, setTrackEmail] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState<PublicBooking | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await fetchMyBookings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleTrack = async () => {
    setTracking(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const found = await trackBooking(trackEmail, trackCode);
      setTrackResult(found);
      rememberGuestBooking(found.id);
      await load();
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : "Not found");
    } finally {
      setTracking(false);
    }
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-emerald-50/80 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Ticket className="w-4 h-4 text-emerald-700" />
          {t("myBookings")}
        </h3>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={load} aria-label={t("refresh")}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {loading && <p className="text-xs text-muted-foreground">{t("loading")}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}

        {!loading && bookings.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("noBookingsYet")}</p>
        )}

        {bookings.length > 0 && (
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {bookings.map((b) => (
              <li key={b.id} className="border rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{b.itemName}</p>
                    <p className="text-muted-foreground capitalize">{b.itemType}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${statusColor(b.status)}`}>
                    {statusLabel(b.status)}
                  </span>
                </div>
                {b.confirmationCode && (
                  <p className="font-mono text-primary">{b.confirmationCode}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                  {b.checkIn && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {b.checkIn}
                      {b.checkOut ? ` → ${b.checkOut}` : ""}
                    </span>
                  )}
                  <span>{b.amountUsd ? formatMoney(b.amountUsd) : formatPriceLabel(b.priceLabel)}</span>
                  <span>{b.guests} guest{b.guests === 1 ? "" : "s"}</span>
                </div>
                {b.confirmationCode && (
                  <Link
                    href={`/bookings/${encodeURIComponent(b.confirmationCode)}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]"
                  >
                    Track booking
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            {t("trackBooking")}
          </p>
          <p className="text-[10px] text-muted-foreground">{t("trackBookingHint")}</p>
          <div className="grid gap-2">
            <div>
              <Label htmlFor="track-email" className="text-[10px]">
                {t("email")}
              </Label>
              <Input
                id="track-email"
                type="email"
                className="h-8 text-xs"
                placeholder="you@email.com"
                value={trackEmail}
                onChange={(e) => setTrackEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="track-code" className="text-[10px]">
                {t("confirmationCode")}
              </Label>
              <Input
                id="track-code"
                className="h-8 text-xs font-mono"
                placeholder="TG-XXXXXX"
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={tracking || !trackEmail.trim() || !trackCode.trim()}
              onClick={handleTrack}
            >
              {tracking ? t("searching") : t("findBooking")}
            </Button>
          </div>
          {trackError && <p className="text-[10px] text-destructive">{trackError}</p>}
          {trackResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 text-[11px] space-y-1">
              <p className="font-semibold">{trackResult.itemName}</p>
              <p className="font-mono text-primary">{trackResult.confirmationCode}</p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${statusColor(trackResult.status)}`}>
                {statusLabel(trackResult.status)}
              </span>
              {trackResult.confirmationCode && (
                <Link href={`/bookings/${encodeURIComponent(trackResult.confirmationCode)}`} className="block text-primary hover:underline">
                  Open tracking page →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
