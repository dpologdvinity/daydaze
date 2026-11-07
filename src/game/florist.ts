// Bouquet ingredients, finishing choices and rules shared by the shop and save.
export const STEMS = {
  rose: { price: 7, color: "pink" },
  tulip: { price: 6, color: "pink" },
  sunflower: { price: 7, color: "yellow" },
  peony: { price: 9, color: "pink" },
  lily: { price: 8, color: "white" },
  daisy: { price: 5, color: "white" },
  "babys-breath": { price: 4, color: "white" },
  eucalyptus: { price: 4, color: "green" },
} as const;
export type Stem = keyof typeof STEMS;
export const WRAPS = ["kraft", "cream", "pink"] as const;
export const RIBBONS = ["pink", "white", "green"] as const;
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
    stems.length >= 3 &&
    stems.length <= 12 &&
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
