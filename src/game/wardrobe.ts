// The mix-and-match wardrobe: every garment by slot, the layering rules, and
// the short wear code a look carries. Each garment is its own doll model
// (`<slot>-<id>.glb`, art/doll/blender/doll_outfits.py); looks from before
// the wardrobe wear their outfit's garments (OUTFIT_WEAR).
import { isColor } from "./color.ts";

/** The whole outfits: closet presets and shop items, each a set of
 * garments (OUTFIT_WEAR) in one color. */
export const OUTFITS = [
  { id: "flares", label: "Crop and flares" },
  { id: "mini", label: "Slip mini" },
  { id: "fur", label: "Faux fur" },
  { id: "jeans", label: "Tee and skinny jeans" },
  { id: "shorts", label: "Tee and denim shorts" },
  { id: "blouse", label: "Blouse and pencil skirt" },
  // Boutique outfits, see shop.ts.
  { id: "tracksuit-y2k", label: "Y2K velour tracksuit" },
  { id: "baby-tee-mini", label: "Baby tee and mini" },
  { id: "sequin-slip", label: "Sequin slip gown" },
  { id: "glam-faux-fur", label: "Glam faux-fur wrap" },
  { id: "corset-maxi", label: "Corset and maxi skirt" },
  { id: "cargo-crop", label: "Tube top and cargos" },
  { id: "sundress", label: "Sundress" },
  { id: "hoodie-bikers", label: "Cropped hoodie and bikers" },
  // menswear, worn by anyone
  { id: "denim-shirt", label: "Denim shirt and jeans" },
  { id: "striped-shirt", label: "Striped shirt and jeans" },
  { id: "puffer", label: "Puffer jacket and jeans" },
  { id: "white-tee", label: "White tee and jeans" },
  { id: "suit", label: "Suit and tie" },
  { id: "overalls", label: "Overalls" },
] as const;

/** One of OUTFITS' ids. */
export type Outfit = (typeof OUTFITS)[number]["id"];

/** Wardrobe slots, from the skin out. A one-piece (`dress`, a dress or a
 * jumpsuit) replaces the top and the bottom; outerwear goes over the top. */
export const SLOTS = [
  "legwear",
  "bottom",
  "top",
  "dress",
  "outer",
  "hat",
] as const;
export type Slot = (typeof SLOTS)[number];

/** Every garment: its slot, and the old outfit it was split from (whose shop
 * price unlocks it); `from: null` is free to everyone. */
