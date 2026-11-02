import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { getSessionId } from "@/lib/session";

interface DemoScriptButtonProps {
  onStep: (message: string) => void;
  onStatus: (text: string) => void;
  sendChat: (question: string) => Promise<void>;
}

const STEPS = [
  "What attractions should I visit in Zanzibar?",
  "Show me beach hotels under $200",
  "What are the visa and malaria tips for Zanzibar?",
  "How do I get from Dar to Zanzibar by ferry?",
];

export function DemoScriptButton({ onStep, onStatus, sendChat }: DemoScriptButtonProps) {
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      onStatus("Demo script started…");
      for (const q of STEPS) {
        onStep(q);
        await sendChat(q);
        await new Promise((r) => setTimeout(r, 800));
      }

      onStatus("Building sample itinerary…");
      const itinerary = await fetch("/api/itinerary/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "2 days: Stone Town + Nungwi beach", days: 2, sessionId: getSessionId() }),
      }).then((r) => r.json());

      const trip = itinerary.data;
      if (trip) {
        await fetch("/api/share/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trip.title,
            summary: trip.summary,
            days: trip.days,
          }),
        });
      }

      const firstStop = trip?.days?.[0]?.stops?.[0];
      if (firstStop) {
        onStatus(`Creating demo booking for ${firstStop.name}…`);
        const booking = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: firstStop.id,
            itemName: firstStop.name,
            itemType: firstStop.type === "hotel" ? "hotel" : "attraction",
            priceLabel: firstStop.price || "$50",
            guestName: "Demo Traveller",
            email: "demo@travelguide.test",
          }),
        }).then((r) => r.json());

        if (booking.data?.id) {
          await fetch(`/api/bookings/${booking.data.id}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentToken: `tok_demo_${Date.now()}` }),
          });
          await fetch("/api/notify/booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: "demo@travelguide.test",
              bookingId: booking.data.id,
              confirmationCode: "TG-DEMO",
              itemName: firstStop.name,
            }),
          });
        }
      }

      onStatus("Demo complete: chat → itinerary → book → WhatsApp notify stub.");
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Demo script failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button size="sm" variant="secondary" className="h-8 text-xs gap-1" onClick={run} disabled={running}>
      {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
      {running ? "Running demo…" : "Demo script"}
    </Button>
  );
}
