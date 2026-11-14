// Apartment decorating: a starter catalog placed on a grid of 1 m cells.
// Pure data and rules; the room renders whatever these functions return.

import { ARTWORKS, type ArtworkId } from "../artworks.ts";

export const HOME_GRID = { columns: 8, rows: 6 } as const;

/** Back-wall columns the window (and its curtains) covers: nothing hangs there. */
export const WINDOW_COLUMNS: readonly number[] = [1, 2, 3];

export type Rotation = 0 | 1 | 2 | 3;

/** The tabs the decorating panel lists furniture under. */
export const FURNITURE_GROUPS = [
  "Living",
  "Bed and desk",
  "Kitchen",
  "Bath",
  "Plants and decor",
  "Wall",
] as const;
export type FurnitureGroup = (typeof FURNITURE_GROUPS)[number];

// One entry per piece: its footprint in 1 m cells, the tallest it may stand
// (meters; the model is scaled to fit all three) and the panel group. The
// model is public/models/home/<id>.glb (Quaternius, CC0; see docs/assets.md).
// The first eight ids are the original catalog: saved homes keep working.
/** Looks a fabric or wood piece can wear (variant 0 keeps the model's own). */
export const TINT_NAMES = ["Natural", "Pink velvet", "Cream", "Teal"] as const;
const NEON_NAMES = ["Pink", "Teal", "Amber", "Violet"] as const;
// Prints: the first six looks are drawn in code (the shared poster atlas); the
// rest are paintings (src/game/artworks.ts). Saved homes store the index, so
// new paintings only ever go on the end of PRINT_ARTWORKS.
const DRAWN_PRINTS = ["Sunset", "Palm", "Heart", "Stars", "Moon", "Wave"];
const PRINT_ARTWORKS = [
  "sap-cafe",
  "sap-sunflowers",
  "sap-umbrella",
  "sap-pride",
  "sap-polaroids",
  "sap-ferris-wheel",
  "ph-rice-terraces",
  "ph-pahiyas",
  "ph-mango-orchard",
  "dd-boardwalk",
  "dd-mermaid-cove",
  "dd-skyline",
  "dd-night-market",
  "sap-slow-dance",
  "sap-rainy-window",
  "sap-bonfire",
  "sap-mermaids",
  "sap-stained-glass",
  "ph-parol-night",
  "ph-sinulog",
  "ph-lola-kitchen",
  "ph-jeepney-dusk",
  "sap-arcade",
  "sap-boardwalk",
  "sap-bookshop",
  "sap-diner",
  "sap-flash-game",
  "sap-ice-rink",
  "sap-karaoke",
  "sap-marina",
  "sap-nouveau",
  "sap-picnic",
  "sap-pop-art",
  "sap-roller-rink",
  "sap-wedding",
  "ph-carabao",
  "ph-fiesta-street",
  "ph-manila-bay",
  "ph-nipa-sea",
  "ph-noche-buena",
  "dd-carnival",
  "dd-pulse",
  "dd-roller",
  "dd-travel",
  "sap-moving-in",
  "sap-kitchen-dance",
  "sap-rooftop-stars",
  "sap-prom",
  "sap-lighthouse",
  "sap-debut",
  "ph-chocolate-hills",
  "ph-vigan",
  "ph-island-sunset",
  "ph-mayon",
  "ph-pabitin",
  "ph-tinikling",
] as const satisfies readonly ArtworkId[];
const PRINT_NAMES: readonly string[] = [
  ...DRAWN_PRINTS,
  ...PRINT_ARTWORKS.map((id) => ARTWORKS[id].title),
];

/** The painting a print's look shows, or null for the six drawn looks and any
 * index out of range. */
export function printArtwork(variant: number): ArtworkId | null {
  return PRINT_ARTWORKS[variant - DRAWN_PRINTS.length] ?? null;
}

export type FurniturePiece = {
  name: string;
  width: number;
  depth: number;
  height: number;
  group: FurnitureGroup;
  /** Hangs on the back wall (cell [column, 0]) instead of standing on the floor. */
  wall: boolean;
  /** The names of the looks the player can pick; the first is the default. */
  variants: readonly string[];
};

const piece = (
  name: string,
  width: number,
  depth: number,
  height: number,
  group: FurnitureGroup,
  variants: readonly string[] = ["Original"],
  wall = false,
): FurniturePiece => ({ name, width, depth, height, group, wall, variants });

// helpers for the entries below
const tinted = TINT_NAMES;

/** The look a piece starts with: fabric and wood pieces come in pink velvet. */
export function defaultVariant(id: FurnitureId): number {
  return FURNITURE_CATALOG[id].variants === TINT_NAMES ? 1 : 0;
}

