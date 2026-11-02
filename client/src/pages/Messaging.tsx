import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@shared/travel";
import { getSessionId } from "@/lib/session";

export default function Messaging() {
  const [text, setText] = useState("What attractions should I visit in Zanzibar?");
  const [payloadPreview, setPayloadPreview] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifyLog, setNotifyLog] = useState("");
  const [status, setStatus] = useState<{ mode?: string; note?: string } | null>(null);

  useEffect(() => {
    fetch("/api/messaging/whatsapp/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ mode: "unknown", note: "Could not load connector status" }));
  }, []);

  const send = async () => {
    setLoading(true);
    setError(null);
    setReply("");
    const inbound = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ from: "15551234567", type: "text", text: { body: text } }],
              },
            },
          ],
        },
      ],
      sessionId: getSessionId(),
    };
    setPayloadPreview(JSON.stringify(inbound, null, 2));

    try {
      const res = await fetch("/api/messaging/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inbound),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Stub failed");
      setReply(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">WhatsApp connector stub</h1>
            <p className="text-xs text-muted-foreground">
              Meta-style webhook stub · {BRAND.poweredBy}
            </p>
          </div>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back to chat
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {status && (
          <Card className="p-4 space-y-2 md:col-span-2 border-emerald-200 bg-emerald-50/50">
            <p className="text-sm font-semibold">
              Connector status: <span className="font-mono text-emerald-800">{status.mode || "stub"}</span>
            </p>
            <p className="text-xs text-muted-foreground">{status.note}</p>
            <p className="text-[11px] text-muted-foreground">
              Webhook verify: <code className="bg-card/80 px-1 rounded">GET /api/messaging/whatsapp?hub.mode=subscribe&amp;hub.verify_token=…&amp;hub.challenge=…</code>
              {" · "}Env: <code className="bg-card/80 px-1 rounded">WHATSAPP_TOKEN</code>,{" "}
              <code className="bg-card/80 px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code>,{" "}
              <code className="bg-card/80 px-1 rounded">WHATSAPP_VERIFY_TOKEN</code>
            </p>
          </Card>
        )}
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold">Inbound traveller message</p>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
          <Button onClick={send} disabled={loading || !text.trim()}>
            {loading ? "Sending…" : "POST /api/messaging/whatsapp"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {payloadPreview && (
            <pre className="text-[10px] bg-muted p-3 rounded-lg overflow-auto max-h-48">{payloadPreview}</pre>
          )}
        </Card>
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold">Connector response</p>
          <pre className="text-[10px] bg-muted p-3 rounded-lg overflow-auto min-h-64 whitespace-pre-wrap">
            {reply || "Response will appear here"}
          </pre>
        </Card>

        <Card className="p-4 space-y-3 md:col-span-2">
          <p className="text-sm font-semibold">Push / WhatsApp notifications (demo dispatcher)</p>
          <p className="text-xs text-muted-foreground">
            Logs booking confirmations and safety alerts — not sent via Meta Cloud API in this demo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const res = await fetch("/api/notify/safety-blast", { method: "POST" });
                const data = await res.json();
                setNotifyLog(JSON.stringify(data, null, 2));
              }}
            >
              Blast safety alerts
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const res = await fetch("/api/notify/");
                const data = await res.json();
                setNotifyLog(JSON.stringify(data, null, 2));
              }}
            >
              View notification log
            </Button>
          </div>
          {notifyLog && (
            <pre className="text-[10px] bg-muted p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">{notifyLog}</pre>
          )}
        </Card>
      </main>
    </div>
  );
}
