import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Loader2, Volume2 } from "lucide-react";
import { getSessionId } from "@/lib/session";

interface StoryListItem {
  locationId: string;
  title: string;
  tagline: string;
  durationSec: number;
  sceneCount: number;
}

interface StoryDetail {
  locationId: string;
  title: string;
  tagline: string;
  scenes: Array<{ scene: number; title: string; narration: string; visualHint: string }>;
  tips: string[];
  speakText?: string;
  narration?: string;
}

export function StorytellerPanel({ locationId }: { locationId?: string }) {
  const [list, setList] = useState<StoryListItem[]>([]);
  const [selected, setSelected] = useState(locationId || "stone-town");
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/zanzibar/stories")
      .then((r) => r.json())
      .then((d) => setList(d.data || []))
      .catch(() => setList([]));
  }, []);

  useEffect(() => {
    if (locationId && list.some((l) => l.locationId === locationId)) setSelected(locationId);
  }, [locationId, list]);

  const loadStory = async (id: string, narrate = false) => {
    setLoading(true);
    setStatus("");
    try {
      if (narrate) {
        const res = await fetch("/api/zanzibar/stories/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locationId: id, sessionId: getSessionId() }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed");
        setStory(d.data);
        setStatus("Narration ready — tap Speak");
      } else {
        const res = await fetch(`/api/zanzibar/stories/${id}?sessionId=${encodeURIComponent(getSessionId())}`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed");
        setStory(d.data);
      }
      setSelected(id);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not load story");
    } finally {
      setLoading(false);
    }
  };

  const speak = () => {
    const text = story?.speakText || story?.narration || story?.scenes.map((s) => s.narration).join(" ");
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <BookOpen className="w-3.5 h-3.5" aria-hidden />
        Heritage storyteller
      </p>
      <p className="text-[10px] text-muted-foreground">Narrated Zanzibar landmark stories (lite documentary)</p>
      <div className="flex flex-wrap gap-1">
        {list.map((s) => (
          <Button
            key={s.locationId}
            size="sm"
            variant={selected === s.locationId ? "default" : "outline"}
            className="h-7 text-[10px]"
            onClick={() => loadStory(s.locationId)}
          >
            {s.title.split(":")[0]}
          </Button>
        ))}
      </div>
      <div className="flex gap-1">
        <Button size="sm" className="h-8 text-xs flex-1" disabled={loading} onClick={() => loadStory(selected, true)}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Generate narration
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!story} onClick={speak}>
          <Volume2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {status && <p className="text-[10px] text-muted-foreground">{status}</p>}
      {story && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium">{story.title}</p>
          <p className="text-[10px] text-muted-foreground italic">{story.tagline}</p>
          {(story.speakText || story.narration) && (
            <p className="text-[11px] leading-relaxed text-foreground/90">{story.speakText || story.narration}</p>
          )}
          {!story.speakText &&
            !story.narration &&
            story.scenes?.map((sc) => (
              <div key={sc.scene} className="text-[10px]">
                <span className="font-semibold">
                  {sc.scene}. {sc.title}:
                </span>{" "}
                {sc.narration}
              </div>
            ))}
          {story.tips?.length > 0 && (
            <p className="text-[10px] text-primary">Tips: {story.tips.join(" · ")}</p>
          )}
        </div>
      )}
    </Card>
  );
}
