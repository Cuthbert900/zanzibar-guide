import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSessionId } from "@/lib/session";
import { fetchMyBookings, statusLabel, type PublicBooking } from "@/lib/bookings";
import { useCurrency } from "@/contexts/CurrencyContext";
import { TOKEN_KEY, useAuth } from "@/contexts/AuthContext";
import AccountMenu from "@/components/AccountMenu";

export default function Account() {
  const { formatMoney, formatPriceLabel } = useCurrency();
  const { user, status, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [gamification, setGamification] = useState<{
    data: { points: number; badges: string[]; reviewsWritten: number; bookingsCount: number };
    deal: { unlocked: boolean; deal: { code: string } | null; need: number };
  } | null>(null);
  const [travelProfile, setTravelProfile] = useState<{
    travelStyle: string;
    historySummary: string;
    badges: Array<{ id: string; label: string }>;
    interests: string[];
    bookingCount: number;
  } | null>(null);
  const [favShare, setFavShare] = useState<string | null>(null);
  const [myBookings, setMyBookings] = useState<PublicBooking[]>([]);

  const token = () => localStorage.getItem(TOKEN_KEY);

  const loadGame = async () => {
    const key = user?.id || getSessionId();
    const res = await fetch(`/api/engagement/gamification/${key}`);
    const data = await res.json();
    setGamification(data);
  };

  const loadTravelProfile = async () => {
    const t = token();
    const res = await fetch(`/api/profile/me?sessionId=${encodeURIComponent(getSessionId())}`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (!res.ok) return;
    const data = await res.json();
    setTravelProfile(data.data?.profile || null);
  };

  // Favourites and trips change elsewhere in the app, so reload the profile when the page opens.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (status === "signedOut") navigate("/login?next=/account", { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    if (!user) {
      setMyBookings([]);
      return;
    }
    fetchMyBookings()
      .then(setMyBookings)
      .catch(() => setMyBookings([]));
  }, [user?.id, user?.bookingIds?.length]);

  useEffect(() => {
    loadGame().catch(() => {});
    loadTravelProfile().catch(() => {});
  }, [user?.id]);

  const shareFavorites = async () => {
    const items = (user?.favorites || []).map((f) => ({ id: f.id, name: f.name || f.id }));
    if (!items.length) {
      setFavShare("No favorites to share");
      return;
    }
    const res = await fetch("/api/engagement/favorites/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${user?.name}'s favorites`, items }),
    });
    const data = await res.json();
    if (res.ok) {
      const url = `${window.location.origin}${data.publicPath}`;
      setFavShare(url);
      await navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const labels: Record<string, string> = {
    explorer: "Explorer",
    culture: "Culture Enthusiast",
    reviewer: "Helpful Reviewer",
    booker: "Seasoned Booker",
    vip: "VIP Traveller",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Account</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-primary hover:underline">
              Back
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-lg space-y-4">
        {user && (
          <Card className="p-4 space-y-3">
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs">Favorites synced: {user.favorites?.length || 0}</p>
            <p className="text-xs">Saved trips: {user.trips?.length || 0}</p>
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
            <ul className="text-xs space-y-1">
              {(user.trips || []).map((t) => (
                <li key={t.id}>
                  {t.title} <span className="text-muted-foreground">({t.createdAt.slice(0, 10)})</span>
                </li>
              ))}
            </ul>
            {travelProfile && (
              <div className="text-xs border rounded p-2 space-y-1">
                <p className="font-medium">Learned travel profile</p>
                <p>{travelProfile.travelStyle}</p>
                <p className="text-muted-foreground">{travelProfile.historySummary}</p>
                <p>Interests: {travelProfile.interests.join(", ") || "—"}</p>
                <p>
                  Badges:{" "}
                  {travelProfile.badges.map((b) => b.label).join(", ") || "earn by booking & favouriting"}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[10px]"
                  onClick={async () => {
                    const t = token();
                    await fetch("/api/profile/learn", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(t ? { Authorization: `Bearer ${t}` } : {}),
                      },
                      body: JSON.stringify({ sessionId: getSessionId() }),
                    });
                    await loadTravelProfile();
                  }}
                >
                  Re-learn from booking history
                </Button>
              </div>
            )}
            {gamification && (
              <div className="text-xs border rounded p-2 space-y-1">
                <p className="font-medium">Travel profile</p>
                <p>{gamification.data.points} points</p>
                <p>
                  Badges:{" "}
                  {gamification.data.badges.map((b) => labels[b] || b).join(", ") || "earn badges by visiting & reviewing"}
                </p>
                <p className="text-muted-foreground">
                  {gamification.deal.unlocked && gamification.deal.deal
                    ? `Deal unlocked: ${gamification.deal.deal.code}`
                    : `${gamification.deal.need} pts to VIP deal`}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={shareFavorites}>
                Share favorites link
              </Button>
              <Link href="/compare-trips" className="text-sm text-primary hover:underline self-center">
                Compare saved itineraries
              </Link>
            </div>
            {favShare && <p className="text-[10px] break-all text-muted-foreground">{favShare}</p>}
          </Card>
        )}
      </main>
    </div>
  );
}
