import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { jsPDF } from "jspdf";

interface Ticket {
  id: string;
  sessionId: string;
  travellerName: string;
  status: string;
  agentName?: string;
  createdAt: string;
  updatedAt: string;
  transcript: Array<{ id: string; role: string; content: string; at: string }>;
}

function waitMins(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function AgentDesk() {
  const [queue, setQueue] = useState<Ticket[]>([]);
  const [active, setActive] = useState<Ticket | null>(null);
  const [agentName, setAgentName] = useState(localStorage.getItem("travelguide_agent") || "Tourism Agent");
  const [reply, setReply] = useState("");
  const [now, setNow] = useState(Date.now());

  const refresh = async () => {
    const res = await fetch("/api/handoff/queue");
    const data = await res.json();
    setQueue(data.data || []);
    if (active) {
      const t = (data.data || []).find((x: Ticket) => x.id === active.id);
      if (t) setActive(t);
    }
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 3000);
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const claim = async (id: string) => {
    localStorage.setItem("travelguide_agent", agentName);
    const res = await fetch(`/api/handoff/${id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName }),
    });
    const data = await res.json();
    if (res.ok) setActive(data.data);
    refresh();
  };

  const send = async () => {
    if (!active || !reply.trim()) return;
    const res = await fetch(`/api/handoff/${active.id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "agent", content: reply.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setActive(data.data);
      setReply("");
    }
    refresh();
  };

  const resolve = async () => {
    if (!active) return;
    const res = await fetch(`/api/handoff/${active.id}/resolve`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setActive(data.data);
    refresh();
  };

  const exportPdf = () => {
    if (!active) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Handoff transcript ${active.id}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Traveller: ${active.travellerName} · Status: ${active.status}`, 14, 26);
    let y = 34;
    active.transcript.forEach((m) => {
      const lines = doc.splitTextToSize(`${m.role}: ${m.content}`, 180);
      if (y + lines.length * 5 > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, 14, y);
      y += lines.length * 5 + 4;
    });
    doc.save(`${active.id}-transcript.pdf`);
  };

  void now;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-bold">Agent desk</h1>
            <p className="text-xs text-muted-foreground">
              Queue · SLA wait timer · presence · transcript PDF
            </p>
          </div>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <label className="text-xs font-medium">Your agent name</label>
          <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} aria-label="Agent name" />
          <p className="text-xs font-semibold">
            Queue{" "}
            <span className="text-emerald-600 font-normal">
              · {agentName} online
            </span>
          </p>
          <ul className="space-y-2 max-h-[480px] overflow-y-auto">
            {queue.map((t) => {
              const wait = waitMins(t.createdAt);
              const slaWarn = t.status === "queued" && wait >= 5;
              return (
                <li key={t.id} className="border rounded-md p-2 text-xs flex justify-between gap-2 items-center">
                  <div>
                    <p className="font-medium">
                      {t.travellerName} · {t.status}
                      {t.agentName ? ` · ${t.agentName}` : ""}
                    </p>
                    <p className={slaWarn ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      {t.id} · wait {wait}m {slaWarn ? "(SLA breach >5m)" : ""}
                    </p>
                  </div>
                  <Button size="sm" className="h-7 text-[10px]" onClick={() => claim(t.id)} disabled={t.status === "resolved"}>
                    {t.status === "queued" ? "Claim" : "Open"}
                  </Button>
                </li>
              );
            })}
            {!queue.length && <li className="text-xs text-muted-foreground">No tickets</li>}
          </ul>
        </Card>
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold">Transcript</p>
          {!active ? (
            <p className="text-xs text-muted-foreground">Claim a ticket to view transcript</p>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground">
                Wait since open: {waitMins(active.createdAt)}m · Agent: {active.agentName || "unassigned"}
              </p>
              <div className="border rounded-md p-3 max-h-80 overflow-y-auto space-y-2 text-xs bg-muted/20">
                {active.transcript.map((m) => (
                  <p key={m.id}>
                    <span className="font-semibold">{m.role}: </span>
                    {m.content}
                  </p>
                ))}
              </div>
              <Textarea
                aria-label="Agent reply"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply to traveller…"
              />
              <div className="flex gap-2 flex-wrap">
                <Button onClick={send} disabled={!reply.trim()}>
                  Send
                </Button>
                <Button variant="secondary" onClick={resolve}>
                  Resolve
                </Button>
                <Button variant="outline" onClick={exportPdf}>
                  Export PDF
                </Button>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
