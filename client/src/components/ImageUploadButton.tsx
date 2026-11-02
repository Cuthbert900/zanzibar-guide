import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MapLocation } from "@/components/ChatMap";
import type { CitationSource } from "@shared/sources";
import type { FaqArticle, SafetyAdvisory } from "@shared/catalog";
import { getSessionId } from "@/lib/session";
import { useLanguage } from "@/contexts/LanguageContext";

export interface VisionResult {
  content: string;
  locations: MapLocation[];
  faqLinks?: FaqArticle[];
  alerts?: SafetyAdvisory[];
  sources?: CitationSource[];
  mode?: string;
}

interface ImageUploadButtonProps {
  disabled?: boolean;
  onResult: (result: VisionResult, previewUrl: string, caption: string) => void;
}

export function ImageUploadButton({ disabled, onResult }: ImageUploadButtonProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File) => {
    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dataUrl,
          caption: caption || file.name,
          filename: file.name,
          sessionId: getSessionId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vision failed");
      onResult(data.data, dataUrl, caption || file.name);
      setCaption("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image analysis failed");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label={t("photoCaptionAria")}
        placeholder={t("photoCaption")}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="h-9 w-28 sm:w-40 text-xs"
        disabled={disabled || loading}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={t("uploadPhoto")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={disabled || loading}
        aria-label="Upload photo for multimodal chat"
        onClick={() => inputRef.current?.click()}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      </Button>
    </div>
  );
}
