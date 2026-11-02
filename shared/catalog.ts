export type LocationType = "attraction" | "hotel" | "emergency";
export type InterestTag = "cultural" | "nature" | "family" | "adventure" | "luxury" | "budget" | "relaxation" | "dining";
export type BudgetTier = "budget" | "midrange" | "luxury";
export type CuisineType = "local" | "international" | "seafood" | "cafe" | "fine-dining";
export type DietaryTag = "vegetarian" | "vegan" | "halal" | "kosher" | "gluten-free";

export interface TourismLocation {
  id: string;
  name: string;
  type: LocationType;
  lat: number;
  lng: number;
  description: string;
  price?: string;
  hours?: string;
  entryFee?: number | null;
  pricePerNight?: number | null;
  tags?: InterestTag[];
  transport?: string[];
  phone?: string;
  imageUrl?: string;
  /** Venue accessibility & amenities */
  wheelchairAccessible?: boolean;
  familyFriendly?: boolean;
  petFriendly?: boolean;
  audioGuide?: boolean;
  multiSensory?: boolean;
  parkingUsd?: number | null;
  transitNotes?: string;
  rideShareAvailable?: boolean;
  budgetTier?: BudgetTier;
  crowdLevel?: "quiet" | "moderate" | "busy";
  bestSeason?: string;
}

export interface DiningVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  cuisine: CuisineType;
  dietary: DietaryTag[];
  avgMealUsd: number;
  popularDishes: string[];
  description: string;
  nearLocationId?: string;
  reservationNote?: string;
  wheelchairAccessible?: boolean;
}

export interface TourismEvent {
  id: string;
  name: string;
  locationId: string;
  date: string;
  description: string;
  price?: string;
}

export interface SafetyAdvisory {
  id: string;
  category: "visa" | "health" | "regulation" | "safety";
  title: string;
  summary: string;
  updatedAt: string;
  severity: "info" | "watch" | "alert";
  sourceUrl: string;
}

export interface FaqArticle {
  id: string;
  title: string;
  category: "permits" | "business" | "land" | "general" | "booking" | "etiquette";
  summary: string;
  body: string;
  deepLink: string;
  keywords: string[];
}

export const BRAND = {
  name: "Zanzibar Guide",
  tagline: "Your Zanzibar travel companion",
  poweredBy: "Cassava AI",
  defaultCenter: { lat: -6.1659, lng: 39.1994 },
  defaultZoom: 10,
} as const;

