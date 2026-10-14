// The city is cut into 64 m cells; the renderer streams the ones near the
// player. Cells are indexed from the south-west corner of the city bounds.
import type { Vec2 } from "../walk.ts";
import { CITY_BOUNDS, type Neighborhood } from "./layout.ts";

export { CELL_SIZE, VIEW_RADIUS } from "./tuning.ts";
import { CELL_SIZE } from "./tuning.ts";

export const CELLS_PER_SIDE = 6;

const ORIGIN = CITY_BOUNDS[0][0];

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

/** The neighborhood a point belongs to: Nightlife Row east of the cross street at x = 64. */
export function neighborhoodAt(p: Vec2): Neighborhood {
  return p[0] >= 64 ? "nightlife-row" : "downtown";
}

function cellOf(cx: number, cz: number): Cell {
  const x0 = ORIGIN + cx * CELL_SIZE;
  const z0 = ORIGIN + cz * CELL_SIZE;
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
  { length: CELLS_PER_SIDE * CELLS_PER_SIDE },
  (_, i) => cellOf(i % CELLS_PER_SIDE, Math.floor(i / CELLS_PER_SIDE)),
);

/** The cell holding a point, clamped to the grid at the city edge. */
export function cellAt(p: Vec2): Cell {
  const index = (v: number) =>
    Math.min(
      CELLS_PER_SIDE - 1,
      Math.max(0, Math.floor((v - ORIGIN) / CELL_SIZE)),
    );
  return cellOf(index(p[0]), index(p[1]));
}

/** Every cell whose square comes within `radius` metres of `center`. */
export function cellsWithin(center: Vec2, radius: number): Cell[] {
  return ALL_CELLS.filter((cell) => {
    const nx = Math.min(Math.max(center[0], cell.x0), cell.x1);
    const nz = Math.min(Math.max(center[1], cell.z0), cell.z1);
    return Math.hypot(nx - center[0], nz - center[1]) <= radius;
  });
}