export const FURNITURE_CATALOG = {
  sofa: piece("Velvet sofa", 3, 1, 1.0, "Living", tinted),
  bed: piece("Sunny bed", 2, 3, 1.0, "Bed and desk", tinted),
  table: piece("Round table", 2, 2, 0.8, "Living", tinted),
  lamp: piece("Floor lamp", 1, 1, 1.7, "Plants and decor"),
  rug: piece("Scalloped rug", 3, 2, 0.15, "Living", tinted),
  plant: piece("Monstera", 1, 1, 1.0, "Plants and decor"),
  bookshelf: piece("Record shelf", 2, 1, 1.5, "Living", tinted),
  tv: piece("Retro TV", 2, 1, 0.7, "Living"),
  "sofa-small": piece("Loveseat", 2, 1, 0.9, "Living", tinted),
  "sofa-corner": piece("Corner sofa", 3, 3, 1.0, "Living", tinted),
  armchair: piece("Armchair", 1, 1, 0.9, "Living", tinted),
  "coffee-table": piece("Coffee table", 1, 2, 0.45, "Living"),
  "tv-flat": piece("Flat-screen TV", 2, 1, 1.0, "Living"),
  fireplace: piece("Fireplace", 3, 1, 2.2, "Living"),
  "rug-round": piece("Round rug", 2, 2, 0.1, "Living", tinted),
  drawer: piece("Sideboard", 3, 1, 1.0, "Living", tinted),
  "bed-single": piece("Single bed", 1, 2, 0.8, "Bed and desk", tinted),
  nightstand: piece("Nightstand", 1, 1, 0.6, "Bed and desk", tinted),
  desk: piece("Desk", 2, 1, 0.85, "Bed and desk", tinted),
  "office-chair": piece("Office chair", 1, 1, 1.0, "Bed and desk", tinted),
  stool: piece("Stool", 1, 1, 0.7, "Bed and desk", tinted),
  closet: piece("Closet", 1, 1, 1.9, "Bed and desk", tinted),
  "table-small": piece("Side table", 1, 1, 0.7, "Living", tinted),
  fridge: piece("Fridge", 1, 1, 1.9, "Kitchen"),
  oven: piece("Oven", 1, 1, 0.95, "Kitchen"),
  "kitchen-sink": piece("Kitchen sink", 1, 1, 0.95, "Kitchen"),
  "kitchen-cabinet": piece("Kitchen counter", 1, 1, 0.95, "Kitchen"),
  bathtub: piece("Bathtub", 1, 2, 0.65, "Bath"),
  shower: piece("Shower", 1, 1, 2.0, "Bath"),
  toilet: piece("Toilet", 1, 1, 0.8, "Bath"),
  sink: piece("Bathroom sink", 1, 1, 0.9, "Bath"),
  washer: piece("Washing machine", 1, 1, 0.9, "Bath"),
  mirror: piece("Standing mirror", 1, 1, 1.4, "Bath"),
  "plant-tall": piece("Fern", 1, 1, 1.4, "Plants and decor"),
  vase: piece("Vase", 1, 1, 0.45, "Plants and decor"),
  "lamp-desk": piece("Desk lamp", 1, 1, 0.5, "Plants and decor"),
  trash: piece("Trash can", 1, 1, 0.5, "Plants and decor"),
  // wall pieces: `height` is where the piece hangs (its center), meters
  "wall-mirror": piece("Wall mirror", 1, 1, 1.4, "Wall", ["Original"], true),
  "wall-shelf": piece("Wall shelf", 2, 1, 1.5, "Wall", ["Original"], true),
  "wall-art": piece("Framed print", 1, 1, 1.7, "Wall", PRINT_NAMES, true),
  "wall-art-wide": piece("Large print", 2, 1, 1.7, "Wall", PRINT_NAMES, true),
  "wall-lights": piece(
    "String lights",
    3,
    1,
    2.6,
    "Wall",
    ["Warm", "Pink", "Teal"],
    true,
  ),
  "wall-neon": piece("Neon sign", 2, 1, 2.1, "Wall", NEON_NAMES, true),
} as const satisfies Record<string, FurniturePiece>;

export type FurnitureId = keyof typeof FURNITURE_CATALOG;

export type Furniture = {
  id: FurnitureId;
  cell: readonly [number, number];
  rotation: Rotation;
  /** Index into the piece's `variants`; absent means the first. */
  variant?: number;
};

export const FURNITURE_IDS = Object.keys(FURNITURE_CATALOG) as FurnitureId[];

function isFurnitureId(value: unknown): value is FurnitureId {
  return (
    typeof value === "string" && FURNITURE_IDS.includes(value as FurnitureId)
  );
}

export function footprint(id: FurnitureId, rotation: Rotation) {
  const { width, depth } = FURNITURE_CATALOG[id];
  return rotation % 2 === 0 ? { w: width, d: depth } : { w: depth, d: width };
}

const isWall = (item: Furniture) => FURNITURE_CATALOG[item.id].wall;

