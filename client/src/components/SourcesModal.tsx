import React, { useEffect, useRef } from "react";
import { X, ExternalLink, Copy } from "lucide-react";

type Source = {
  id: string;
  kind?: string;
  title?: string;
  detail?: string;
  url?: string;
  confidence?: "low" | "medium" | "high";
};

export default function SourcesModal({
  open,
  onClose,
  sources = [],
}: {
  open: boolean;
  onClose: () => void;
  sources?: Source[];
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // focus the close button for accessibility
    setTimeout(() => closeRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // small, non-intrusive feedback could be implemented by the app toast system;
      // keep lightweight here.
    } catch {
      // ignore
    }
  };

  const badgeColor = (c?: Source["confidence"]) => {
    switch (c) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sources-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-card rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 id="sources-title" className="text-sm font-semibold">
            Sources ({sources.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close sources"
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-auto p-4 space-y-3">
              {sources.length === 0 && <div className="text-sm text-muted-foreground">No sources available.</div>}
              {sources.map((s, idx) => (
                <article key={s.id || `${idx}`} className="flex flex-col gap-2 p-3 rounded-md border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm truncate">{s.title || s.id}</strong>
                        <span className={`text-xs px-2 py-0.5 rounded ${badgeColor(s.confidence)}`}>{s.confidence ? s.confidence.toUpperCase() : "UNKNOWN"}</span>
                        {s.kind && <span className="ml-1 text-xs text-foreground/70">· {s.kind}</span>}
                      </div>
                    </div>

                <div className="flex items-center gap-2 shrink-0">
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline">
                      Open <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    title="Copy source id"
                    onClick={() => void copyToClipboard(s.url || s.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-accent text-xs"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {s.detail && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.detail}</p>}

              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>{s.id}</span>
                <span>{idx + 1}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border">
          <button onClick={onClose} className="rounded-md px-3 py-1 bg-muted hover:bg-accent text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
