/** Arrival logistics for Zanzibar — ferry, airport, transfers (demo data). */
export interface LogisticsOption {
  id: string;
  kind: "ferry" | "flight" | "transfer" | "sim";
  name: string;
  from: string;
  to: string;
  duration: string;
  priceUsd: number;
  priceLabel: string;
  notes: string;
  bookable: boolean;
}

export const ARRIVAL_OPTIONS: LogisticsOption[] = [
  {
    id: "ferry-azam",
    kind: "ferry",
    name: "Azam Marine ferry (demo)",
    from: "Dar es Salaam",
    to: "Zanzibar (Malindi)",
    duration: "1.5–2 hours",
    priceUsd: 35,
    priceLabel: "From $35",
    notes: "Fast ferry; arrive early for tickets. Seas can be choppy in windy season.",
    bookable: true,
  },
  {
    id: "ferry-kilimanjaro",
    kind: "ferry",
    name: "Kilimanjaro / Coastal ferry (demo)",
    from: "Dar es Salaam",
    to: "Zanzibar (Malindi)",
    duration: "2–2.5 hours",
    priceUsd: 30,
    priceLabel: "From $30",
    notes: "Multiple daily sailings. Confirm return seats in peak season.",
    bookable: true,
  },
  {
    id: "flight-znz",
    kind: "flight",
    name: "Flight into ZNZ (Abeid Amani Karume)",
    from: "Dar / regional hubs",
    to: "Zanzibar Airport (ZNZ)",
    duration: "20–30 min from DAR",
    priceUsd: 80,
    priceLabel: "From ~$80 DAR–ZNZ",
    notes: "Fastest arrival. Pre-book airport transfer to Stone Town or beaches.",
    bookable: false,
  },
  {
    id: "transfer-stone",
    kind: "transfer",
    name: "Private airport → Stone Town transfer",
    from: "ZNZ Airport",
    to: "Stone Town",
    duration: "20–40 minutes",
    priceUsd: 25,
    priceLabel: "From $25",
    notes: "Private taxi/van. Agree price before departure or book via hotel.",
    bookable: true,
  },
  {
    id: "transfer-nungwi",
    kind: "transfer",
    name: "Private airport → Nungwi transfer",
    from: "ZNZ Airport",
    to: "Nungwi / Kendwa",
    duration: "1–1.5 hours",
    priceUsd: 55,
    priceLabel: "From $55",
    notes: "Shared shuttles cheaper; private better with luggage or late arrival.",
    bookable: true,
  },
  {
    id: "sim-local",
    kind: "sim",
    name: "Local SIM / eSIM tip",
    from: "Airport or Stone Town",
    to: "Island-wide data",
    duration: "15 minutes",
    priceUsd: 10,
    priceLabel: "From ~$10",
    notes: "Bring passport for SIM registration. Helpful for maps and ride apps.",
    bookable: false,
  },
];

export const ARRIVAL_CHECKLIST = [
  "Valid Tanzania visa / e-visa (Zanzibar is part of Tanzania)",
  "Yellow fever certificate if arriving from a risk country",
  "Malaria prophylaxis discussion with a travel clinic",
  "USD/TZS cash for ferries, tips, and markets",
  "Modest clothing for Stone Town and villages",
];