export const GARMENTS = [
  { id: "sport-crop", slot: "top", label: "Sport crop top", from: "flares" },
  { id: "bandeau", slot: "top", label: "Satin bandeau", from: "mini" },
  { id: "tee", slot: "top", label: "Fitted tee", from: "jeans" },
  { id: "scoop-tee", slot: "top", label: "Scoop tee", from: "shorts" },
  { id: "blouse", slot: "top", label: "Blouse", from: "blouse" },
  {
    id: "velour-hoodie",
    slot: "top",
    label: "Velour zip hoodie",
    from: "tracksuit-y2k",
  },
  { id: "baby-tee", slot: "top", label: "Baby tee", from: "baby-tee-mini" },
  { id: "corset", slot: "top", label: "Corset", from: "corset-maxi" },
  { id: "tube-top", slot: "top", label: "Tube top", from: "cargo-crop" },
  {
    id: "cropped-hoodie",
    slot: "top",
    label: "Cropped hoodie",
    from: "hoodie-bikers",
  },
  { id: "denim-shirt", slot: "top", label: "Denim shirt", from: "denim-shirt" },
  {
    id: "striped-shirt",
    slot: "top",
    label: "Striped shirt",
    from: "striped-shirt",
  },
  { id: "white-tee", slot: "top", label: "Crew tee", from: "white-tee" },
  { id: "suit-jacket", slot: "top", label: "Suit jacket", from: "suit" },
  { id: "flares", slot: "bottom", label: "Flares", from: "flares" },
  { id: "satin-mini", slot: "bottom", label: "Satin mini", from: "mini" },
  { id: "skinny-jeans", slot: "bottom", label: "Skinny jeans", from: "jeans" },
  { id: "denim-shorts", slot: "bottom", label: "Denim shorts", from: "shorts" },
  { id: "pencil-skirt", slot: "bottom", label: "Pencil skirt", from: "blouse" },
  {
    id: "track-pants",
    slot: "bottom",
    label: "Velour track pants",
    from: "tracksuit-y2k",
  },
  {
    id: "pleated-mini",
    slot: "bottom",
    label: "Pleated mini",
    from: "baby-tee-mini",
  },
  {
    id: "maxi-skirt",
    slot: "bottom",
    label: "Maxi skirt",
    from: "corset-maxi",
  },
  { id: "cargos", slot: "bottom", label: "Cargos", from: "cargo-crop" },
  {
    id: "bike-shorts",
    slot: "bottom",
    label: "Bike shorts",
    from: "hoodie-bikers",
  },
  {
    id: "straight-jeans",
    slot: "bottom",
    label: "Straight jeans",
    from: "white-tee",
  },
  { id: "suit-trousers", slot: "bottom", label: "Suit trousers", from: "suit" },
  {
    id: "sequin-gown",
    slot: "dress",
    label: "Sequin gown",
    from: "sequin-slip",
  },
  { id: "sundress", slot: "dress", label: "Sundress", from: "sundress" },
  { id: "overalls", slot: "dress", label: "Overalls", from: "overalls" },
  { id: "fur-jacket", slot: "outer", label: "Faux-fur jacket", from: "fur" },
  {
    id: "fur-wrap",
    slot: "outer",
    label: "Faux-fur wrap",
    from: "glam-faux-fur",
  },
  { id: "puffer", slot: "outer", label: "Puffer jacket", from: "puffer" },
  { id: "tights", slot: "legwear", label: "Opaque tights", from: null },
  { id: "sheer-tights", slot: "legwear", label: "Sheer tights", from: null },
  {
    id: "fishnet-tights",
    slot: "legwear",
    label: "Fishnet tights",
    from: null,
  },
  { id: "crew-socks", slot: "legwear", label: "Crew socks", from: null },
  { id: "knee-socks", slot: "legwear", label: "Knee socks", from: null },
  { id: "leg-warmers", slot: "legwear", label: "Leg warmers", from: null },
  { id: "cloche", slot: "hat", label: "Cloche", from: null },
  { id: "newsboy-cap", slot: "hat", label: "Newsboy cap", from: null },
  { id: "baseball-cap", slot: "hat", label: "Baseball cap", from: null },
  { id: "beanie", slot: "hat", label: "Beanie", from: null },
  { id: "bucket-hat", slot: "hat", label: "Bucket hat", from: null },
  { id: "patrol-cap", slot: "hat", label: "Patrol cap", from: null },
  { id: "headscarf", slot: "hat", label: "Headscarf", from: null },
  { id: "sun-visor", slot: "hat", label: "Sun visor", from: null },
  { id: "hijab-wrap", slot: "hat", label: "Hijab", from: null },
] as const satisfies readonly {
  id: string;
  slot: Slot;
  label: string;
  from: Outfit | null;
}[];

export type Garment = (typeof GARMENTS)[number];
export type GarmentId = Garment["id"];

/** A garment worn, in its color (an RGB hex id, like OUTFIT_COLORS'). */
export type Worn = { id: GarmentId; color: string };
/** What a doll wears, by slot. Valid wear (isWearValid) has a one-piece or
 * both a top and a bottom, never a one-piece with either. */
export type Wear = Partial<Record<Slot, Worn>>;

/** The catalog entry for an id, if it is one. */
export const garment = (id: unknown): Garment | undefined =>
  GARMENTS.find((g) => g.id === id);

/** The garments for one slot, in catalog order. */
export const garmentsIn = (slot: Slot): Garment[] =>
  GARMENTS.filter((g) => g.slot === slot);

/** The garments each old outfit was: looks without a wear code wear these,
 * all in the outfit's color. The fur coats were worn over nothing seen, so
 * they get the satin bandeau and mini underneath. */
