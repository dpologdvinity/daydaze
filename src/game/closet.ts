// The closet at scale: a style tag for every garment, name search and the
// style and favorites filters, and the saved record (favorite garments and
// named outfits) with the cleaning that keeps old or tampered saves loading.
// Pure.
import {
  decodeWear,
  garment,
  type Garment,
  type GarmentId,
} from "./wardrobe.ts";

/** What a garment looks like it is for; the closet's style filter. */
export const STYLES = ["casual", "glam", "street", "formal", "sporty"] as const;
export type Style = (typeof STYLES)[number];

/** Every garment's styles. A Record, so a new garment will not compile until
 * it is tagged. */
export const GARMENT_STYLES: Record<GarmentId, readonly Style[]> = {
  "sport-crop": ["sporty"],
  bandeau: ["glam"],
  tee: ["casual"],
  "scoop-tee": ["casual"],
  blouse: ["formal"],
  "velour-hoodie": ["street", "sporty"],
  "baby-tee": ["casual", "street"],
  corset: ["glam"],
  "tube-top": ["street"],
  "cropped-hoodie": ["street", "sporty"],
  "denim-shirt": ["casual"],
  "striped-shirt": ["casual"],
  "white-tee": ["casual"],
  "suit-jacket": ["formal"],
  flares: ["casual", "glam"],
  "satin-mini": ["glam"],
  "skinny-jeans": ["casual"],
  "denim-shorts": ["casual"],
  "pencil-skirt": ["formal"],
  "track-pants": ["street", "sporty"],
  "pleated-mini": ["casual", "street"],
  "maxi-skirt": ["glam", "formal"],
  cargos: ["street"],
  "bike-shorts": ["sporty", "street"],
  "straight-jeans": ["casual"],
  "suit-trousers": ["formal"],
  "sequin-gown": ["glam", "formal"],
  sundress: ["casual"],
  overalls: ["casual", "street"],
  "fur-jacket": ["glam"],
  "fur-wrap": ["glam", "formal"],
  puffer: ["street", "casual"],
  tights: ["casual", "glam"],
  "sheer-tights": ["glam", "formal"],
  "fishnet-tights": ["glam", "street"],
  "crew-socks": ["casual", "sporty"],
  "knee-socks": ["street", "sporty"],
  "leg-warmers": ["street", "sporty"],
  cloche: ["glam", "formal"],
  "newsboy-cap": ["casual", "street"],
  "baseball-cap": ["street", "sporty"],
  beanie: ["casual", "street"],
  "bucket-hat": ["casual", "street"],
  "patrol-cap": ["casual", "street"],
  headscarf: ["casual", "formal"],
  "hijab-wrap": ["casual", "formal"],
  "sun-visor": ["sporty"],
  beret: ["casual", "formal"],
  "sun-hat": ["casual"],
  "cowboy-hat": ["casual", "street"],
};

/** The most outfits one closet keeps, and the longest name. */
export const MAX_OUTFITS = 12;
export const MAX_NAME = 24;

/** A whole look put away: a name and its wear code (wardrobe.ts). */
export type SavedOutfit = { name: string; wear: string };

/** What the player keeps in the closet between sessions. */
export type ClosetSave = {
  favorites: GarmentId[];
  outfits: SavedOutfit[];
};

export const NO_CLOSET: ClosetSave = { favorites: [], outfits: [] };

/** How to narrow a garment list; leave a field out to skip it. */
export type ClosetFilter = {
  query?: string;
  style?: Style | undefined;
  favoritesOnly?: boolean;
};

/** The garments matching the filter: every word of the query inside the
 * label, the style if one is picked, favorites only on request. Favorites
 * come first; the rest keep the order given. */
export function filterGarments(
  garments: readonly Garment[],
  { query = "", style, favoritesOnly = false }: ClosetFilter,
  favorites: readonly string[],
): Garment[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = garments.filter(
    (g) =>
      words.every((w) => g.label.toLowerCase().includes(w)) &&
      (!style || GARMENT_STYLES[g.id].includes(style)) &&
      (!favoritesOnly || favorites.includes(g.id)),
  );
  const first = matches.filter((g) => favorites.includes(g.id));
  return [...first, ...matches.filter((g) => !favorites.includes(g.id))];
}

/** The closet with a garment's favorite flag flipped; unknown ids change
 * nothing. */
export function toggleFavorite(closet: ClosetSave, id: string): ClosetSave {
  const g = garment(id);
  if (!g) return closet;
  const favorites = closet.favorites.includes(g.id)
    ? closet.favorites.filter((f) => f !== g.id)
    : [...closet.favorites, g.id];
  return { ...closet, favorites };
}

const sameName = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();

/** A usable outfit name: 1 to MAX_NAME characters once trimmed. */
function cleanName(name: unknown): string | null {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed.length > 0 && trimmed.length <= MAX_NAME ? trimmed : null;
}

/** The closet with `wear` put away as `name`. A repeated name (any case) is
 * replaced; at the cap a new name is refused, so nothing is lost silently. A
 * bad name or wear code changes nothing. */
export function saveOutfit(
  closet: ClosetSave,
  name: string,
  wear: string,
): ClosetSave {
  const clean = cleanName(name);
  if (!clean || !decodeWear(wear)) return closet;
  const exists = closet.outfits.some((o) => sameName(o.name, clean));
  if (!exists && closet.outfits.length >= MAX_OUTFITS) return closet;
  const outfit = { name: clean, wear };
  return {
    ...closet,
    outfits: exists
      ? closet.outfits.map((o) => (sameName(o.name, clean) ? outfit : o))
      : [...closet.outfits, outfit],
  };
}

/** The closet without the outfit named `name`. */
export function deleteOutfit(closet: ClosetSave, name: string): ClosetSave {
  return {
    ...closet,
    outfits: closet.outfits.filter((o) => !sameName(o.name, name)),
  };
}

/** The closet from storage: known unique favorites, and outfits with a valid
 * name and wear. Saves from before the closet, or malformed, start empty. */
export function cleanCloset(value: unknown): ClosetSave {
  if (typeof value !== "object" || value === null) return { ...NO_CLOSET };
  const picks: unknown = Reflect.get(value, "favorites");
  const outs: unknown = Reflect.get(value, "outfits");
  const favorites = new Set<GarmentId>();
  for (const id of Array.isArray(picks) ? picks : []) {
    const g = garment(id);
    if (g) favorites.add(g.id);
  }
  let closet: ClosetSave = { favorites: [...favorites], outfits: [] };
  for (const o of Array.isArray(outs) ? outs : []) {
    if (typeof o !== "object" || o === null) continue;
    const name: unknown = Reflect.get(o, "name");
    const wear: unknown = Reflect.get(o, "wear");
    if (typeof name !== "string" || typeof wear !== "string") continue;
    const next = saveOutfit(closet, name, wear);
    // keep the first of a repeated name
    if (next.outfits.length > closet.outfits.length) closet = next;
  }
  return closet;
}
