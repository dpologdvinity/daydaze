// The city is cut into 64 m cells; the renderer streams the ones near the
// player. Cells are indexed from the south-west corner of the city bounds.
import type { Vec2 } from "../walk.ts";
import { CITY_BOUNDS, type Neighborhood } from "./layout.ts";

export { CELL_SIZE, VIEW_RADIUS } from "./tuning.ts";
import { CELL_SIZE } from "./tuning.ts";

/** Cells across (x) and down (z); Beachside makes the city taller than wide. */
export const CELLS_X = 14;
export const CELLS_Z = 11;

const ORIGIN = CITY_BOUNDS[0][0];
const ORIGIN_Z = CITY_BOUNDS[0][1];

export type Cell = {
  key: string;
  cx: number;
  cz: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  neighborhood: Neighborhood;
};

/** The neighborhood a point belongs to: Beachside south of the old city
 * edge at z = 192, Little Manila west of x = -192, else Nightlife Row east
 * of the cross street at x = 64. */
export function neighborhoodAt(p: Vec2): Neighborhood {
  if (p[1] > 192 && p[1] < 249 && p[0] > 192) return "fairground";
  if (p[1] > 192) return "beachside";
  if (p[1] < -192)
    return p[0] > 192 ? "uptown" : p[0] < -192 ? "suburbia" : "arts-district";
  if (p[0] < -192) return "little-manila";
  if (p[0] > 192) return "chinatown-koreatown";
  return p[0] >= 64 ? "nightlife-row" : "downtown";
}

function cellOf(cx: number, cz: number): Cell {
  const x0 = ORIGIN + cx * CELL_SIZE;
  const z0 = ORIGIN_Z + cz * CELL_SIZE;
  const x1 = x0 + CELL_SIZE;
  const z1 = z0 + CELL_SIZE;
  return {
    key: `${cx},${cz}`,
    cx,
    cz,
    x0,
    z0,
    x1,
    z1,
    neighborhood: neighborhoodAt([(x0 + x1) / 2, (z0 + z1) / 2]),
  };
}

export const ALL_CELLS: readonly Cell[] = Array.from(
  { length: CELLS_X * CELLS_Z },
  (_, i) => cellOf(i % CELLS_X, Math.floor(i / CELLS_X)),
);

/** The cell holding a point, clamped to the grid at the city edge. */
export function cellAt(p: Vec2): Cell {
  const index = (v: number, origin: number, count: number) =>
    Math.min(count - 1, Math.max(0, Math.floor((v - origin) / CELL_SIZE)));
  return cellOf(index(p[0], ORIGIN, CELLS_X), index(p[1], ORIGIN_Z, CELLS_Z));
}

/** Every cell whose square comes within `radius` meters of `center`. */
export function cellsWithin(center: Vec2, radius: number): Cell[] {
  return ALL_CELLS.filter((cell) => {
    const nx = Math.min(Math.max(center[0], cell.x0), cell.x1);
    const nz = Math.min(Math.max(center[1], cell.z0), cell.z1);
    return Math.hypot(nx - center[0], nz - center[1]) <= radius;
  });
}
