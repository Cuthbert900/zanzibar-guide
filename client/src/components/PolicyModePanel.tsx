import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Scale, Loader2 } from "lucide-react";
import { getSessionId } from "@/lib/session";

const QUICK = [
  "Do I need a visa for Zanzibar?",
  "Malaria precautions?",
  "Dress code in Stone Town?",
  "Ocean and tide safety tips?",
];

export function PolicyModePanel() {
  const [question, setQuestion] = useState(QUICK[0]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (q?: string) => {
    const text = (q || question).trim();
    if (!text) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/zanzibar/policy/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, sessionId: getSessionId() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setAnswer(d.data.answer);
      setQuestion(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Policy ask failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Scale className="w-3.5 h-3.5" aria-hidden />
        Policy / visa mode
      </p>
      <p className="text-[10px] text-muted-foreground">Dedicated answers for visa, health, etiquette & rules</p>
      <div className="flex flex-wrap gap-1">
        {QUICK.map((q) => (
          <Button key={q} size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => ask(q)}>
            {q.replace(/\?$/, "")}
          </Button>
        ))}
      </div>
      <Input className="h-8 text-xs" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a policy question…" />
      <Button size="sm" className="h-8 text-xs w-full" disabled={loading} onClick={() => ask()}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
        Ask policy agent
      </Button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {answer && <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{answer}</p>}
    </Card>
  );
}
