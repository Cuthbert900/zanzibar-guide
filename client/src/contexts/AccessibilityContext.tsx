import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface A11yState {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  setLargeText: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
}

const KEY = "travelguide_a11y";
const A11yContext = createContext<A11yState | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<A11yState>;
        if (parsed.largeText) setLargeText(true);
        if (parsed.highContrast) setHighContrast(true);
        if (parsed.reduceMotion) setReduceMotion(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("a11y-large-text", largeText);
    root.classList.toggle("a11y-high-contrast", highContrast);
    root.classList.toggle("a11y-reduce-motion", reduceMotion);
    localStorage.setItem(KEY, JSON.stringify({ largeText, highContrast, reduceMotion }));
  }, [largeText, highContrast, reduceMotion]);

  return (
    <A11yContext.Provider
      value={{ largeText, highContrast, reduceMotion, setLargeText, setHighContrast, setReduceMotion }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useAccessibility requires AccessibilityProvider");
  return ctx;
}
