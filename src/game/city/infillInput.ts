// What the infill planner reads of the layout: the hand-placed layout only
// (no infill), so planning is a pure function of the static city. Shared by
// scripts/gen-infill.ts and infill.test.ts.
import type { Vec2 } from "../walk.ts";
import {
  BASE_BUILDINGS,
  BASE_SOLIDS,
  CITY_BOUNDS,
  CITY_SURFACES,
  SHORE_Z,
  type Neighborhood,
} from "./layout.ts";
import type { InfillInput } from "./infill.ts";

/** The planner's input: the base layout, north to the shore, west to east. */
export function infillInput(
  neighborhoodAt: (p: Vec2) => Neighborhood,
): InfillInput {
  const xs = CITY_BOUNDS.map((p) => p[0]);
  const zs = CITY_BOUNDS.map((p) => p[1]);
  return {
    surfaces: CITY_SURFACES.map((s) => s.polygon),
    solids: BASE_SOLIDS,
    buildings: BASE_BUILDINGS.map((b) => b.footprint),
    bounds: {
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      z0: Math.min(...zs),
      z1: SHORE_Z,
    },
    neighborhoodAt,
  };
}
