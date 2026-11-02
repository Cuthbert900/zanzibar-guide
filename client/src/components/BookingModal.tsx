import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Users, Check, AlertCircle, Shield, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { rememberGuestBooking } from "@/lib/bookings";
import { useCurrency } from "@/contexts/CurrencyContext";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  itemName?: string;
  itemType?: "hotel" | "attraction" | "tour";
  price?: string;
  onBooked?: () => void;
}

type BookingStep = "details" | "confirm" | "payment" | "success";

interface InvDay {
  date: string;
  available: boolean;
  remaining: number;
  priceLabel: string;
  priceUsd: number;
}

export function BookingModal({
  isOpen,
  onClose,
  itemId = "stone-town",
  itemName = "Attraction",
  itemType = "attraction",
  price = "On request",
  onBooked,
}: BookingModalProps) {
  const [step, setStep] = useState<BookingStep>("details");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState("1");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InvDay[]>([]);
  const [livePrice, setLivePrice] = useState(price);
  const { formatMoney, formatPriceLabel } = useCurrency();

  useEffect(() => {
    if (!isOpen) return;
    setLivePrice(price);
    fetch(`/api/inventory/${encodeURIComponent(itemId)}?days=10`)
      .then((r) => r.json())
      .then((d) => {
        const days = (d.data?.days || []) as InvDay[];
        setInventory(days.filter((x) => x.available).slice(0, 7));
      })
      .catch(() => setInventory([]));
  }, [isOpen, itemId, price]);

  const reset = () => {
    setStep("details");
    setCheckInDate("");
    setCheckOutDate("");
    setGuests("1");
    setName("");
    setEmail("");
    setPhone("");
    setBookingId(null);
    setConfirmationCode(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem("travelguide_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const createBooking = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          itemId,
          itemName,
          itemType,
          priceLabel: livePrice || price,
          guestName: name,
          email,
          phone,
          checkIn: checkInDate || undefined,
          checkOut: checkOutDate || undefined,
          guests: Number(guests) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setBookingId(data.data.id);
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const payWithToken = async () => {
    if (!bookingId) return;
    setError(null);
    setLoading(true);
    try {
      // Prefer Stripe Checkout when configured
      const cfg = await fetch("/api/payments/config").then((r) => r.json());
      if (cfg.mode === "stripe-sandbox") {
        const session = await fetch("/api/payments/checkout-session", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            bookingId,
            successUrl: `${window.location.origin}/?paid=${bookingId}`,
            cancelUrl: `${window.location.origin}/?cancel=${bookingId}`,
          }),
        }).then((r) => r.json());
        if (session.url) {
          window.location.href = session.url;
          return;
        }
      }

      const paymentToken = `tok_demo_${Math.random().toString(36).slice(2, 12)}`;
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ paymentToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      const code = data.data.confirmationCode as string;
      setConfirmationCode(code);
      rememberGuestBooking(bookingId);
      setStep("success");
      onBooked?.();
      await fetch("/api/notify/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email || phone || "guest",
          bookingId,
          confirmationCode: data.data.confirmationCode,
          itemName,
        }),
      });
      await fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "booking_ui_success", channel: "web", intent: "booking" }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const canSubmitDetails = name.trim() && email.trim();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book {itemName}</DialogTitle>
          <DialogDescription>
            {formatPriceLabel(livePrice || price)} · PCI-DSS shaped mock gateway (demo) — card numbers never touch our servers.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            {inventory.length > 0 && (
              <div className="space-y-1.5" aria-label="Available dates">
                <p className="text-xs font-medium">Live inventory (select a date)</p>
                <div className="flex flex-wrap gap-1.5">
                  {inventory.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      className={`text-[10px] border rounded-md px-2 py-1 ${
                        checkInDate === d.date ? "border-primary bg-primary/10" : "border-border"
                      }`}
                      onClick={() => {
                        setCheckInDate(d.date);
                        setLivePrice(d.priceLabel);
                      }}
                    >
                      {d.date.slice(5)} · {formatMoney(d.priceUsd)} · {d.remaining} left
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="checkin">Check-in</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input id="checkin" type="date" className="pl-8" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="checkout">Check-out</Label>
                <Input id="checkout" type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="guests">Guests</Label>
              <div className="relative">
                <Users className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input id="guests" type="number" min={1} className="pl-8" value={guests} onChange={(e) => setGuests(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 ..." />
            </div>
            <Button className="w-full" disabled={!canSubmitDetails || loading} onClick={() => setStep("confirm")}>
              Review & confirm
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">Confirm before booking</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  <span className="text-foreground font-medium">Item:</span> {itemName} ({itemType})
                </li>
                <li>
                  <span className="text-foreground font-medium">Price:</span> {formatPriceLabel(livePrice || price)}
                </li>
                <li>
                  <span className="text-foreground font-medium">Guest:</span> {name} · {email}
                </li>
                <li>
                  <span className="text-foreground font-medium">Dates:</span> {checkInDate || "flexible"}
                  {checkOutDate ? ` → ${checkOutDate}` : ""} · {guests} guest(s)
                </li>
              </ul>
              <p className="text-[10px] text-muted-foreground">
                Human-in-the-loop: nothing is charged until you confirm and complete payment.
              </p>
            </div>
            <Button className="w-full" disabled={loading} onClick={createBooking}>
              {loading ? "Creating…" : "Confirm — continue to payment"}
            </Button>
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => setStep("details")}>
              Back to edit
            </Button>
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Shield className="w-4 h-4 text-primary" />
                Tokenized payment (demo)
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                A client-side token (<code className="text-[10px]">tok_demo_*</code>) is sent to{" "}
                <code className="text-[10px]">POST /api/bookings/:id/pay</code>. Raw card PANs are rejected by the API.
              </p>
              <p className="text-xs">Booking ID: <span className="font-mono">{bookingId}</span></p>
            </div>
            <Button className="w-full" disabled={loading} onClick={payWithToken}>
              {loading ? "Authorizing…" : "Pay with mock token"}
            </Button>
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => setStep("details")}>
              Back
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Booking confirmed</p>
              <p className="text-sm text-muted-foreground mt-1">{itemName}</p>
              <p className="text-xs font-mono mt-2 text-primary">{confirmationCode}</p>
              {confirmationCode && (
                <Link
                  href={`/bookings/${encodeURIComponent(confirmationCode)}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  Track this booking
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