export const OUTFIT_WEAR: Record<Outfit, readonly GarmentId[]> = {
  flares: ["sport-crop", "flares"],
  mini: ["bandeau", "satin-mini"],
  fur: ["bandeau", "satin-mini", "fur-jacket"],
  jeans: ["tee", "skinny-jeans"],
  shorts: ["scoop-tee", "denim-shorts"],
  blouse: ["blouse", "pencil-skirt"],
  "tracksuit-y2k": ["velour-hoodie", "track-pants"],
  "baby-tee-mini": ["baby-tee", "pleated-mini"],
  "sequin-slip": ["sequin-gown"],
  "glam-faux-fur": ["bandeau", "satin-mini", "fur-wrap"],
  "corset-maxi": ["corset", "maxi-skirt"],
  "cargo-crop": ["tube-top", "cargos"],
  sundress: ["sundress"],
  "hoodie-bikers": ["cropped-hoodie", "bike-shorts"],
  "denim-shirt": ["denim-shirt", "straight-jeans"],
  "striped-shirt": ["striped-shirt", "straight-jeans"],
  puffer: ["white-tee", "straight-jeans", "puffer"],
  "white-tee": ["white-tee", "straight-jeans"],
  suit: ["suit-jacket", "suit-trousers"],
  overalls: ["overalls"],
};

/** An outfit's garments, all in one color. */
export function outfitWear(outfit: Outfit, color: string): Wear {
  const wear: Wear = {};
  for (const id of OUTFIT_WEAR[outfit]) {
    const g = garment(id);
    if (g) wear[g.slot] = { id: g.id, color };
  }
  return wear;
}

/** Whether wear follows the slot rules: each garment in its own slot, and a
 * one-piece or else both a top and a bottom. */
export function isWearValid(wear: Wear): boolean {
  for (const slot of SLOTS) {
    const worn = wear[slot];
    if (worn && (garment(worn.id)?.slot !== slot || !isColor(worn.color)))
      return false;
  }
  return wear.dress
    ? !wear.top && !wear.bottom
    : Boolean(wear.top && wear.bottom);
}

/** Wear as one short code, from the skin out: "<id><#color>" joined by "+",
 * e.g. "skinny-jeans#141018+tee#ff2f9a". */
export function encodeWear(wear: Wear): string {
  return SLOTS.flatMap((slot) => {
    const worn = wear[slot];
    return worn ? [`${worn.id}${worn.color}`] : [];
  }).join("+");
}

/** The wear a code describes; null when malformed or against the rules. */
export function decodeWear(code: unknown): Wear | null {
  if (typeof code !== "string" || code.length > 200) return null;
  const wear: Wear = {};
  for (const part of code.split("+")) {
    const hash = part.indexOf("#");
    const g = garment(part.slice(0, hash));
    const color = part.slice(hash);
    if (hash < 0 || !g || !isColor(color) || wear[g.slot]) return null;
    wear[g.slot] = { id: g.id, color };
  }
  return isWearValid(wear) ? wear : null;
}

/** What a look wears: its wear code, else its outfit's garments. */
export function wearOf(look: {
  outfit: Outfit;
  outfitColor: string;
  wear?: string | undefined;
}): Wear {
  return decodeWear(look.wear) ?? outfitWear(look.outfit, look.outfitColor);
}

/** Wear with a garment put on in `color`. A one-piece takes off the top and
 * bottom; a top or bottom takes off a one-piece, and the half it leaves bare
 * is filled from the house look in the one-piece's color. Unknown garments
 * or colors change nothing. */
export function putOn(wear: Wear, id: string, color: string): Wear {
  const g = garment(id);
  if (!g || !isColor(color)) return wear;
  const next: Wear = { ...wear, [g.slot]: { id: g.id, color } };
  if (g.slot === "dress") {
    delete next.top;
    delete next.bottom;
  } else if ((g.slot === "top" || g.slot === "bottom") && wear.dress) {
    const { top, bottom } = outfitWear("jeans", wear.dress.color);
    delete next.dress;
    if (!next.top && top) next.top = top;
    if (!next.bottom && bottom) next.bottom = bottom;
  }
  return next;
}

/** Wear with a layer (outerwear, legwear) taken off. Tops, bottoms and
 * one-pieces are only ever swapped, never left bare. */
export function takeOff(wear: Wear, slot: Slot): Wear {
  if (slot !== "outer" && slot !== "legwear" && slot !== "hat") return wear;
  const next = { ...wear };
  delete next[slot];
  return next;
}

/** Wear with every garment dyed `color` (the closet's outfit color). */
export function recolor(wear: Wear, color: string): Wear {
  if (!isColor(color)) return wear;
  const next: Wear = {};
  for (const slot of SLOTS) {
    const worn = wear[slot];
    if (worn) next[slot] = { id: worn.id, color };
  }
  return next;
}
