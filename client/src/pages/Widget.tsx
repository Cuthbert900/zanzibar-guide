import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { Link } from "wouter";
import { BRAND } from "@shared/travel";
import { getSessionId } from "@/lib/session";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/** Compact embeddable web widget surface */
export default function Widget() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Hi — I'm ${BRAND.name}. Ask me anything about your trip.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const user = input.trim();
    const next = [...messages, { role: "user" as const, content: user }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          sessionId: getSessionId(),
          channel: "widget",
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content || data.error || "Error" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[560px] bg-card rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden">
        <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{BRAND.name} Widget</p>
            <p className="text-[10px] opacity-80">Embeddable web chat · {BRAND.poweredBy}</p>
          </div>
          <Link href="/" className="text-[10px] underline opacity-90">
            Full app
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-background">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] text-xs px-3 py-2 rounded-2xl whitespace-pre-wrap ${
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="p-3 border-t flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message…" className="h-9 text-sm" disabled={loading} />
          <Button type="submit" size="icon" className="h-9 w-9" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
