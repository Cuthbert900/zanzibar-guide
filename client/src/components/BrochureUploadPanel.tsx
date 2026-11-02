import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUp } from "lucide-react";

interface Doc {
  id: string;
  title: string;
  filename: string;
  chunkCount: number;
  uploadedAt: string;
}

export function BrochureUploadPanel() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    fetch("/api/rag/docs")
      .then((r) => r.json())
      .then((d) => setDocs(d.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  const onFile = async (file: File) => {
    setStatus("Uploading…");
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const res = await fetch("/api/rag/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || file.name,
        filename: file.name,
        contentBase64,
        mime: file.type,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Upload failed");
      return;
    }
    setStatus(`Indexed ${data.data.chunkCount} chunks from ${data.data.title}`);
    setTitle("");
    refresh();
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <FileUp className="w-3.5 h-3.5" aria-hidden />
        Brochure RAG
      </p>
      <p className="text-[10px] text-muted-foreground">Upload tourism board PDF/TXT — answers cite page refs.</p>
      <Input
        aria-label="Brochure title"
        className="h-8 text-xs"
        placeholder="Document title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,text/plain,application/pdf"
        className="sr-only"
        aria-label="Upload brochure"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <Button size="sm" className="h-8 text-xs w-full" variant="secondary" onClick={() => inputRef.current?.click()}>
        Upload brochure
      </Button>
      {status && <p className="text-[10px] text-muted-foreground">{status}</p>}
      <ul className="text-[10px] space-y-1 max-h-24 overflow-y-auto">
        {docs.map((d) => (
          <li key={d.id}>
            {d.title} · {d.chunkCount} chunks
          </li>
        ))}
      </ul>
    </Card>
  );
}
