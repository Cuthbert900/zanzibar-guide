import React, { useState } from "react";
import { Compass, Sparkles, MapPin } from "lucide-react";
import TypingIndicator from "@/components/TypingIndicator";
import { ChatMap, type MapLocation } from "@/components/ChatMap";
import { AttractionCard } from "@/components/AttractionCard";
import SourcesModal from "@/components/SourcesModal";
import { useLanguage } from "@/contexts/LanguageContext";

type ChatRole = "user" | "assistant";

type Source = {
  id: string;
  kind?: string;
  title?: string;
  detail?: string;
  url?: string;
  confidence?: "low" | "medium" | "high";
};

type Message = {
  id: string;
  role: ChatRole;
  content: string;
  time: string;
  meta?: {
    locations?: MapLocation[];
    bookingSuggestions?: MapLocation[];
    faqLinks?: any[];
    alerts?: any[];
    sources?: Source[];
  };
};

type Props = {
  message: Message;
  providerLabel?: string;
};

export default function ChatMessage({ message, providerLabel }: Props) {
  const { t } = useLanguage();
  const isAssistant = message.role === "assistant";
  const [showMap, setShowMap] = useState(false);
  const [showSources, setShowSources] = useState(false);

  return (
    <article className={`zd-message zd-message-${message.role}`} key={message.id}>
      {isAssistant && (
        <div className="zd-guide-avatar">
          <Compass size={17} />
        </div>
      )}
      <div className="zd-message-body">
        <div className="zd-message-meta">
          <strong>{isAssistant ? "Zanzibar Guide" : t("you")}</strong>
          <span>{message.time}</span>
          {isAssistant && (
            <span className="zd-message-model">
              <Sparkles size={11} /> {providerLabel ?? t("adaptiveAi")}
            </span>
          )}
        </div>

        <div className={`zd-message-bubble ${isAssistant ? "zd-guide-bubble" : "zd-user-bubble"}`}>
          {message.content ? <p>{message.content}</p> : <TypingIndicator />}
        </div>

        {/* Inline citations / sources */}
        {isAssistant && message.meta?.sources && message.meta.sources.length > 0 && (
          <>
            <div className="zd-message-sources mt-2 text-xs text-foreground/70 flex items-center gap-2">
              <span className="zd-sources-label">{t("sourcesLabel")}</span>
              {message.meta.sources.slice(0, 3).map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  className="zd-source-chip px-2 py-1 rounded border text-xs"
                  onClick={() => setShowSources(true)}
                  title={s.title}
                >
                  [{idx + 1}] {s.title ? (s.title.length > 24 ? s.title.slice(0, 21) + "…" : s.title) : s.id}
                </button>
              ))}
              {message.meta.sources.length > 3 && <span className="zd-more-sources">{t("moreSources", { count: message.meta.sources.length - 3 })}</span>}
              <button type="button" className="zd-open-sources text-xs underline" onClick={() => setShowSources(true)}>
                {t("viewAll")}
              </button>
            </div>
            <SourcesModal open={showSources} onClose={() => setShowSources(false)} sources={message.meta.sources} />
          </>
        )}

        {isAssistant && message.meta?.locations && message.meta.locations.length > 0 && (
          <>
            <div className="zd-message-cards mt-3 flex gap-3 overflow-x-auto pb-2">
              {message.meta.locations.map((loc) => (
                <AttractionCard key={loc.id} location={loc} />
              ))}
            </div>

            <div className="mt-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs text-foreground/80 px-2 py-1 rounded-md border border-border/50 bg-background/60"
                onClick={() => setShowMap((s) => !s)}
              >
                <MapPin size={14} /> {showMap ? t("hideMap") : t("viewOnMap", { count: message.meta.locations.length })}
              </button>
            </div>

            {showMap && (
              <div className="mt-3 h-48 w-full overflow-hidden rounded-md border border-border/50">
                <ChatMap locations={message.meta.locations} onLocationSelect={() => {}} />
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
