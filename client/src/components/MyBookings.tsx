import { useEffect, useState } from "react";
import { Link } from "wouter";
import { fetchMyBookings, statusLabel, type PublicBooking } from "@/lib/bookings";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";

export function MyBookings() {
  const { formatMoney, formatPriceLabel } = useCurrency();
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState<PublicBooking[]>([]);

  useEffect(() => {
    if (!user) {
      setMyBookings([]);
      return;
    }
    fetchMyBookings()
      .then(setMyBookings)
      .catch(() => setMyBookings([]));
  }, [user?.id, user?.bookingIds?.length]);

  return (
    <div>
      {myBookings.length > 0 ? (
        <div className="text-xs border rounded p-2 space-y-2">
          <p className="font-medium">My bookings ({myBookings.length})</p>
          <ul className="space-y-2">
            {myBookings.map((b) => (
              <li key={b.id} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <p className="font-medium">{b.itemName}</p>
                <p className="text-muted-foreground">
                  {statusLabel(b.status)} · {b.amountUsd ? formatMoney(b.amountUsd) : formatPriceLabel(b.priceLabel)}
                </p>
                {b.confirmationCode && (
                  <Link href={`/bookings/${encodeURIComponent(b.confirmationCode)}`} className="text-primary hover:underline font-mono">
                    {b.confirmationCode}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No bookings linked to this account yet.</p>
      )}
    </div>
  );
}