// Floor pieces share the grid; wall pieces share the back wall's columns and
// never touch the floor, so the two kinds do not collide.
function fits(items: readonly Furniture[], skip: number, piece: Furniture) {
  const [c, r] = piece.cell;
  if (isWall(piece)) {
    const w = FURNITURE_CATALOG[piece.id].width;
    if (r !== 0 || piece.rotation !== 0 || c < 0 || c + w > HOME_GRID.columns) {
      return false;
    }
    for (let k = c; k < c + w; k++)
      if (WINDOW_COLUMNS.includes(k)) return false;
    return items.every((other, index) => {
      if (index === skip || !isWall(other)) return true;
      const ow = FURNITURE_CATALOG[other.id].width;
      return c + w <= other.cell[0] || other.cell[0] + ow <= c;
    });
  }
  const size = footprint(piece.id, piece.rotation);
  if (c < 0 || r < 0 || c + size.w > HOME_GRID.columns) return false;
  if (r + size.d > HOME_GRID.rows) return false;
  return items.every((other, index) => {
    if (index === skip || isWall(other)) return true;
    const o = footprint(other.id, other.rotation);
    const [oc, or] = other.cell;
    return (
      c + size.w <= oc || oc + o.w <= c || r + size.d <= or || or + o.d <= r
    );
  });
}

export function placeFurniture(
  items: readonly Furniture[],
  id: FurnitureId,
  cell: readonly [number, number],
  rotation: Rotation,
  variant = 0,
): Furniture[] | null {
  const piece: Furniture =
    variant > 0 ? { id, cell, rotation, variant } : { id, cell, rotation };
  if (variant >= FURNITURE_CATALOG[id].variants.length) return null;
  return fits(items, -1, piece) ? [...items, piece] : null;
}

// Index of the floor piece covering a grid cell, or -1 for an empty cell.
export function pieceAt(
  items: readonly Furniture[],
  column: number,
  row: number,
): number {
  return items.findIndex((item) => {
    if (isWall(item)) return false;
    const size = footprint(item.id, item.rotation);
    const [c, r] = item.cell;
    return column >= c && column < c + size.w && row >= r && row < r + size.d;
  });
}

// Index of the wall piece covering a back-wall column, or -1.
export function wallPieceAt(
  items: readonly Furniture[],
  column: number,
): number {
  return items.findIndex(
    (item) =>
      isWall(item) &&
      column >= item.cell[0] &&
      column < item.cell[0] + FURNITURE_CATALOG[item.id].width,
  );
}

function replaceAt(
  items: readonly Furniture[],
  index: number,
  next: Furniture,
): Furniture[] | null {
  if (index < 0 || index >= items.length) return null;
  if (!fits(items, index, next)) return null;
  return items.map((item, i) => (i === index ? next : item));
}

export function moveFurniture(
  items: readonly Furniture[],
  index: number,
  cell: readonly [number, number],
): Furniture[] | null {
  const current = items[index];
  if (!current) return null;
  return replaceAt(items, index, { ...current, cell });
}

export function rotateFurniture(
  items: readonly Furniture[],
  index: number,
): Furniture[] | null {
  const current = items[index];
  if (!current || isWall(current)) return null;
  const rotation = ((current.rotation + 1) % 4) as Rotation;
  return replaceAt(items, index, { ...current, rotation });
}

/** Gives a placed piece another of its looks. */
export function setVariant(
  items: readonly Furniture[],
  index: number,
  variant: number,
): Furniture[] | null {
  const current = items[index];
  if (!current) return null;
  if (!Number.isInteger(variant)) return null;
  if (variant < 0 || variant >= FURNITURE_CATALOG[current.id].variants.length) {
    return null;
  }
  const { variant: _old, ...rest } = current;
  return replaceAt(items, index, variant > 0 ? { ...rest, variant } : rest);
}

export function removeFurniture(
  items: readonly Furniture[],
  index: number,
): Furniture[] | null {
  if (index < 0 || index >= items.length) return null;
  return items.filter((_, i) => i !== index);
}

// Saved furniture is untrusted: keep only well-formed pieces that fit the grid
// and do not overlap an earlier piece. A variant out of range falls back to
// the piece's first look.
export function validateFurniture(value: unknown): Furniture[] {
  if (!Array.isArray(value)) return [];
  const kept: Furniture[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, cell, rotation, variant } = entry as Record<string, unknown>;
    if (!isFurnitureId(id)) continue;
    if (!Array.isArray(cell) || cell.length !== 2) continue;
    const [c, r] = cell;
    if (!Number.isInteger(c) || !Number.isInteger(r)) continue;
    if (rotation !== 0 && rotation !== 1 && rotation !== 2 && rotation !== 3) {
      continue;
    }
    const known =
      typeof variant === "number" &&
      Number.isInteger(variant) &&
      variant > 0 &&
      variant < FURNITURE_CATALOG[id].variants.length;
    const piece: Furniture = known
      ? { id, cell: [c, r], rotation, variant }
      : { id, cell: [c, r], rotation };
    if (fits(kept, -1, piece)) kept.push(piece);
  }
  return kept;
}