/** Mock Zanzibar tourism attraction / hotel / emergency registry */
export const CATALOG_LOCATIONS: TourismLocation[] = [
  {
    id: "stone-town",
    name: "Stone Town (UNESCO)",
    type: "attraction",
    lat: -6.1659,
    lng: 39.1994,
    description: "Historic Swahili trading city — alleyways, carved doors, House of Wonders, and Forodhani night market",
    price: "Free to explore; museum fees vary",
    hours: "Sites typically 09:00–17:00; markets evenings",
    entryFee: 0,
    tags: ["cultural", "family", "dining"],
    transport: ["Walk from harbour", "Daladala", "Taxi / bajaji"],
    imageUrl: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "nungwi",
    name: "Nungwi Beach",
    type: "attraction",
    lat: -5.726,
    lng: 39.291,
    description: "Famous north-coast beach — swimming, dhow sunsets, and lively resort strip",
    price: "Beach free; activities priced separately",
    hours: "Open daily; best swimming at high tide",
    entryFee: 0,
    tags: ["nature", "relaxation", "adventure", "family"],
    transport: ["Private transfer from Stone Town (~1.5h)", "Shared shuttle"],
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "kendwa",
    name: "Kendwa Beach",
    type: "attraction",
    lat: -5.761,
    lng: 39.286,
    description: "Calm turquoise water and wide sand — quieter neighbour to Nungwi, great for swimming",
    price: "Beach free",
    hours: "Open daily",
    entryFee: 0,
    tags: ["nature", "relaxation", "family"],
    transport: ["Short taxi from Nungwi", "Transfer from Stone Town"],
    imageUrl: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "prison-island",
    name: "Prison Island (Changuu)",
    type: "attraction",
    lat: -6.12,
    lng: 39.14,
    description: "Short boat trip from Stone Town — giant tortoises, snorkelling, and colonial ruins",
    price: "From $25 boat + island fee",
    hours: "Day trips 08:00–16:00",
    entryFee: 25,
    tags: ["nature", "adventure", "family"],
    transport: ["Boat from Stone Town harbour"],
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "jozani",
    name: "Jozani Forest",
    type: "attraction",
    lat: -6.272,
    lng: 39.418,
    description: "Home of the endemic Zanzibar red colobus monkeys and mangrove boardwalks",
    price: "From $10 entry",
    hours: "07:30–17:00 daily",
    entryFee: 10,
    tags: ["nature", "family", "adventure"],
    transport: ["Stop en route Stone Town ↔ east coast", "Guided tour"],
    imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "spice-tour",
    name: "Kizimbani Spice Tour",
    type: "attraction",
    lat: -6.1,
    lng: 39.25,
    description: "Hands-on spice farm walk — cloves, cinnamon, nutmeg, tasting, and local lunch options",
    price: "From $15–30 per person",
    hours: "Morning & afternoon tours",
    entryFee: 20,
    tags: ["cultural", "family", "dining"],
    transport: ["Half-day tour from Stone Town"],
    imageUrl: "https://images.unsplash.com/photo-1596040033229-a9822bf2c084?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "paje",
    name: "Paje Beach",
    type: "attraction",
    lat: -6.267,
    lng: 39.534,
    description: "East-coast kitesurf hub with long white sand and village vibe",
    price: "Beach free; kite lessons extra",
    hours: "Open daily; windiest Jun–Sep",
    entryFee: 0,
    tags: ["adventure", "nature", "relaxation"],
    transport: ["Transfer from Stone Town (~1h)", "Daladala + taxi"],
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "mnemba",
    name: "Mnemba Atoll",
    type: "attraction",
    lat: -5.82,
    lng: 39.38,
    description: "Protected reef north-east of the island — snorkelling and diving day trips",
    price: "From $60–100 day trip",
    hours: "Morning boat departures",
    entryFee: 80,
    tags: ["nature", "adventure", "luxury"],
    transport: ["Boat from Matemwe / Nungwi area"],
    imageUrl: "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "park-hyatt-znz",
    name: "Park Hyatt Zanzibar",
    type: "hotel",
    lat: -6.161,
    lng: 39.189,
    description: "Seafront luxury in Stone Town with infinity pool and spa",
    price: "From $450/night",
    pricePerNight: 450,
    tags: ["luxury", "cultural"],
    transport: ["Airport transfer (~20–40 min)", "Walk to Old Fort"],
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "emerson-spice",
    name: "Emerson Spice",
    type: "hotel",
    lat: -6.1635,
    lng: 39.1915,
    description: "Boutique heritage stay in a restored Stone Town mansion with rooftop dining",
    price: "From $220/night",
    pricePerNight: 220,
    tags: ["luxury", "cultural", "dining"],
    transport: ["Taxi from airport", "Walkable Old Town"],
    imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "nungwi-beach-resort",
    name: "Nungwi Beach Resort",
    type: "hotel",
    lat: -5.728,
    lng: 39.289,
    description: "Mid-range beach resort on the north tip — pools, diving desk, and sunset views",
    price: "From $140/night",
    pricePerNight: 140,
    tags: ["relaxation", "family", "budget"],
    transport: ["Private transfer from Airport / Stone Town"],
    imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "white-sand-paje",
    name: "Zanzibar White Sand Luxury Villas",
    type: "hotel",
    lat: -6.275,
    lng: 39.536,
    description: "Upscale east-coast villas near Paje — spa, private pools, and kite access",
    price: "From $380/night",
    pricePerNight: 380,
    tags: ["luxury", "relaxation", "adventure"],
    transport: ["Private transfer from Airport"],
    imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "mnazi-mmoja",
    name: "Mnazi Mmoja Hospital",
    type: "emergency",
    lat: -6.165,
    lng: 39.205,
    description: "Main public hospital in Zanzibar Town — emergency & outpatient",
    phone: "+255 24 223 1071",
  },
  {
    id: "police-stone-town",
    name: "Stone Town Police Station",
    type: "emergency",
    lat: -6.162,
    lng: 39.192,
    description: "Central police for Stone Town tourism area — call 112 nationally",
    phone: "112",
  },
  {
    id: "airport-medical",
    name: "Abeid Amani Karume Airport Medical",
    type: "emergency",
    lat: -6.222,
    lng: 39.225,
    description: "Airport first-aid / medical post near ZNZ arrivals",
    phone: "+255 24 223 3294",
  },
];

