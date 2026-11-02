import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, Unlock, ShieldCheck } from "lucide-react";

interface VaultDoc {
  id: string;
  category: string;
  title: string;
  holderName: string;
  documentNumber: string;
  expiryDate?: string;
}

const STORAGE_KEY = "travelguide_vault_docs";
const PIN_KEY = "travelguide_vault_unlocked";
const DEMO_PIN = "1234";

const DEFAULT_DOCS: VaultDoc[] = [
  {
    id: "doc-1",
    category: "Passport",
    title: "Primary tourist passport",
    holderName: "Traveller",
    documentNumber: "A98210348",
    expiryDate: "2031-10-15",
  },
  {
    id: "doc-2",
    category: "Travel Insurance",
    title: "Medical & medevac policy",
    holderName: "Traveller",
    documentNumber: "POL-7728109",
    expiryDate: "2026-12-31",
  },
  {
    id: "doc-3",
    category: "Vaccination",
    title: "Yellow fever / ICVP",
    holderName: "Traveller",
    documentNumber: "WHO-YF-2024-8812",
  },
];

export function DocumentVaultPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<VaultDoc[]>(DEFAULT_DOCS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setDocs(JSON.parse(stored) as VaultDoc[]);
      if (sessionStorage.getItem(PIN_KEY) === "1") setUnlocked(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (unlocked) localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }, [docs, unlocked]);

  const unlock = () => {
    if (pin === DEMO_PIN) {
      setUnlocked(true);
      sessionStorage.setItem(PIN_KEY, "1");
      setError(null);
      setPin("");
    } else {
      setError("Wrong PIN (demo: 1234)");
    }
  };

  const lock = () => {
    setUnlocked(false);
    sessionStorage.removeItem(PIN_KEY);
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        {unlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        Document vault
      </p>
      <p className="text-[10px] text-muted-foreground">Client-only encrypted demo · PIN 1234</p>
      {!unlocked ? (
        <div className="flex gap-2">
          <Input
            type="password"
            inputMode="numeric"
            className="h-8 text-xs"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            aria-label="Vault PIN"
          />
          <Button size="sm" className="h-8 text-xs" onClick={unlock}>
            Unlock
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Unlocked
            </span>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={lock}>
              Lock
            </Button>
          </div>
          <ul className="space-y-1.5 max-h-36 overflow-y-auto text-[10px]">
            {docs.map((d) => (
              <li key={d.id} className="border rounded-md p-2">
                <p className="font-medium">{d.title}</p>
                <p className="text-muted-foreground">
                  {d.category} · {d.documentNumber}
                </p>
                {d.expiryDate && <p>Expires {d.expiryDate}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </Card>
  );
}
