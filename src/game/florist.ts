// Bouquet ingredients, finishing choices and rules shared by the shop and save.
import { spend } from "./wallet.ts";

export const STEMS = {
  rose: { name: "Rose", price: 7, color: "pink", hex: "#e8557f" },
  tulip: { name: "Tulip", price: 6, color: "pink", hex: "#ff9fc0" },
  sunflower: { name: "Sunflower", price: 7, color: "yellow", hex: "#ffc928" },
  peony: { name: "Peony", price: 9, color: "pink", hex: "#f7b6cf" },
  lily: { name: "Lily", price: 8, color: "white", hex: "#fff3e6" },
  daisy: { name: "Daisy", price: 5, color: "white", hex: "#fbfbf2" },
  "babys-breath": {
    name: "Baby's breath",
    price: 4,
    color: "white",
    hex: "#f4f0ff",
  },
  eucalyptus: { name: "Eucalyptus", price: 4, color: "green", hex: "#8fb8a0" },
} as const;
export const MIN_STEMS = 3;
export const MAX_STEMS = 12;
export type Stem = keyof typeof STEMS;
export const WRAPS = ["kraft", "cream", "pink"] as const;
export const RIBBONS = ["pink", "white", "green"] as const;
/** Paper and ribbon colors for drawing the bouquet. */
export const WRAP_HEX = {
  kraft: "#c9a37a",
  cream: "#f6ecd9",
  pink: "#f3b9cf",
} as const;
export const RIBBON_HEX = {
  pink: "#ff5d9f",
  white: "#ffffff",
  green: "#5fa36e",
} as const;
export type Bouquet = {
  stems: Stem[];
  wrap: (typeof WRAPS)[number];
  ribbon: (typeof RIBBONS)[number];
};

function isStem(value: unknown): value is Stem {
  return typeof value === "string" && Object.hasOwn(STEMS, value);
}

export function validateBouquet(value: unknown): value is Bouquet {
  if (typeof value !== "object" || value === null) return false;
  const fields = new Map(Object.entries(value));
  const stems = fields.get("stems");
  return (
    Array.isArray(stems) &&
    stems.length >= MIN_STEMS &&
    stems.length <= MAX_STEMS &&
    Array.from(stems).every(isStem) &&
    WRAPS.some((v) => v === fields.get("wrap")) &&
    RIBBONS.some((v) => v === fields.get("ribbon"))
  );
}

export function bouquetPrice(bouquet: Bouquet): number {
  return bouquet.stems.reduce((sum, stem) => sum + STEMS[stem].price, 0);
}

export function harmonyScore(bouquet: Bouquet): number {
  return (
    new Set(bouquet.stems).size +
    new Set(bouquet.stems.map((stem) => STEMS[stem].color)).size
  );
}

/** An empty bouquet to build on at the counter. */
export function emptyBouquet(): Bouquet {
  return { stems: [], wrap: "kraft", ribbon: "pink" };
}

/** The bouquet with one more stem, unchanged once it holds MAX_STEMS. */
export function addStem(bouquet: Bouquet, stem: Stem): Bouquet {
  if (bouquet.stems.length >= MAX_STEMS) return bouquet;
  return { ...bouquet, stems: [...bouquet.stems, stem] };
}

/** The bouquet without its last stem. */
export function removeLastStem(bouquet: Bouquet): Bouquet {
  return { ...bouquet, stems: bouquet.stems.slice(0, -1) };
}

/** A short verdict on the arrangement: variety and a mix of colors score higher. */
export function harmonyLabel(bouquet: Bouquet): string {
  const score = harmonyScore(bouquet);
  if (score >= 8) return "A showstopper";
  if (score >= 6) return "Lovely mix";
  if (score >= 4) return "Sweet and simple";
  return "Just getting started";
}

/**
 * Pays for a finished bouquet: the new balance, or null when the bouquet is
 * incomplete or the wallet cannot cover it.
 */
export function buyBouquet(coins: number, bouquet: Bouquet): number | null {
  if (!validateBouquet(bouquet)) return null;
  return spend(coins, bouquetPrice(bouquet));
}

/** One stem's pose in a hand-tied bouquet: tilt radians about x and z, and a lift in meters. */
export type StemPose = { tiltX: number; tiltZ: number; lift: number };

/**
 * Fans `count` stems out from the wrap on a golden-angle spiral: the first
 * stands straight up and each later one leans further out and sits a little
 * lower, so the heads form a dome. Pure and deterministic, so the counter and
 * the vase at home draw the same bouquet.
 */
export function arrange(count: number): StemPose[] {
  const poses: StemPose[] = [];
  for (let i = 0; i < count; i++) {
    const reach = 0.12 * Math.sqrt(i) * 2.2;
    const angle = i * 2.399963;
    poses.push({
      tiltX: Math.sin(angle) * reach,
      tiltZ: -Math.cos(angle) * reach,
      lift: -0.05 * Math.sqrt(i),
    });
  }
  return poses;
}
