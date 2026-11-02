import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND } from "@shared/travel";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Summary {
  totalEvents: number;
  byType: Record<string, number>;
  byChannel: Record<string, number>;
  topIntents: Array<{ intent: string; count: number }>;
  bookings: { total: number; paid: number; pending: number };
}

interface EvalResult {
  ranAt: string;
  passed: number;
  failed: number;
  passRate: number;
  results: Array<{ id: string; pass: boolean; detail?: string }>;
}

const COLORS = ["#0891b2", "#ea580c", "#7c3aed", "#16a34a", "#dc2626"];

export default function Analytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  const load = () => {
    fetch("/api/analytics/summary")
      .then((r) => r.json())
      .then((d) => setSummary(d.data))
      .catch((e) => setError(e.message));
  };

  const runEval = async () => {
    setEvalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/eval/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eval failed");
      setEvalResult(data.data);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eval failed");
    } finally {
      setEvalLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const channelData = summary
    ? Object.entries(summary.byChannel).map(([name, value]) => ({ name, value }))
    : [];
  const typeData = summary
    ? Object.entries(summary.byType)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{BRAND.name} Analytics</h1>
            <p className="text-xs text-muted-foreground">User behavior, popular queries, eval quality · {BRAND.poweredBy}</p>
          </div>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back to chat
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold">Answer quality (eval harness)</h2>
              <p className="text-[10px] text-muted-foreground">Runs golden questions against the live chat model</p>
            </div>
            <Button size="sm" onClick={runEval} disabled={evalLoading}>
              {evalLoading ? "Running…" : "Run eval"}
            </Button>
          </div>
          {evalResult && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{evalResult.passRate}%</p>
                <p className="text-[10px] text-muted-foreground">Pass rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{evalResult.passed}</p>
                <p className="text-[10px] text-muted-foreground">Passed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{evalResult.failed}</p>
                <p className="text-[10px] text-muted-foreground">Failed</p>
              </div>
            </div>
          )}
          {evalResult && (
            <ul className="text-[10px] space-y-1 max-h-32 overflow-y-auto">
              {evalResult.results.map((r) => (
                <li key={r.id}>
                  {r.pass ? "✓" : "✗"} {r.id}
                  {!r.pass && r.detail ? ` — ${r.detail}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Events", value: summary?.totalEvents ?? 0 },
            { label: "Bookings", value: summary?.bookings.total ?? 0 },
            { label: "Paid", value: summary?.bookings.paid ?? 0 },
            { label: "Pending pay", value: summary?.bookings.pending ?? 0 },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4 h-80">
            <h2 className="text-sm font-semibold mb-4">Channel mix</h2>
            {channelData.length ? (
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie data={channelData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {channelData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No channel data yet — use chat, widget, or WhatsApp stub.</p>
            )}
          </Card>

          <Card className="p-4 h-80">
            <h2 className="text-sm font-semibold mb-4">Event types</h2>
            {typeData.length ? (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={typeData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            )}
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Top intents</h2>
          <ul className="space-y-2">
            {(summary?.topIntents || []).map((i) => (
              <li key={i.intent} className="flex justify-between text-sm border-b border-border/40 pb-1">
                <span>{i.intent}</span>
                <span className="font-mono text-muted-foreground">{i.count}</span>
              </li>
            ))}
            {!summary?.topIntents?.length && <li className="text-sm text-muted-foreground">No intents recorded yet.</li>}
          </ul>
        </Card>
      </main>
    </div>
  );
}
