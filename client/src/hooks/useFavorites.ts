import { useState, useEffect } from "react";
import { MapLocation } from "@/components/ChatMap";

const FAVORITES_KEY = "tourism_chatbot_favorites";
const TOKEN_KEY = "travelguide_token";

async function syncToServer(favorites: MapLocation[]) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await fetch("/api/auth/me/favorites", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ favorites }),
  }).catch(() => {});
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<MapLocation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const stored = localStorage.getItem(FAVORITES_KEY);
      let local: MapLocation[] = [];
      if (stored) {
        try {
          local = JSON.parse(stored) as MapLocation[];
        } catch {
          local = [];
        }
      }

      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const remote = (data.data?.favorites || []) as MapLocation[];
            const byId = new Map<string, MapLocation>();
            [...remote, ...local].forEach((f) => byId.set(f.id, f));
            const merged = Array.from(byId.values());
            setFavorites(merged);
            setIsLoaded(true);
            if (merged.length !== remote.length) {
              await syncToServer(merged);
            }
            return;
          }
        } catch {
          /* fall through to local */
        }
      }
      setFavorites(local);
      setIsLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    const t = window.setTimeout(() => {
      syncToServer(favorites);
    }, 400);
    return () => window.clearTimeout(t);
  }, [favorites, isLoaded]);

  const addFavorite = (location: MapLocation) => {
    setFavorites((prev) => {
      if (prev.some((fav) => fav.id === location.id)) return prev;
      return [...prev, location];
    });
  };

  const removeFavorite = (locationId: string) => {
    setFavorites((prev) => prev.filter((fav) => fav.id !== locationId));
  };

  const isFavorite = (locationId: string) => favorites.some((fav) => fav.id === locationId);

  const clearFavorites = () => setFavorites([]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites,
  };
}
