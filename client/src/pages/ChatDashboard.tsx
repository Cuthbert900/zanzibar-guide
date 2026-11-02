import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  MapPin,
  MessageSquareText,
  Send,
  Settings2,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";
import { CurrencySwitcher } from "@/contexts/CurrencyContext";
import { LanguageSwitcher, useLanguage } from "@/contexts/LanguageContext";
import { userInitials, useAuth } from "@/contexts/AuthContext";
import AccountMenu from "@/components/AccountMenu";
import LanguageMenu from "@/components/LanguageMenu";
import { getSessionId } from "@/lib/session";
import { AERIAL_PHOTO, BEACH_PHOTO, STONE_TOWN_PHOTO } from "@/const";
import PhotoCredit from "@/components/PhotoCredit";
import "./chat-dashboard.css";
import TypingIndicator from "@/components/TypingIndicator";
import { QuickReplies } from "@/components/QuickReplies";
import ChatMessage from "@/components/ChatMessage";
import ThemeToggle from "@/components/ThemeToggle";
import { Tools } from "@/components/Tools";
import { MyBookings } from "@/components/MyBookings";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Translation key for the built-in sample messages, so they follow the language setting */
  contentKey?: string;
  time: string;
  meta?: {
    locations?: any[];
    bookingSuggestions?: any[];
    faqLinks?: any[];
    alerts?: any[];
  };
}

interface StreamEvent {
  type: string;
  text?: string;
  content?: string;
  error?: string;
  locations?: any[];
  bookingSuggestions?: any[];
  faqLinks?: any[];
  alerts?: any[];
  provider?: string;
  model?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "sample-user",
    role: "user",
    content: "",
    contentKey: "sampleQuestion",
    time: "10:42 AM",
  },
  {
    id: "sample-guide",
    role: "assistant",
    content: "",
    contentKey: "sampleAnswer",
    time: "10:42 AM",
  },
];


