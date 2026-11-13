// The far city: every building the near plan does not draw, as one plain box.
// The streamed plan (plan.ts) only draws the cells within VIEW_RADIUS, and the
// infill only within its own range, so from the overview, the El, the Ferris
// wheel or a rooftop the blocks past that were bare ground and haze. A far box
// is a building's footprint and height with a wall color (its style, tinted by
// district); the client draws them all as one instanced mesh whose shader adds
// the windows, roof and night lights, so the whole far city is one draw and a
// dozen triangles a building. Roads are drawn the same way (FAR_ROADS), one
// flat strip each, so the blocks read as blocks.
import type { Vec2 } from "../walk.ts";
import { neighborhoodAt } from "./cells.ts";
import {
  BUILDINGS,
  CITY_SURFACES,
  type Building,
  type BuildingStyle,
} from "./layout.ts";

/** A building seen from far off: its box and wall color (hex). */
export type FarBox = {
  x: number;
  z: number;
  sx: number;
  sz: number;
  h: number;
  color: string;
};

/** Triangles a far box costs (a unit cube without its floor) and a far road strip (its top). */
export const FAR_BOX_TRIANGLES = 10;

/** Boxes farther off than this are in the fog already (CityScene's fog is
 * solid by 590 m at noon, 420 m at night), so they are not drawn. */
export const FAR_RANGE = 560;

/** A far box is skipped when its biggest side is under this share of its
 * distance (a 9 m house past 180 m is a speck): the small ones drop out
 * first as the range grows, the towers last. */
export const FAR_MIN_SIZE = 0.05;

/** Whether a far box `size` meters across (its longest side or height) is worth drawing `distance` meters off. */
export const farWorthDrawing = (size: number, distance: number): boolean =>
  distance <= FAR_RANGE && size >= distance * FAR_MIN_SIZE;
export const FAR_ROAD_TRIANGLES = 2;

/** The walls' look at a distance: what the photo textures and tints average to
 * (plan.ts BODY_COLOR over brick, stucco, concrete and siding). */
const WALL: Record<BuildingStyle, string> = {
  tower: "#6d739f",
  glass: "#6c86b8",
  billboard: "#7b6a9c",
  storefront: "#a8705c",
  deck: "#8a8798",
  brick: "#a66a56",
  club: "#8d6aa8",
  warehouse: "#7e8088",
  velvet: "#b0608e",
  gate: "#7a6da0",
};

/** Each district's cast over its walls: [r, g, b] multipliers. */
const DISTRICT: Record<ReturnType<typeof neighborhoodAt>, readonly number[]> = {
  downtown: [1, 1, 1],
  "nightlife-row": [0.95, 0.88, 1.12],
  "little-manila": [1.12, 1.02, 0.86],
  "chinatown-koreatown": [1.14, 0.88, 0.84],
  "arts-district": [0.9, 1.04, 1.08],
  uptown: [0.92, 0.98, 1.12],
  suburbia: [1.1, 1.06, 0.98],
  beachside: [1.08, 1.04, 1.04],
  fairground: [1.1, 0.95, 1.05],
};

/** A stable 0..1 from a string, so a building keeps its shade. */
function unit(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const channel = (v: number): string =>
  Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, "0");

/** A wall color: the building's own paint, else its style's, cast by its district and shaded a little. */
function wallColor(b: Building, cx: number, cz: number): string {
  const base = b.color ?? WALL[b.style];
  const cast = DISTRICT[neighborhoodAt([cx, cz])];
  const shade = 0.88 + 0.24 * unit(b.id);
  const rgb = [1, 3, 5].map((i, k) =>
    Math.round(parseInt(base.slice(i, i + 2), 16) * (cast[k] ?? 1) * shade),
  );
  return `#${rgb.map(channel).join("")}`;
}

const boxes = new Map<string, FarBox>();

/** `b` as a far box (memoized: the box never changes). */
export function farBoxOf(b: Building): FarBox {
  const hit = boxes.get(b.id);
  if (hit) return hit;
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const x = (x0 + x1) / 2;
  const z = (z0 + z1) / 2;
  const box = {
    x,
    z,
    sx: x1 - x0,
    sz: z1 - z0,
    h: b.height,
    color: wallColor(b, x, z),
  };
  boxes.set(b.id, box);
  return box;
}

/** Every road's rectangle: `[x0, z0, x1, z1]`. */
export const FAR_ROADS: readonly (readonly [number, number, number, number])[] =
  CITY_SURFACES.filter((s) => s.kind === "road").map(
    ({ polygon }): [number, number, number, number] => {
      const xs = polygon.map(([x]: Vec2) => x);
      const zs = polygon.map(([, z]: Vec2) => z);
      return [
        Math.min(...xs),
        Math.min(...zs),
        Math.max(...xs),
        Math.max(...zs),
      ];
    },
  );

/** How many far boxes the whole city can need at once (every building). */
export const FAR_CAPACITY = BUILDINGS.length;
