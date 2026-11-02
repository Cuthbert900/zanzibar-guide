import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FaqArticle } from "@shared/catalog";

export function FaqPanel() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<FaqArticle[]>([]);

  useEffect(() => {
    const url = q.trim() ? `/api/knowledge/faq?q=${encodeURIComponent(q)}` : "/api/knowledge/faq";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setItems(d.data || []))
      .catch(() => setItems([]));
  }, [q]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">Knowledge base</p>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search permits, business, land…"
        className="h-8 text-xs"
      />
      <div className="max-h-40 overflow-y-auto space-y-2">
        {items.map((f) => (
          <a
            key={f.id}
            href={f.deepLink}
            target="_blank"
            rel="noreferrer"
            className="block p-2 rounded-lg border border-border/50 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-foreground">{f.title}</p>
              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{f.summary}</p>
            <p className="text-[10px] text-primary mt-1 capitalize">{f.category}</p>
          </a>
        ))}
        {!items.length && <p className="text-[10px] text-muted-foreground">No articles found</p>}
      </div>
    </div>
  );
}
