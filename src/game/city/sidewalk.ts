// Whether a city point is on a sidewalk, for the places the street shows
// (a rare trip, game/reactions.ts). The sidewalks are plain rectangles
// (layout.ts), so each is kept as a box. Pure.

import { CITY_SURFACES } from "./layout.ts";

const BOXES = CITY_SURFACES.filter((s) => s.kind === "sidewalk").map((s) => {
  const xs = s.polygon.map(([x]) => x);
  const zs = s.polygon.map(([, z]) => z);
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
});

/** Whether (x, z) is on a sidewalk strip. */
export function onSidewalk(x: number, z: number): boolean {
  return BOXES.some(
    ([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1,
  );
}