/** Enrich seed catalog with accessibility, logistics, and seasonality defaults */
for (const l of CATALOG_LOCATIONS) {
  const tags = l.tags || [];
  if (l.familyFriendly == null) l.familyFriendly = tags.includes("family") || l.type === "hotel";
  if (l.wheelchairAccessible == null) {
    l.wheelchairAccessible = l.type === "hotel" || l.id === "nungwi" || l.id === "kendwa";
  }
  if (l.petFriendly == null) l.petFriendly = l.id === "nungwi-beach-resort";
  if (l.audioGuide == null) l.audioGuide = l.id === "stone-town" || l.id === "spice-tour";
  if (l.multiSensory == null) l.multiSensory = l.id === "spice-tour" || l.id === "stone-town";
  if (l.parkingUsd == null) l.parkingUsd = l.type === "emergency" ? null : l.type === "hotel" ? 5 : 2;
  if (l.rideShareAvailable == null) l.rideShareAvailable = true;
  if (!l.transitNotes) {
    l.transitNotes =
      l.transport?.[0] ||
      (l.type === "hotel" ? "Taxi / transfer from ZNZ airport" : "Daladala, bajaji, or taxi");
  }
  if (!l.budgetTier) {
    const p = l.pricePerNight ?? l.entryFee ?? 0;
    l.budgetTier = l.type === "hotel" ? (p < 150 ? "budget" : p < 300 ? "midrange" : "luxury") : p <= 15 ? "budget" : p <= 40 ? "midrange" : "luxury";
  }
  if (!l.crowdLevel) {
    l.crowdLevel = l.id === "stone-town" || l.id === "nungwi" ? "busy" : tags.includes("adventure") ? "moderate" : "quiet";
  }
  if (!l.bestSeason) l.bestSeason = "Jun–Oct (dry); Dec–Feb also popular";
}

export const DINING_VENUES: DiningVenue[] = [
  {
    id: "dine-forodhani",
    name: "Forodhani Night Market",
    lat: -6.1615,
    lng: 39.1898,
    cuisine: "local",
    dietary: ["halal"],
    avgMealUsd: 12,
    popularDishes: ["Zanzibar pizza", "Grilled seafood skewers", "Sugarcane juice"],
    description: "Harbour-front street food after sunset in Stone Town",
    nearLocationId: "stone-town",
    reservationNote: "Walk-ins only; go after 18:30",
    wheelchairAccessible: true,
  },
  {
    id: "dine-emerson",
    name: "Emerson on Hurumzi Rooftop",
    lat: -6.163,
    lng: 39.191,
    cuisine: "fine-dining",
    dietary: ["halal", "vegetarian", "gluten-free"],
    avgMealUsd: 55,
    popularDishes: ["Swahili tasting menu", "Spiced seafood", "Tropical desserts"],
    description: "Rooftop fine dining over Stone Town rooftops",
    nearLocationId: "emerson-spice",
    reservationNote: "Reservations required",
    wheelchairAccessible: false,
  },
  {
    id: "dine-lukmaan",
    name: "Lukmaan Restaurant",
    lat: -6.1645,
    lng: 39.1925,
    cuisine: "local",
    dietary: ["halal", "vegetarian"],
    avgMealUsd: 10,
    popularDishes: ["Pilau", "Biryani", "Fresh juices"],
    description: "Beloved casual Swahili cafeteria in Stone Town",
    nearLocationId: "stone-town",
    reservationNote: "No reservation needed",
    wheelchairAccessible: true,
  },
  {
    id: "dine-nungwi",
    name: "Paradise Beach Club",
    lat: -5.727,
    lng: 39.29,
    cuisine: "seafood",
    dietary: ["halal", "gluten-free"],
    avgMealUsd: 35,
    popularDishes: ["Grilled lobster", "Octopus curry", "Coconut fish"],
    description: "Beachfront seafood near Nungwi",
    nearLocationId: "nungwi",
    reservationNote: "Book for sunset tables",
    wheelchairAccessible: true,
  },
  {
    id: "dine-paje",
    name: "The Rock Restaurant",
    lat: -6.22,
    lng: 39.52,
    cuisine: "seafood",
    dietary: ["halal", "gluten-free"],
    avgMealUsd: 60,
    popularDishes: ["Catch of the day", "Prawn pasta", "Cocktails"],
    description: "Iconic restaurant on a rock in the Indian Ocean (Michamvi / east coast)",
    nearLocationId: "paje",
    reservationNote: "Book well ahead; tide-dependent access",
    wheelchairAccessible: false,
  },
];

