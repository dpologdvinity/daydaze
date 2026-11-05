// Apartment decorating: a starter catalog placed on a grid of 1 m cells.
// Pure data and rules; the room renders whatever these functions return.

export const HOME_GRID = { columns: 8, rows: 6 } as const;

export type Rotation = 0 | 1 | 2 | 3;

/** The tabs the decorating panel lists furniture under. */
export const FURNITURE_GROUPS = [
  "Living",
  "Bed and desk",
  "Kitchen",
  "Bath",
  "Plants and decor",
] as const;
export type FurnitureGroup = (typeof FURNITURE_GROUPS)[number];

// One entry per piece: its footprint in 1 m cells, the tallest it may stand
// (meters; the model is scaled to fit all three) and the panel group. The
// model is public/models/home/<id>.glb (Quaternius, CC0; see docs/assets.md).
// The first eight ids are the original catalog: saved homes keep working.
const piece = (
  name: string,
  width: number,
  depth: number,
  height: number,
  group: FurnitureGroup,
) => ({ name, width, depth, height, group });

export const FURNITURE_CATALOG = {
  sofa: piece("Velvet sofa", 3, 1, 1.0, "Living"),
  bed: piece("Sunny bed", 2, 3, 1.0, "Bed and desk"),
  table: piece("Round table", 2, 2, 0.8, "Living"),
  lamp: piece("Floor lamp", 1, 1, 1.7, "Plants and decor"),
  rug: piece("Scalloped rug", 3, 2, 0.15, "Living"),
  plant: piece("Monstera", 1, 1, 1.0, "Plants and decor"),
  bookshelf: piece("Record shelf", 2, 1, 1.5, "Living"),
  tv: piece("Retro TV", 2, 1, 1.1, "Living"),
  "sofa-small": piece("Loveseat", 2, 1, 0.9, "Living"),
  "sofa-corner": piece("Corner sofa", 3, 3, 1.0, "Living"),
  armchair: piece("Armchair", 1, 1, 0.9, "Living"),
  "coffee-table": piece("Coffee table", 1, 2, 0.45, "Living"),
  "tv-flat": piece("Flat-screen TV", 2, 1, 1.0, "Living"),
  fireplace: piece("Fireplace", 3, 1, 2.2, "Living"),
  "rug-round": piece("Round rug", 2, 2, 0.1, "Living"),
  drawer: piece("Sideboard", 3, 1, 1.0, "Living"),
  "bed-single": piece("Single bed", 1, 2, 0.8, "Bed and desk"),
  nightstand: piece("Nightstand", 1, 1, 0.6, "Bed and desk"),
  desk: piece("Desk", 2, 1, 0.85, "Bed and desk"),
  "office-chair": piece("Office chair", 1, 1, 1.0, "Bed and desk"),
  stool: piece("Stool", 1, 1, 0.7, "Bed and desk"),
  closet: piece("Closet", 1, 1, 1.9, "Bed and desk"),
  "table-small": piece("Side table", 1, 1, 0.7, "Living"),
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
} as const;

export type FurnitureId = keyof typeof FURNITURE_CATALOG;

export type Furniture = {
  id: FurnitureId;
  cell: readonly [number, number];
  rotation: Rotation;
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

function fits(items: readonly Furniture[], skip: number, piece: Furniture) {
  const size = footprint(piece.id, piece.rotation);
  const [c, r] = piece.cell;
  if (c < 0 || r < 0 || c + size.w > HOME_GRID.columns) return false;
  if (r + size.d > HOME_GRID.rows) return false;
  return items.every((other, index) => {
    if (index === skip) return true;
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
): Furniture[] | null {
  const piece: Furniture = { id, cell, rotation };
  return fits(items, -1, piece) ? [...items, piece] : null;
}

// Index of the piece covering a grid cell, or -1 for an empty cell.
export function pieceAt(
  items: readonly Furniture[],
  column: number,
  row: number,
): number {
  return items.findIndex((item) => {
    const size = footprint(item.id, item.rotation);
    const [c, r] = item.cell;
    return column >= c && column < c + size.w && row >= r && row < r + size.d;
  });
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
  if (!current) return null;
  const rotation = ((current.rotation + 1) % 4) as Rotation;
  return replaceAt(items, index, { ...current, rotation });
}

export function removeFurniture(
  items: readonly Furniture[],
  index: number,
): Furniture[] | null {
  if (index < 0 || index >= items.length) return null;
  return items.filter((_, i) => i !== index);
}

// Saved furniture is untrusted: keep only well-formed pieces that fit the grid
// and do not overlap an earlier piece.
export function validateFurniture(value: unknown): Furniture[] {
  if (!Array.isArray(value)) return [];
  const kept: Furniture[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, cell, rotation } = entry as Record<string, unknown>;
    if (!isFurnitureId(id)) continue;
    if (!Array.isArray(cell) || cell.length !== 2) continue;
    const [c, r] = cell;
    if (!Number.isInteger(c) || !Number.isInteger(r)) continue;
    if (rotation !== 0 && rotation !== 1 && rotation !== 2 && rotation !== 3) {
      continue;
    }
    const piece: Furniture = { id, cell: [c, r], rotation };
    if (fits(kept, -1, piece)) kept.push(piece);
  }
  return kept;
}
