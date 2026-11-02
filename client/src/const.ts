export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Wikimedia Commons photos. Their CC BY licences require the credit to be shown wherever they are used.
export interface CreditedPhoto {
  src: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

export const STONE_TOWN_PHOTO: CreditedPhoto = {
  src: "/images/stone-town-harbour.jpg",
  author: "Dr. Ondřej Havelka",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Harbour_at_the_picturesque_Stone_Town.jpg",
};

export const BEACH_PHOTO: CreditedPhoto = {
  src: "/images/zanzibar-beach.jpg",
  author: "The Erica Chang",
  license: "CC BY 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Zanzibar,_Tanzania_-_panoramio_(2).jpg",
};

export const AERIAL_PHOTO: CreditedPhoto = {
  src: "/images/zanzibar-aerial.jpg",
  author: "David Berkowitz",
  license: "CC BY 2.0",
  licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Unguja_island_from_Air.jpg",
};
