import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";

export default function FavoritesSharePage() {
  const [, params] = useRoute("/favorites/:id");
  const [data, setData] = useState<{ title: string; items: Array<{ id: string; name: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/engagement/favorites/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d.data);
      })
      .catch(() => setError("Failed"));
  }, [params?.id]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <h1 className="text-xl font-bold">Shared favorites</h1>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-lg">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <Card className="p-4 space-y-2">
            <p className="font-semibold">{data.title}</p>
            <ul className="text-sm space-y-1">
              {data.items.map((i) => (
                <li key={i.id}>{i.name}</li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}
