import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Languages } from "lucide-react";

const LANGS = ["Swahili", "Spanish", "French", "German", "Portuguese", "Shona", "Ndebele"];

export function PhraseTranslatorPanel() {
  const [text, setText] = useState("Hello");
  const [lang, setLang] = useState("Swahili");
  const [result, setResult] = useState<{ translatedText: string; phonetic?: string; notes?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Languages className="w-3.5 h-3.5" aria-hidden />
        Phrase translator
      </p>
      <Input className="h-8 text-xs" value={text} onChange={(e) => setText(e.target.value)} aria-label="Phrase to translate" />
      <select
        className="w-full h-8 text-xs border rounded-md px-2 bg-background"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Target language"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <Button size="sm" className="h-8 text-xs w-full" onClick={translate} disabled={loading || !text.trim()}>
        {loading ? "Translating…" : "Translate"}
      </Button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {result && (
        <div className="text-xs space-y-0.5">
          <p className="font-medium">{result.translatedText}</p>
          {result.phonetic && <p className="text-[10px] text-muted-foreground">/{result.phonetic}/</p>}
          {result.notes && <p className="text-[10px] text-muted-foreground">{result.notes}</p>}
        </div>
      )}
    </Card>
  );
}
