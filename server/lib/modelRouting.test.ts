import { describe, expect, it } from "vitest";
import { activeModelTraffic, selectModelProvider, withModelTraffic, type ModelTraffic } from "./modelRouting";

const balancedTraffic: ModelTraffic = { openai: 0, gemini: 0 };
const bothProviders = ["openai", "gemini"] as const;

describe("selectModelProvider", () => {
  it("prefers Gemini for a simple query when traffic is balanced", () => {
    expect(selectModelProvider("What time does the museum open?", bothProviders, balancedTraffic)).toBe("gemini");
  });

  it("prefers OpenAI for a complex query when traffic is balanced", () => {
    expect(
      selectModelProvider("Plan a detailed five-day itinerary with a daily budget and transport options.", bothProviders, balancedTraffic),
    ).toBe("openai");
  });

  it("routes to the less busy provider when traffic is uneven", () => {
    expect(
      selectModelProvider("Plan a detailed itinerary", bothProviders, { openai: 3, gemini: 1 }),
    ).toBe("gemini");
  });

  it("uses the only provider with a configured key", () => {
    expect(selectModelProvider("Plan a detailed itinerary", ["gemini"], balancedTraffic)).toBe("gemini");
  });

  it("returns null when no hosted provider is configured", () => {
    expect(selectModelProvider("Hello", [], balancedTraffic)).toBeNull();
  });

  it("tracks active requests and clears the count after completion", async () => {
    let finishRequest!: () => void;
    const request = withModelTraffic(
      "openai",
      () => new Promise<void>((resolve) => (finishRequest = resolve)),
    );

    expect(activeModelTraffic.openai).toBe(1);
    finishRequest();
    await request;
    expect(activeModelTraffic.openai).toBe(0);
  });
});