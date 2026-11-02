import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { getSessionId } from "@/lib/session";

interface ReviewRow {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  sentiment?: string;
  helpfulVotes?: number;
}

interface ReviewsPanelProps {
  locationId?: string;
  locationName?: string;
}

export function ReviewsPanel({ locationId, locationName }: ReviewsPanelProps) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [positiveShare, setPositiveShare] = useState(0);
  const [author, setAuthor] = useState("Traveller");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sort, setSort] = useState("helpful");
  const [minRating, setMinRating] = useState("0");
  const [sentiment, setSentiment] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (id: string) => {
    setLoading(true);
    setStatus(null);
    try {
      const params = new URLSearchParams({ sort });
      if (Number(minRating) > 0) params.set("minRating", minRating);
      if (sentiment) params.set("sentiment", sentiment);
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReviews(data.data || []);
      setAverage(data.summary?.average || 0);
      setCount(data.summary?.count || 0);
      setPositiveShare(data.summary?.positiveShare || 0);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locationId) load(locationId);
    else {
      setReviews([]);
      setAverage(0);
      setCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, sort, minRating, sentiment]);

  const submit = async () => {
    if (!locationId || !body.trim()) return;
    setStatus(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, author, rating, title, body, userKey: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setBody("");
      setTitle("");
      setStatus(`Published · sentiment ${data.data.sentiment}`);
      await load(locationId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed");
    }
  };

  const helpful = async (id: string) => {
    await fetch(`/api/reviews/${id}/helpful`, { method: "POST" });
    if (locationId) load(locationId);
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Star className="w-3.5 h-3.5" aria-hidden />
        Reviews & ratings
      </p>
      {!locationId ? (
        <p className="text-[10px] text-muted-foreground">Select a place to see reviews.</p>
      ) : (
        <>
          <p className="text-[10px]">
            <span className="font-medium">{locationName || locationId}</span>
            {count > 0 ? (
              <span className="text-muted-foreground">
                {" "}
                · ★ {average} · {count} · {positiveShare}% positive
              </span>
            ) : (
              <span className="text-muted-foreground"> · no reviews yet</span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-1">
            <select className="h-7 text-[10px] border rounded px-1 bg-background" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="helpful">Most helpful</option>
              <option value="newest">Newest</option>
              <option value="rating">Top rated</option>
            </select>
            <select className="h-7 text-[10px] border rounded px-1 bg-background" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
              <option value="0">All stars</option>
              <option value="5">5★ only</option>
              <option value="4">4★+</option>
              <option value="3">3★+</option>
            </select>
            <select className="h-7 text-[10px] border rounded px-1 bg-background" value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
              <option value="">All sentiment</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
          {loading && <p className="text-[10px] text-muted-foreground">Loading…</p>}
          <ul className="max-h-32 overflow-y-auto space-y-1.5 text-[10px]">
            {reviews.map((r) => (
              <li key={r.id} className="border rounded-md px-2 py-1.5">
                <p className="font-medium">
                  {"★".repeat(r.rating)}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {r.author} · {r.sentiment}
                  </span>
                </p>
                {r.title && <p className="font-medium text-foreground">{r.title}</p>}
                <p className="text-muted-foreground">{r.body}</p>
                <button type="button" className="text-primary mt-0.5" onClick={() => helpful(r.id)}>
                  Helpful ({r.helpfulVotes || 0})
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] font-medium pt-1">Write a review</p>
          <div className="flex gap-2">
            <Input className="h-8 text-xs" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <select className="h-8 text-xs border rounded-md px-2 bg-background" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </div>
          <Input className="h-8 text-xs" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea className="text-xs min-h-[56px]" placeholder="Share tips…" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button size="sm" className="h-8 text-xs w-full" onClick={submit} disabled={!body.trim()}>
            Submit review (+points)
          </Button>
        </>
      )}
      {status && <p className="text-[10px] text-muted-foreground">{status}</p>}
    </Card>
  );
}