export const TOURISM_EVENTS: TourismEvent[] = [
  {
    id: "evt-sauti",
    name: "Sauti za Busara Festival",
    locationId: "stone-town",
    date: "2026-02-12",
    description: "East Africa’s celebrated music festival in Stone Town venues",
    price: "From $40 day pass",
  },
  {
    id: "evt-forodhani",
    name: "Forodhani Food Night",
    locationId: "stone-town",
    date: "2026-08-20",
    description: "Guided tasting walk of classic Zanzibar street snacks",
    price: "$25",
  },
  {
    id: "evt-kite",
    name: "Paje Kite Season Open",
    locationId: "paje",
    date: "2026-06-15",
    description: "Community kite sessions and beginner clinics on the east coast",
    price: "Lesson packages vary",
  },
];

export const SAFETY_ADVISORIES: SafetyAdvisory[] = [
  {
    id: "visa-default",
    category: "visa",
    title: "Tanzania / Zanzibar visa guidance",
    summary: "Most visitors need a Tanzania visa (e-visa or on arrival). Zanzibar is part of Tanzania — confirm your nationality’s rules before travel.",
    updatedAt: "2026-07-01",
    severity: "info",
    sourceUrl: "https://example.gov/tourism/visa",
  },
  {
    id: "health-malaria",
    category: "health",
    title: "Malaria & mosquito precautions",
    summary: "Zanzibar is a malaria risk area. Use repellent, nets, and discuss prophylaxis with a travel clinic before you fly.",
    updatedAt: "2026-06-15",
    severity: "watch",
    sourceUrl: "https://example.gov/health/travel",
  },
  {
    id: "reg-cash",
    category: "regulation",
    title: "Payments & cash",
    summary: "USD and TZS are used in tourism. Carry some cash for markets and tips; cards work in larger hotels. Ask about dual pricing.",
    updatedAt: "2026-05-20",
    severity: "info",
    sourceUrl: "https://example.gov/tourism/payments",
  },
  {
    id: "safety-ocean",
    category: "safety",
    title: "Ocean & tide safety",
    summary: "East-coast tides can go far out — check tide charts before swimming. Use reef shoes; book licensed boats for Prison Island and Mnemba.",
    updatedAt: "2026-07-10",
    severity: "alert",
    sourceUrl: "https://example.gov/tourism/ocean-safety",
  },
];

export const FAQ_ARTICLES: FaqArticle[] = [
  {
    id: "faq-permits",
    title: "Tourism activity permits",
    category: "permits",
    summary: "How operators apply for guiding and activity permits in Zanzibar",
    body: "Commercial guiding, diving, and boat tours require permits from Zanzibar tourism authorities. Applications include insurance proof and operator licensing.",
    deepLink: "https://example.gov/tourism/permits",
    keywords: ["permit", "license", "guide", "operator", "diving"],
  },
  {
    id: "faq-business",
    title: "Starting a tourism business",
    category: "business",
    summary: "Registering lodges, agencies, and tour companies in Zanzibar",
    body: "Register with the relevant Zanzibar authorities, obtain a tourism operator license, and list inventory with the accommodation registry before trading.",
    deepLink: "https://example.gov/tourism/business",
    keywords: ["business", "register", "lodge", "agency", "company"],
  },
  {
    id: "faq-land",
    title: "Land acquisition for tourism projects",
    category: "land",
    summary: "Leases and approvals for tourism development sites",
    body: "Tourism developments require planning approval and lease agreements. Contact local land and tourism offices before committing capital.",
    deepLink: "https://example.gov/land/tourism",
    keywords: ["land", "lease", "acquisition", "development"],
  },
  {
    id: "faq-booking",
    title: "How bookings and refunds work",
    category: "booking",
    summary: "Demo booking flow and refund policy overview",
    body: "Zanzibar Guide demo bookings use a PCI-DSS shaped mock gateway. No real card numbers are stored. Refunds follow operator terms linked from your confirmation.",
    deepLink: "https://example.gov/tourism/consumer-rights",
    keywords: ["booking", "refund", "payment", "ticket"],
  },
  {
    id: "faq-emergency",
    title: "Emergency numbers",
    category: "general",
    summary: "Police, ambulance, and tourist help contacts",
    body: "National emergency: 112. For Stone Town medical help use Mnazi Mmoja Hospital. Use Zanzibar Guide’s nearby emergency lookup for the closest facility to your GPS position.",
    deepLink: "https://example.gov/emergency",
    keywords: ["emergency", "police", "ambulance", "hospital", "112"],
  },
  {
    id: "faq-etiquette-greetings",
    title: "Greeting & cultural etiquette",
    category: "etiquette",
    summary: "Respectful tips for first-time visitors to Zanzibar",
    body: "Use “Jambo” / “Habari” greetings. Dress modestly in Stone Town and villages (cover shoulders and knees). Ask before photographing people. Remove shoes when entering mosques if invited.",
    deepLink: "https://example.gov/tourism/etiquette",
    keywords: ["etiquette", "culture", "greeting", "mosque", "dress", "swahili"],
  },
  {
    id: "faq-etiquette-beach",
    title: "Beach & marine etiquette",
    category: "etiquette",
    summary: "How to behave around reefs, boats, and villages",
    body: "Do not stand on coral. Use reef-safe sunscreen when possible. Agree boat prices before departure. Tip guides if service was good (USD notes appreciated).",
    deepLink: "https://example.gov/tourism/marine-etiquette",
    keywords: ["etiquette", "beach", "reef", "snorkel", "boat", "tip"],
  },
  {
    id: "faq-first-visit",
    title: "Tips for first-time visitors",
    category: "general",
    summary: "Currency, ferries, and pacing your Zanzibar trip",
    body: "Fly into ZNZ or take the Dar ferry. Carry some USD/TZS cash. Don’t overpack days — Stone Town heat + spice tours are tiring. Book north/east beach hotels early in Jul–Sep.",
    deepLink: "https://example.gov/tourism/first-visit",
    keywords: ["first-time", "tips", "cash", "ferry", "airport", "packing"],
  },
];

