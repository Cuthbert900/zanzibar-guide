import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ADMIN_KEY_STORAGE = "travelguide_admin_key";

export default function Admin() {
  const [key, setKey] = useState(localStorage.getItem(ADMIN_KEY_STORAGE) || "travelguide-admin");
  const [json, setJson] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [audit, setAudit] = useState<Array<{ id: string; at: string; action: string; detail?: string; role: string }>>([]);

  const headers = () => ({ "x-admin-key": key });

  const load = async () => {
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
    const me = await fetch("/api/admin/me", { headers: headers() });
    const meData = await me.json();
    if (!me.ok) {
      setStatus(meData.error || "Auth failed");
      setRole(null);
      return;
    }
    setRole(meData.data.role);
    const res = await fetch("/api/admin/cms", { headers: headers() });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Load failed");
      return;
    }
    setJson(JSON.stringify(data.data, null, 2));
    setStatus(`Loaded CMS · role=${meData.data.role}`);
    const aud = await fetch("/api/admin/audit", { headers: headers() });
    if (aud.ok) {
      const a = await aud.json();
      setAudit(a.data || []);
    }
  };

  const save = async () => {
    try {
      const body = JSON.parse(json);
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus("Saved — attractions/FAQs/alerts updated (audited)");
      setJson(JSON.stringify(data.data, null, 2));
      load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Admin CMS</h1>
            <p className="text-xs text-muted-foreground">
              Roles: editor (`travelguide-admin`) · viewer (`travelguide-viewer`)
            </p>
          </div>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 space-y-4 max-w-4xl">
        <Card className="p-4 space-y-3">
          <label className="text-xs font-medium">Admin key {role ? `(${role})` : ""}</label>
          <Input value={key} onChange={(e) => setKey(e.target.value)} className="font-mono text-xs" />
          <div className="flex gap-2">
            <Button onClick={load}>Load</Button>
            <Button variant="secondary" onClick={save} disabled={role === "viewer"}>
              Save
            </Button>
          </div>
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
          <Textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={20}
            className="font-mono text-[10px]"
            readOnly={role === "viewer"}
          />
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">Audit log</p>
          <ul className="max-h-48 overflow-y-auto space-y-1 text-[10px]">
            {audit.map((a) => (
              <li key={a.id} className="border-b border-border/40 pb-1">
                <span className="font-mono">{a.at.slice(0, 19)}</span> · {a.action} · {a.role}
                {a.detail ? ` — ${a.detail}` : ""}
              </li>
            ))}
            {!audit.length && <li className="text-muted-foreground">No audit entries yet</li>}
          </ul>
        </Card>
      </main>
    </div>
  );
}
