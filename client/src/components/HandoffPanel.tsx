import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSessionId } from "@/lib/session";
import { Headphones } from "lucide-react";

interface Ticket {
  id: string;
  status: string;
  agentName?: string;
  createdAt?: string;
  transcript: Array<{ id: string; role: string; content: string; at: string }>;
}

interface HandoffPanelProps {
  messages: Array<{ type: "user" | "assistant"; content: string }>;
  onStatus?: (text: string) => void;
}

export function HandoffPanel({ messages, onStatus }: HandoffPanelProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const poll = async (id?: string) => {
    if (id) {
      const res = await fetch(`/api/handoff/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data.data);
      }
      return;
    }
    const res = await fetch(`/api/handoff/session/${getSessionId()}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data.data);
    }
  };

  useEffect(() => {
    poll();
    const t = window.setInterval(() => poll(ticket?.id), 4000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

  const requestAgent = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          transcript: messages.slice(-12).map((m) => ({
            role: m.type,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Handoff failed");
      setTicket(data.data);
      onStatus?.(`Connected to agent queue (${data.data.id}). An agent will join shortly.`);
    } catch (err) {
      onStatus?.(err instanceof Error ? err.message : "Handoff failed");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!ticket || !reply.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/handoff/${ticket.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "traveller", content: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setTicket(data.data);
      setReply("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Headphones className="w-3.5 h-3.5" aria-hidden />
        Human handoff
      </p>
      {!ticket || ticket.status === "resolved" ? (
        <Button size="sm" className="h-8 text-xs w-full" onClick={requestAgent} disabled={busy}>
          Talk to an agent
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Ticket {ticket.id} · {ticket.status}
            {ticket.agentName ? ` · agent online: ${ticket.agentName}` : " · waiting in queue"}
            {ticket.createdAt
              ? ` · wait ${Math.max(0, Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / 60000))}m`
              : ""}
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1 text-[10px] border rounded-md p-2 bg-muted/20">
            {ticket.transcript.slice(-8).map((m) => (
              <p key={m.id}>
                <span className="font-semibold">{m.role}: </span>
                {m.content}
              </p>
            ))}
          </div>
          {ticket.status !== "resolved" && (
            <div className="flex gap-1">
              <Input
                aria-label="Message to agent"
                className="h-8 text-xs"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Message agent…"
              />
              <Button size="sm" className="h-8 text-xs" onClick={send} disabled={busy || !reply.trim()}>
                Send
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