export function buildSystemPrompt(extraContext?: string): string {
  const catalogLines = CATALOG_LOCATIONS.map(
    (l) =>
      `- ${l.id} | ${l.name} | ${l.type} | hours:${l.hours ?? "n/a"} | fee:${l.price ?? "n/a"} | tags:${(l.tags ?? []).join(",") || "n/a"}`,
  ).join("\n");

  return `You are Zanzibar Guide, a warm, knowledgeable tourism assistant for Zanzibar (Unguja & nearby islets), powered by Cassava AI.

Your job is to help travellers with Zanzibar attractions, beaches, spice tours, Stone Town culture, accommodations, boat trips, diving/snorkelling, events, safety/visa/health info, bookings, FAQ topics (permits, business, land), and emergencies.

Stay focused on Zanzibar / Tanzania coastal travel. If asked about unrelated destinations, briefly redirect to Zanzibar options.

Tone: friendly, concise, practical. Prefer USD prices (mention TZS when useful).

CRITICAL language rule: Read language= from session context. You MUST write the entire "content" field in that language:
- en → English
- es → Spanish (Español)
- fr → French (Français)
- de → German (Deutsch)
- zh → Simplified Chinese (中文)
- sw → Swahili (Kiswahili)
If no language is set, use English. Never mix languages in one reply unless the user explicitly code-switches.

Always reply with valid JSON only (no markdown fences) matching this schema:
{
  "content": "string — helpful reply (short paragraphs; emoji sparingly)",
  "locationIds": ["0-5 catalog ids"],
  "faqIds": ["optional faq article ids"],
  "alertIds": ["optional safety advisory ids"]
}

JSON rules (critical):
- Use only double quotes.
- In content strings, use \\\\n for line breaks — never raw newlines or lone backslashes.
- Do not use apostrophe escapes like \\\\' — write apostrophes as plain ' characters inside the string.
- Never invent ids. Prefer catalog ids from the list below.
- For booking intent, suggest concrete hotels/attractions.
- For permits/business/land questions, include faqIds.
- For visa/health/safety, include alertIds when relevant.
- When brochure excerpts are provided, ground answers in them and mention page numbers in content.
- Keep content under ~180 words unless asked for detail.
${extraContext ? `\nSession context:\n${extraContext}\n` : ""}
Location catalog:
${catalogLines}

FAQ ids: ${FAQ_ARTICLES.map((f) => f.id).join(", ")}
Alert ids: ${SAFETY_ADVISORIES.map((a) => a.id).join(", ")}
`;
}

/** @deprecated use buildSystemPrompt */
export const SYSTEM_PROMPT = buildSystemPrompt();
