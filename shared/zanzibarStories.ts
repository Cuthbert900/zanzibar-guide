/** Curated Zanzibar heritage stories for the Digital Storyteller (lite). */
export interface HeritageStoryScene {
  scene: number;
  title: string;
  narration: string;
  visualHint: string;
}

export interface HeritageStory {
  locationId: string;
  title: string;
  tagline: string;
  durationSec: number;
  scenes: HeritageStoryScene[];
  tips: string[];
}

export const HERITAGE_STORIES: HeritageStory[] = [
  {
    locationId: "stone-town",
    title: "Stone Town: Crossroads of the Indian Ocean",
    tagline: "Carved doors, spice traders, and Swahili streets",
    durationSec: 90,
    scenes: [
      {
        scene: 1,
        title: "Harbour light",
        narration:
          "From the harbour, Stone Town rises in coral stone and teak — a living Swahili city shaped by centuries of trade.",
        visualHint: "Aerial harbour and Forodhani waterfront at golden hour",
      },
      {
        scene: 2,
        title: "Carved doors",
        narration:
          "Heavy wooden doors with brass studs tell family stories. Each carving marks status, protection, and welcome.",
        visualHint: "Close-up of ornate Zanzibar door in a narrow alley",
      },
      {
        scene: 3,
        title: "House of Wonders era",
        narration:
          "Along the waterfront, grand façades recall sultans and steamships when Zanzibar was a gateway to East Africa.",
        visualHint: "Waterfront colonial façades and Old Fort walls",
      },
      {
        scene: 4,
        title: "Forodhani night",
        narration:
          "At dusk, Forodhani market fills with smoke and laughter — Zanzibar pizza, seafood skewers, and sugarcane juice.",
        visualHint: "Night food stalls along the sea wall",
      },
      {
        scene: 5,
        title: "Living culture",
        narration:
          "Mosques call across rooftops. Dress modestly, greet with Jambo, and let the alleys lead you slowly.",
        visualHint: "Rooftop view over Stone Town minarets",
      },
    ],
    tips: ["Wear modest clothing in town", "Best light early morning", "Try Forodhani after 18:30"],
  },
  {
    locationId: "spice-tour",
    title: "The Spice Islands Story",
    tagline: "Cloves, cinnamon, and the scent of history",
    durationSec: 75,
    scenes: [
      {
        scene: 1,
        title: "Why spices",
        narration:
          "Zanzibar’s wealth once rode on cloves and cinnamon — fragrant cargo that drew dhows across the monsoon winds.",
        visualHint: "Spice baskets and drying cloves in the sun",
      },
      {
        scene: 2,
        title: "Farm walk",
        narration:
          "On a Kizimbani farm tour, guides crush leaves and peel bark so you taste the island’s living economy.",
        visualHint: "Guide showing cinnamon bark and nutmeg",
      },
      {
        scene: 3,
        title: "Taste & trade",
        narration:
          "Take home a small spice box — and remember the farmers whose knowledge keeps the Spice Islands famous.",
        visualHint: "Travellers tasting fresh tropical fruit on the farm",
      },
    ],
    tips: ["Morning tours are cooler", "Bring cash for farm purchases", "Combine with Jozani the same day"],
  },
  {
    locationId: "jozani",
    title: "Jozani: Home of the Red Colobus",
    tagline: "A rare forest on a coral island",
    durationSec: 70,
    scenes: [
      {
        scene: 1,
        title: "Enter the forest",
        narration:
          "South of Stone Town, Jozani’s canopy shelters the endemic Zanzibar red colobus — found nowhere else on Earth.",
        visualHint: "Forest path with red colobus in the trees",
      },
      {
        scene: 2,
        title: "Mangrove walk",
        narration:
          "A boardwalk leads into mangroves where crabs skitter and roots breathe with the tide.",
        visualHint: "Mangrove boardwalk at low tide",
      },
      {
        scene: 3,
        title: "Respect wildlife",
        narration:
          "Keep voices soft, follow your guide, and never feed the monkeys — their forest depends on careful visitors.",
        visualHint: "Guide pointing to colobus with visitors watching quietly",
      },
    ],
    tips: ["Arrive early for active monkeys", "Wear closed shoes", "Insect repellent recommended"],
  },
  {
    locationId: "prison-island",
    title: "Prison Island & Giant Tortoises",
    tagline: "A short boat ride into colonial memory",
    durationSec: 65,
    scenes: [
      {
        scene: 1,
        title: "Across the channel",
        narration:
          "A brief boat from Stone Town reaches Changuu — Prison Island — where turquoise water meets coral shores.",
        visualHint: "Dhow approaching a small green island",
      },
      {
        scene: 2,
        title: "Tortoises",
        narration:
          "Aldabra giant tortoises roam the grounds, living links to island conservation and visitor wonder.",
        visualHint: "Giant tortoise on grassy path",
      },
      {
        scene: 3,
        title: "Snorkel pause",
        narration:
          "After the ruins, snorkel the shallows — then return before afternoon winds pick up on the channel.",
        visualHint: "Snorkellers near clear reef shallows",
      },
    ],
    tips: ["Book a licensed boat", "Bring reef shoes", "Sun protection essential"],
  },
  {
    locationId: "nungwi",
    title: "Nungwi: Where the Sun Sets into the Sea",
    tagline: "North-coast beaches and dhow silhouettes",
    durationSec: 60,
    scenes: [
      {
        scene: 1,
        title: "North tip",
        narration:
          "At Zanzibar’s northern tip, Nungwi’s sand meets deep blue water — a classic Indian Ocean beach escape.",
        visualHint: "Wide beach with turquoise water and palms",
      },
      {
        scene: 2,
        title: "Dhow sunset",
        narration:
          "As day fades, wooden dhows cut the horizon. Swim at high tide, then watch the sky turn copper and rose.",
        visualHint: "Dhow silhouette at sunset",
      },
    ],
    tips: ["Check tide charts for swimming", "Kendwa is calmer nearby", "Book diving with licensed centres"],
  },
  {
    locationId: "paje",
    title: "Paje: Wind, Kite & East Coast Light",
    tagline: "Where trade winds power the kites",
    durationSec: 55,
    scenes: [
      {
        scene: 1,
        title: "East coast breeze",
        narration:
          "Paje’s long white beach faces the open ocean. From June to September, kites fill the sky.",
        visualHint: "Kitesurfers on a wide white beach",
      },
      {
        scene: 2,
        title: "Village rhythm",
        narration:
          "Between sessions, village life continues — respect local dress away from resort strips and ask before photos.",
        visualHint: "Quiet village lane near the beach",
      },
    ],
    tips: ["Tide goes far out — plan swim times", "Beginner kite schools available", "Combine with The Rock restaurant nearby"],
  },
];

export function getStoryByLocationId(id: string): HeritageStory | undefined {
  return HERITAGE_STORIES.find((s) => s.locationId === id);
}
