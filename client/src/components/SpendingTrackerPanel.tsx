import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export function SpendingTrackerPanel() {
  const { formatMoney } = useCurrency();
  const [category, setCategory] = useState("food");
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<{ total: number; byCategory: Record<string, number>; byDay: Record<string, number> } | null>(null);

  const refresh = async () => {
    const res = await fetch("/api/engagement/spending");
    const data = await res.json();
    setSummary(data.summary);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const add = async () => {
    await fetch("/api/engagement/spending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amountUsd: Number(amount), note }),
    });
    setNote("");
    await refresh();
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Wallet className="w-3.5 h-3.5" /> Daily spending tracker
      </p>
      <div className="grid grid-cols-2 gap-2">
        <select className="h-8 text-xs border rounded px-2 bg-background" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="lodging">Lodging</option>
          <option value="food">Food</option>
          <option value="activities">Activities</option>
          <option value="transport">Transport</option>
          <option value="other">Other</option>
        </select>
        <Input className="h-8 text-xs" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <Input className="h-8 text-xs" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button size="sm" className="h-8 text-xs w-full" onClick={add}>
        Log spend
      </Button>
      {summary && (
        <div className="text-[10px] space-y-1">
          <p className="font-medium">Trip total {formatMoney(summary.total)}</p>
          <ul className="text-muted-foreground">
            {Object.entries(summary.byCategory).map(([k, v]) => (
              <li key={k}>
                {k}: {formatMoney(v)}
              </li>
            ))}
          </ul>
          <p className="font-medium pt-1">By day</p>
          <ul className="text-muted-foreground">
            {Object.entries(summary.byDay).map(([k, v]) => (
              <li key={k}>
                {k}: {formatMoney(v)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