export default function ChatDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [chatReady, setChatReady] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [destinationSaved, setDestinationSaved] = useState(false);
  const [contextualQuickReplies, setContextualQuickReplies] = useState<string[] | null>(null);
  const [activeTab, setActiveTab] = useState("tools");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) throw new Error("Health check failed");
        return (await response.json()) as {
          aiProvider?: string;
          activeAiProvider?: string;
          aiConfigured?: boolean;
        };
      })
      .then((health) => {
        setProvider(health.aiProvider || health.activeAiProvider || "auto");
        setChatReady(Boolean(health.aiConfigured));
      })
      .catch(() => setChatReady(false));
  }, []);

  useEffect(() => {
    if (messages.length <= INITIAL_MESSAGES.length) return;
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date()),
    };
    const assistantId = `assistant-${Date.now()}`;
    const history = [...messages.filter((message) => !message.id.startsWith("sample-")), userMessage].map(
      ({ role, content }) => ({ role, content }),
    );

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "", time: t("justNow") },
    ]);
    setInput("");
    setIsSending(true);

    try {
      const token = localStorage.getItem("travelguide_token");
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history,
          sessionId: getSessionId(),
          channel: "web",
        }),
      });

      if (!response.ok || !response.body) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorBody.error || `Chat failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      const consumeEvent = (rawEvent: string) => {
        const dataLine = rawEvent.split(/\r?\n/).find((line) => line.startsWith("data:"));
        if (!dataLine) return;
        const payload = dataLine.slice(5).trim();
        if (payload === "[DONE]") return;
        const event = JSON.parse(payload) as StreamEvent;
        if (event.type === "token" && event.text) {
          assembled += event.text;
          setMessages((current) =>
            current.map((message) => (message.id === assistantId ? { ...message, content: assembled } : message)),
          );
        }
        if (event.type === "done") {
          assembled = event.content || assembled;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: assembled,
                    meta: {
                      locations: event.locations || [],
                      bookingSuggestions: event.bookingSuggestions || [],
                      faqLinks: event.faqLinks || [],
                      alerts: event.alerts || [],
                      sources: (event as any).sources || [],
                    },
                  }
                : message,
            ),
          );
          // set contextual quick replies if provided by the server (uiHints)
          try {
            const ui = (event as any).uiHints;
            if (ui && Array.isArray(ui.quickReplies)) {
              setContextualQuickReplies(ui.quickReplies);
            } else {
              setContextualQuickReplies(null);
            }
          } catch {
            setContextualQuickReplies(null);
          }
          setChatReady(true);
        }
        if (event.type === "error") throw new Error(event.error || t("guideNoResponse"));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) consumeEvent(event);
      }
      if (buffer.trim()) consumeEvent(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("somethingWentWrong");
      setChatReady(false);
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: item.content || t("cantReachGuide", { message }),
              }
            : item,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  const providerLabel = provider === "auto" ? t("adaptiveAi") : t("providerAssistant", { provider });

  return (
    <div className="dashboard-layout">
      <aside className="sidebar" aria-label={t("mainNavigation")}>
        <Link href="/" className="brand" aria-label={t("guideHome")}>
          <span className="brand-mark"><Compass size={21} strokeWidth={1.8} /></span>
          <span className="brand-copy">
            <strong>ZANZIBAR</strong>
            <span>{t("islandGuide")}</span>
          </span>
        </Link>
        <div className="flag-stripe" aria-hidden="true"><span /><span /><span /></div>

        <div className="nav-label">{t("workspace")}</div>
        <nav className="main-nav">
          <a className="nav-item is-active" href="#chat-feed">
            <MessageSquareText size={17} /><span>{t("aiChatAssistant")}</span><span className="active-dot" />
          </a>
          <button className={`nav-item ${settingsOpen ? "is-selected" : ""}`} type="button" onClick={() => { console.log("Desktop settings button clicked"); setSettingsOpen((open) => !open); }} aria-expanded={settingsOpen}>
            <Settings2 size={17} /><span>{t("settings")}</span><ChevronDown className={`nav-arrow ${settingsOpen ? "is-open" : ""}`} size={14} />
          </button>
        </nav>

        {settingsOpen && (
          <div className="settings-panel" style={{ zIndex: 10 }}>
            <div className="settings-heading">{t("preferences")}</div>
            <label>{t("language")}<LanguageSwitcher /></label>
            <label>{t("currency")}<CurrencySwitcher /></label>
          </div>
        )}

        <div className="trip-card">
          <div className="trip-studs" aria-hidden="true" />
          <div className="trip-overline"><span className="trip-marker" /> {t("tripOverline")}</div>
          <strong>{t("tripTitle")}</strong>
          <span>{t("tripBody")}</span>
          <button type="button" onClick={() => void sendMessage(t("tripPrompt"))}>
            {t("planYourTrip")} <ArrowRight size={14} />
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="connection-status"><span className={`status-dot ${chatReady === false ? "is-down" : ""}`} />
            <span>{chatReady === null ? t("guideConnecting") : chatReady ? t("guideReady") : t("guideUnavailable")}</span>
          </div>
          <div className="profile">
            <div className="profile-avatar">{user ? userInitials(user.name) : "TG"}</div>
            {user ? (
              <Link href="/account" className="profile-name"><strong>{user.name}</strong><span>{user.email}</span></Link>
            ) : (
              <div><strong>{t("travelGuest")}</strong><span>{t("personalItinerary")}</span></div>
            )}
            <button type="button" title={t("openPreferences")} aria-label={t("openPreferences")} onClick={() => setSettingsOpen((open) => !open)}><Settings2 size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-title">
            <span className="eyebrow">{t("conciergeEyebrow")}</span>
            <div className="heading-row"><h1>{t("aiChatAssistant")}</h1></div>
          </div>
          <div className="top-bar-actions">
            <LanguageMenu />
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        <nav className="mobile-nav" aria-label={t("mobileNavigation")}>
          <a className="is-active" href="#chat-feed"><MessageSquareText size={16} />{t("navChat")}</a>
          <button type="button" onClick={() => { console.log("Mobile settings button clicked"); setSettingsOpen((open) => !open); }}><Settings2 size={16} />{t("settings")}</button>
        </nav>
        {settingsOpen && (
          <div className="mobile-settings">
            <span>{t("language")}</span><LanguageSwitcher />
            <span>{t("currency")}</span><CurrencySwitcher />
          </div>
        )}

        <section className="conversation-area" aria-label={t("conversationLabel")}>
          <div className="photo-stage">
            <div className="conversation-intro">
              <div className="day-divider"><span /> {new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(new Date())} <span /></div>
              <h2>{t("chatGreeting")} <Sparkles className="wave-icon" size={14} aria-hidden="true" /></h2>
              <p>{t("chatWelcome")}</p>
            </div>

            <div className="message-feed" id="chat-feed" ref={feedRef} aria-live="polite">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.contentKey ? { ...message, content: t(message.contentKey) } : message}
                  providerLabel={providerLabel}
                />
              ))}
              <div className="feed-end"><ArrowDown size={13} /> {t("upToDate")}</div>
            </div>
          </div>

          <div className="composer-area">
            <div className="suggestion-row" aria-label={t("suggestedQuestions")}>
              {contextualQuickReplies && contextualQuickReplies.length ? (
                contextualQuickReplies.map((s) => (
                  <button key={s} type="button" onClick={() => void sendMessage(s)} disabled={isSending}>
                    {s} <ArrowUpRight size={13} />
                  </button>
                ))
              ) : (
                <QuickReplies onSelect={(q) => void sendMessage(q)} isLoading={isSending} />
              )}
            </div>
            <form className="composer" onSubmit={handleSubmit}>
              <input
                aria-label={t("messageGuide")}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("chatInputPlaceholder")}
                disabled={isSending}
              />
              <span className="composer-hint">{t("enterToSend")}</span>
              <button type="submit" aria-label={t("sendMessage")} disabled={!input.trim() || isSending}>
                {isSending ? <span className="send-spinner" /> : <Send size={17} />}
              </button>
            </form>
            <div className="composer-footer"><span><Check size={12} /> {t("plansStayYours")}</span><span>{t("aiDisclaimer")}</span></div>
            <div className="photo-credit">
              <PhotoCredit photo={BEACH_PHOTO} className="credit-day" />
              <PhotoCredit photo={AERIAL_PHOTO} className="credit-night" />
            </div>
          </div>
        </section>
      </main>

      <aside className="insights-panel" aria-label={t("destinationDetails")}>
        <div className="insights-heading">
          <div><span className="eyebrow">{t("localKnowHow")}</span><h2>{t("islandNotes")}</h2></div>
          <button type="button" title={t("askMoreDetails")} aria-label={t("askMoreDetails")} onClick={() => void sendMessage(t("moreDetailsPrompt"))}><ArrowUpRight size={16} /></button>
        </div>
        <div className="insights-tabs">
          <button className={activeTab === "destination" ? "is-active" : ""} onClick={() => setActiveTab("destination")}>{t("destination")}</button>
          <button className={activeTab === "tools" ? "is-active" : ""} onClick={() => setActiveTab("tools")}>{t("tools")}</button>
          <button className={activeTab === "bookings" ? "is-active" : ""} onClick={() => setActiveTab("bookings")}>{t("myBookings")}</button>
        </div>

        {activeTab === "destination" && <>
          <section className="destination-card" id="destination-preview">
            <div className="destination-image">
              <img src={STONE_TOWN_PHOTO.src} alt={t("stoneTownAlt")} />
              <span className="image-tag"><MapPin size={12} /> {t("ungujaIsland")}</span>
              <span className="image-count">01 / 04</span>
            </div>
            <div className="destination-copy">
              <div className="destination-title"><div><span className="eyebrow">{t("cultureHeritage")}</span><h3>{t("stoneTown")}</h3></div><button type="button" title={destinationSaved ? t("unsaveStoneTown") : t("saveStoneTown")} aria-label={destinationSaved ? t("unsaveStoneTown") : t("saveStoneTown")} aria-pressed={destinationSaved} onClick={() => setDestinationSaved((saved) => !saved)}>{destinationSaved ? <Check size={15} /> : <span>+</span>}</button></div>
              <p>{t("stoneTownBody")}</p>
              <div className="destination-tags"><span>{t("unescoHeritage")}</span><span>{t("walkable")}</span></div>
              <button className="text-link" type="button" onClick={() => void sendMessage(t("highlightsPrompt"))}>{t("exploreHighlights")} <ArrowRight size={14} /></button>
              <div className="image-credit"><PhotoCredit photo={STONE_TOWN_PHOTO} /></div>
            </div>
          </section>

          <section className="weather-panel" aria-label={t("islandConditions")}>
            <div className="weather-top"><div><span className="eyebrow">{t("islandNotes")}</span><h3>{t("coastalRhythm")}</h3></div><Waves size={18} /></div>
            <div className="weather-info"><div className="sun-icon"><Sun size={22} /></div><div><strong>{t("takeItSlow")}</strong><span>{t("warmAfternoons")}</span></div></div>
            <div className="weather-note"><span>{t("localTip")}</span>{t("localTipBody")}</div>
          </section>

          <section className="highlights-section">
            <div className="section-title"><h3>{t("stoneTownHighlights")}</h3><span>{t("placesCount", { count: 3 })}</span></div>
            <button type="button" onClick={() => void sendMessage(t("houseOfWondersPrompt"))}><span className="highlight-number">01</span><span><strong>{t("houseOfWonders")}</strong><small>{t("seafrontLandmark")}</small></span><ArrowUpRight size={14} /></button>
            <button type="button" onClick={() => void sendMessage(t("oldFortPrompt"))}><span className="highlight-number">02</span><span><strong>{t("oldFort")}</strong><small>{t("oldFortSub")}</small></span><ArrowUpRight size={14} /></button>
            <button type="button" onClick={() => void sendMessage(t("forodhaniPrompt"))}><span className="highlight-number">03</span><span><strong>{t("forodhani")}</strong><small>{t("forodhaniSub")}</small></span><ArrowUpRight size={14} /></button>
          </section>
        </>}

        <div className="insights-footer"><span>{t("curatedJourney")}</span><span>01 <span className="footer-line" /> 04</span></div>
        {activeTab === "tools" && <div className="insights-content">
          <Tools />
        </div>}
        {activeTab === "bookings" && <div className="insights-content">
          <MyBookings />
        </div>}
      </aside>
    </div>
  );
}
