import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  lang?: string;
}

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
};

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceInput({ onResult, disabled, lang = "en-US" }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      setSupported(false);
      setStatus("Voice input needs Chrome or Edge (Speech Recognition API)");
      return;
    }

    // Secure context required (localhost / https)
    if (!window.isSecureContext) {
      setSupported(false);
      setStatus("Voice needs HTTPS or localhost");
      return;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onstart = () => {
      setStarting(false);
      setListening(true);
      setStatus("Listening… speak now");
    };

    rec.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (!text) return;
      if (last.isFinal !== false) {
        onResultRef.current(text);
        setStatus(`Sending: “${text.slice(0, 60)}${text.length > 60 ? "…" : ""}”`);
        setListening(false);
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      } else {
        setStatus(`Hearing: ${text.slice(0, 40)}…`);
      }
    };

    rec.onerror = (ev) => {
      setStarting(false);
      setListening(false);
      const code = ev.error || "error";
      const messages: Record<string, string> = {
        "not-allowed": "Microphone blocked — allow mic access in the browser address bar",
        "service-not-allowed": "Speech service blocked — check browser permissions",
        "no-speech": "No speech detected — try again",
        "audio-capture": "No microphone found",
        network: "Speech network error — check internet (Chrome uses online recognition)",
        aborted: "",
        "language-not-supported": "Language not supported for voice input",
      };
      const msg = messages[code] ?? `Voice error: ${code}`;
      setStatus(msg || null);
    };

    rec.onend = () => {
      setStarting(false);
      setListening(false);
    };

    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    };
  }, [lang]);

  const toggle = async () => {
    if (!recRef.current || disabled || !supported) return;

    if (listening || starting) {
      try {
        recRef.current.stop();
      } catch {
        try {
          recRef.current.abort();
        } catch {
          /* ignore */
        }
      }
      setListening(false);
      setStarting(false);
      setStatus(null);
      return;
    }

    setStarting(true);
    setStatus("Requesting microphone…");

    // Explicit permission prompt improves Safari/Chrome UX
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      setStarting(false);
      setListening(false);
      setStatus("Microphone blocked — allow mic access in the browser address bar");
      return;
    }

    try {
      recRef.current.lang = lang;
      recRef.current.start();
    } catch (err) {
      setStarting(false);
      setListening(false);
      // Often means already started
      const msg = err instanceof Error ? err.message : "Could not start voice input";
      setStatus(msg.includes("already") ? "Already listening — click to stop" : msg);
    }
  };

  if (!supported) {
    return (
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled
        title={status || "Voice input not supported in this browser"}
        aria-label="Voice input unavailable"
        className="shrink-0 opacity-60"
      >
        <MicOff className="w-4 h-4 text-muted-foreground" />
      </Button>
    );
  }

  const active = listening || starting;

  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        size="icon"
        variant={active ? "default" : "outline"}
        onClick={toggle}
        disabled={disabled}
        title={active ? "Stop listening" : "Voice input — click and speak"}
        aria-label={active ? "Stop voice input" : "Start voice input"}
        aria-pressed={active}
        className={active ? "bg-red-600 hover:bg-red-700 text-white" : ""}
      >
        {starting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : active ? (
          <Mic className="w-4 h-4 animate-pulse" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>
      {status && (
        <p
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-foreground/90 px-2 py-0.5 text-[9px] text-background max-w-[220px] truncate z-10"
          role="status"
        >
          {status}
        </p>
      )}
    </div>
  );
}
