/** Localized display fields for catalog places (names / hours / price / description). */
export type LocationLocaleFields = {
  name?: string;
  description?: string;
  hours?: string;
  price?: string;
};

type Lang = "en" | "es" | "fr" | "de" | "zh" | "sw";

/** Per-location overrides. Missing languages fall back to the English catalog. */
export const LOCATION_I18N: Record<string, Partial<Record<Lang, LocationLocaleFields>>> = {
  "stone-town": {
    sw: {
      name: "Stone Town (UNESCO)",
      description: "Mji wa kihistoria wa biashara ya Waswahili — vichochoro, milango ya kuchonga, House of Wonders, na soko la usiku la Forodhani",
      hours: "Maeneo kawaida 09:00–17:00; masoko jioni",
      price: "Kutembelea bure; ada za makumbusho hutofautiana",
    },
  },
  nungwi: {
    sw: {
      name: "Ufuo wa Nungwi",
      description: "Ufuo maarufu wa pwani ya kaskazini — kuogelea, machweo ya jahazi, na ukanda wenye hoteli hai",
      hours: "Wazi kila siku; kuogelea bora wakati wa maji kujaa",
      price: "Ufuo bure; shughuli hulipwa tofauti",
    },
  },
  kendwa: {
    sw: {
      name: "Ufuo wa Kendwa",
      description: "Maji tulivu ya turquoise na mchanga mpana — jirani tulivu wa Nungwi, mzuri kwa kuogelea",
      hours: "Wazi kila siku",
      price: "Ufuo bure",
    },
  },
  "prison-island": {
    sw: {
      name: "Kisiwa cha Gereza (Changuu)",
      description: "Safari fupi ya boti kutoka Stone Town — kobe wakubwa, kupiga mbizi kwa snorkel, na magofu ya ukoloni",
      hours: "Ziara za siku 08:00–16:00",
      price: "Kuanzia $25 boti + ada ya kisiwa",
    },
  },
  jozani: {
    sw: {
      name: "Msitu wa Jozani",
      description: "Nyumbani kwa nyani wa kipekee wa colobus wekundu wa Zanzibar na njia za mikoko",
      hours: "07:30–17:00 kila siku",
      price: "Kuanzia $10 kuingia",
    },
  },
  "spice-tour": {
    sw: {
      name: "Ziara ya Viungo Kizimbani",
      description: "Tembea shambani kwa mikono — karafuu, mdalasini, kunguru, kuonja, na chaguo za chakula cha mchana",
      hours: "Ziara za asubuhi na alasiri",
      price: "Kuanzia $15–30 kwa mtu",
    },
  },
  paje: {
    sw: {
      name: "Ufuo wa Paje",
      description: "Kituo cha kitesurf pwani ya mashariki chenye mchanga mweupe mrefu na hisia ya kijiji",
      hours: "Wazi kila siku; upepo mkali Jun–Sep",
      price: "Ufuo bure; masomo ya kite huongezeka",
    },
  },
  mnemba: {
    sw: {
      name: "Atoli ya Mnemba",
      description: "Mwamba uliolindwa kaskazini-mashariki ya kisiwa — ziara za snorkel na kupiga mbizi",
      hours: "Kuondoka kwa boti asubuhi",
      price: "Kuanzia $60–100 ziara ya siku",
    },
  },
  "park-hyatt-znz": {
    sw: {
      name: "Park Hyatt Zanzibar",
      description: "Anasa ya ufukweni Stone Town yenye bwawa la infinity na spa",
      price: "Kuanzia $450/usiku",
    },
  },
  "emerson-spice": {
    sw: {
      name: "Emerson Spice",
      description: "Hoteli ndogo ya urithi katika jumba lililorekebishwa Stone Town yenye chakula juu ya paa",
      price: "Kuanzia $220/usiku",
    },
  },
  "nungwi-beach-resort": {
    sw: {
      name: "Nungwi Beach Resort",
      description: "Hoteli ya wastani ncha ya kaskazini — mabwawa, dawati la kupiga mbizi, na maoni ya machweo",
      price: "Kuanzia $140/usiku",
    },
  },
  "white-sand-paje": {
    sw: {
      name: "Zanzibar White Sand Luxury Villas",
      description: "Villa za hali ya juu pwani ya mashariki karibu na Paje — spa, mabwawa ya faragha, na ufikiaji wa kite",
      price: "Kuanzia $380/usiku",
    },
  },
  "mnazi-mmoja": {
    sw: {
      name: "Hospitali ya Mnazi Mmoja",
      description: "Hospitali kuu ya umma mjini Zanzibar — dharura na wagonjwa wa nje",
    },
  },
  "police-stone-town": {
    sw: {
      name: "Kituo cha Polisi Stone Town",
      description: "Polisi wa kati kwa eneo la utalii Stone Town — piga 112 kitaifa",
    },
  },
  "airport-medical": {
    sw: {
      name: "Huduma za Matibabu Uwanja wa Abeid Amani Karume",
      description: "Kituo cha huduma ya kwanza karibu na uwanja wa ndege ZNZ",
    },
  },
};

export function localizeLocation<T extends { id: string; name?: string; description?: string; hours?: string; price?: string }>(
  loc: T,
  language: string,
): T {
  if (!language || language === "en") return loc;
  const patch = LOCATION_I18N[loc.id]?.[language as Lang];
  if (!patch) return loc;
  return { ...loc, ...patch };
}
