import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface SpeakButtonProps {
  text: string;
  className?: string;
}

export function SpeakButton({ text, className }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const onEnd = () => setSpeaking(false);
    window.speechSynthesis.addEventListener("end", onEnd as never);
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("end", onEnd as never);
    };
  }, [supported]);

  if (!supported || !text?.trim()) return null;

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*#_>`]/g, " ").slice(0, 1200));
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={`h-7 px-2 text-[10px] gap-1 ${className || ""}`}
      onClick={toggle}
      aria-label={speaking ? "Stop speaking" : "Speak reply"}
    >
      {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      {speaking ? "Stop" : "Speak"}
    </Button>
  );
}
