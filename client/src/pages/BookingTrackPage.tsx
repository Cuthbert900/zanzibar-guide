import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { BRAND } from "@shared/travel";
import { fetchBookingByCode, statusColor, statusLabel, type PublicBooking } from "@/lib/bookings";
import { Calendar, CheckCircle2, Clock, Ticket, Users } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function BookingTrackPage() {
  const [, params] = useRoute("/bookings/:code");
  const code = params?.code;
  const { formatMoney, formatPriceLabel } = useCurrency();
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(null);
    fetchBookingByCode(code)
      .then(setBooking)
      .catch((e) => setError(e instanceof Error ? e.message : "Not found"))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Booking tracker</h1>
            <p className="text-xs text-muted-foreground">{BRAND.name}</p>
          </div>
          <Link href="/" className="text-sm text-primary hover:underline">
            Open chat
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {loading && <p className="text-sm text-muted-foreground">Loading booking…</p>}
        {error && (
          <Card className="p-6 text-center space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">
              Check your confirmation code or use Tools → My bookings → Track a booking.
            </p>
            <Link href="/" className="text-sm text-primary hover:underline inline-block">
              Back to chat
            </Link>
          </Card>
        )}

        {booking && (
          <Card className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                {booking.status === "paid" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(booking.status)}`}>
                  {statusLabel(booking.status)}
                </span>
                <h2 className="text-xl font-bold mt-1">{booking.itemName}</h2>
                <p className="text-xs text-muted-foreground capitalize">{booking.itemType}</p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-center space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Confirmation code</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-wider">{booking.confirmationCode}</p>
              <p className="text-[10px] text-muted-foreground font-mono">Ref {booking.id}</p>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex gap-2">
                <Ticket className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] text-muted-foreground uppercase">Guest</dt>
                  <dd className="font-medium">{booking.guestName}</dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] text-muted-foreground uppercase">Party</dt>
                  <dd className="font-medium">{booking.guests} guest{booking.guests === 1 ? "" : "s"}</dd>
                </div>
              </div>
              {booking.checkIn && (
                <div className="flex gap-2 sm:col-span-2">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] text-muted-foreground uppercase">Dates</dt>
                    <dd className="font-medium">
                      {booking.checkIn}
                      {booking.checkOut ? ` → ${booking.checkOut}` : ""}
                    </dd>
                  </div>
                </div>
              )}
              <div>
                <dt className="text-[10px] text-muted-foreground uppercase">Price</dt>
                <dd className="font-medium">
                  {booking.amountUsd ? formatMoney(booking.amountUsd) : formatPriceLabel(booking.priceLabel)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground uppercase">Booked</dt>
                <dd className="font-medium">{new Date(booking.createdAt).toLocaleString()}</dd>
              </div>
            </dl>

            <p className="text-xs text-muted-foreground border-t pt-4">
              Show this confirmation at check-in. For changes, open chat and use{" "}
              <strong>Tools → Handoff to agent</strong>.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
