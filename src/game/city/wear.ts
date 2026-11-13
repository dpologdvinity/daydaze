// How Main Avenue wears under the El: the road is flat asphalt, and the
// trestle's shade is where a real avenue ages fastest. This lays out the
// marks, deterministically (hash.ts), as quads on the road: tire tracks down
// the lanes (denser at the lane centers), oil stains (the trains drip too),
// asphalt patches, storm drains in the curbs on the column line, and a few
// manhole covers. The client draws them from one atlas in one instanced mesh
// (AvenueWear.tsx); cross streets are left clear so the crosswalks stay
// crisp. The sun stripes through the deck's ties are a separate, lighter
// layer (SHADE_*), drawn as a texture band, not a mark.
import { hash } from "./hash.ts";
import { EL_DECK_Y, EL_X0, EL_X1, trestleColumns } from "./el.ts";
import { roadBoxes } from "./streetPieces.ts";

export type WearKind = "track" | "oil" | "patch" | "drain" | "cover";

/** A mark on the road: centered at (x, z), `sx` along the avenue by `sz` across, in meters. */
export type Wear = {
  kind: WearKind;
  x: number;
  z: number;
  sx: number;
  sz: number;
};

/** Marks sit a hair over the road (its top is at 0.04) and the lane dashes. */
export const WEAR_Y = 0.047;
/** Each mark is one quad. */
export const WEAR_TRIANGLES = 2;

/** The avenue's road, z from -7 to 7 under the trestle. */
const HALF = 7;
/** Lane centers (the double yellow is at z = 0). */
const LANES: readonly number[] = [-3.5, 3.5];
/** Cars' tires sit this far either side of a lane's center. */
const TRACK_OFFSET = 0.78;
/** Keep clear of a cross street's mouth by this much. */
const CLEAR = 9;

/** The cross streets' x spans over the avenue. */
const crossings = (): [number, number][] =>
  roadBoxes()
    .filter((r) => r.z0 < 0 && r.z1 > 0 && r.x1 - r.x0 < 30)
    .map((r): [number, number] => [r.x0, r.x1]);

const blocked = (x: number, spans: readonly [number, number][], reach = 0) =>
  spans.some(([a, b]) => x > a - CLEAR - reach && x < b + CLEAR + reach);

/** Every mark along the avenue, west to east. */
export function avenueWear(): Wear[] {
  const out: Wear[] = [];
  const spans = crossings();
  const columns = trestleColumns(spans.map(([a, b]) => (a + b) / 2));
  // tire tracks: two dark streaks a lane, in runs of 6 to 13 m with gaps
  for (const lane of LANES)
    for (const side of [-1, 1]) {
      for (let x = EL_X0; x < EL_X1;) {
        const len = 6 + 7 * hash(x, lane, side, 1);
        const gap = 1 + 5 * hash(x, lane, side, 2);
        const at = x + len / 2;
        if (!blocked(at, spans, len / 2))
          out.push({
            kind: "track",
            x: at,
            z:
              lane + side * TRACK_OFFSET + (hash(x, lane, side, 3) - 0.5) * 0.3,
            sx: len,
            sz: 0.5 + 0.2 * hash(x, lane, side, 4),
          });
        x += len + gap;
      }
    }
  // oil: a blob every so often, most under the deck where the trains drip
  for (let x = EL_X0 + 4; x < EL_X1; x += 7) {
    const r = hash(x, 11);
    const z = (hash(x, 12) - 0.5) * 2 * (r < 0.6 ? 3 : HALF - 1);
    if (r < 0.55 && !blocked(x, spans))
      out.push({
        kind: "oil",
        x,
        z,
        sx: 0.8 + 1.6 * hash(x, 13),
        sz: 0.7 + 1.2 * hash(x, 14),
      });
  }
  // patches: cut-and-fill rectangles in the lanes
  for (let x = EL_X0 + 10; x < EL_X1; x += 21) {
    const at = x + 8 * hash(x, 21);
    if (hash(x, 22) < 0.6 && !blocked(at, spans, 2))
      out.push({
        kind: "patch",
        x: at,
        z: LANES[hash(x, 23) < 0.5 ? 0 : 1]! + (hash(x, 24) - 0.5) * 2,
        sx: 2.4 + 3 * hash(x, 25),
        sz: 1.4 + 1.2 * hash(x, 26),
      });
  }
  // a storm drain in each curb on the column line, a cover every fourth pair
  columns.forEach((x, i) => {
    for (const side of [-1, 1])
      out.push({
        kind: "drain",
        x: x + 1.4,
        z: side * (HALF - 0.45),
        sx: 1.1,
        sz: 0.5,
      });
    if (i % 4 === 1)
      out.push({
        kind: "cover",
        x: x + 6,
        z: -2.6 + 5.2 * hash(x, 31),
        sx: 0.9,
        sz: 0.9,
      });
  });
  return out.sort((a, b) => a.x - b.x);
}

/** The deck's shade: a band down the avenue as wide as the deck and girders. */
export const SHADE = {
  x0: EL_X0 - 10,
  x1: EL_X1 + 10,
  width: 6.4,
  tie: 2.4,
} as const;

/** How far across the road the deck's shadow falls for a sun direction (toward the sun), meters, kept on the road. */
export function shadeOffset(sun: readonly [number, number, number]): number {
  const [, dy, dz] = sun;
  if (dy <= 0.05) return 0;
  // (+ 0 turns a -0 into 0)
  return Math.max(-4, Math.min(4, (-dz / dy) * EL_DECK_Y)) + 0;
}
