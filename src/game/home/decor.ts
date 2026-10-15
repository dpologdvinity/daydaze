// Apartment decorating: a starter catalogue placed on a grid of 1 m cells.
// Pure data and rules; the room renders whatever these functions return.

export const HOME_GRID = { columns: 8, rows: 6 } as const;

export type Rotation = 0 | 1 | 2 | 3;

export const FURNITURE_CATALOG = {
  sofa: { name: "Velvet sofa", width: 3, depth: 1 },
  bed: { name: "Sunny bed", width: 2, depth: 3 },
  table: { name: "Round table", width: 2, depth: 2 },
  lamp: { name: "Floor lamp", width: 1, depth: 1 },
  rug: { name: "Scalloped rug", width: 3, depth: 2 },
  plant: { name: "Monstera", width: 1, depth: 1 },
  bookshelf: { name: "Record shelf", width: 2, depth: 1 },
  tv: { name: "Retro TV", width: 2, depth: 1 },
} as const;

export type FurnitureId = keyof typeof FURNITURE_CATALOG;

export type Furniture = {
  id: FurnitureId;
  cell: readonly [number, number];
  rotation: Rotation;
};

export const FURNITURE_IDS = Object.keys(FURNITURE_CATALOG) as FurnitureId[];

function isFurnitureId(value: unknown): value is FurnitureId {
  return typeof value === "string" && FURNITURE_IDS.includes(value as FurnitureId);
}

function footprint(id: FurnitureId, rotation: Rotation) {
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
    return c + size.w <= oc || oc + o.w <= c || r + size.d <= or || or + o.d <= r;
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
