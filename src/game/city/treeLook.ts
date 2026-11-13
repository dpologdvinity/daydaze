// The color of each street tree's leaves, as a multiplier on the leaf texture
// (which is a fresh green): every tree gets its own shade of green, and in
// autumn most stay green while a few turn gold, orange or red, so a street
// reads as a real one in October and not as one yellow wash. Pure and
// deterministic: the same tree at the same spot is the same color on every
// reload (CityTrees.tsx writes these as per-instance colors).
import { hash, pick } from "./hash.ts";

/** A red, green, blue multiplier; autumn's go past 1 on red to push the texture's green to orange. */
export type Tint = readonly [number, number, number];

/** The greens: leaf green, yellow-green and blue-green. */
const GREENS: readonly Tint[] = [
  [0.62, 0.92, 0.5],
  [0.72, 0.94, 0.5],
  [0.55, 0.88, 0.62],
];
/** Autumn's turned leaves: gold, orange, red. */
const TURNED: readonly Tint[] = [
  [1.55, 0.98, 0.5],
  [2.0, 0.72, 0.4],
  [1.8, 0.42, 0.4],
];
/** Share of trees that have turned in autumn; the rest stay green. */
export const TURNED_SHARE = 0.25;

/** The leaf tint of the tree at (x, z); `autumn` lets some turn. */
export function leafTint(x: number, z: number, autumn: boolean): Tint {
  const shade = 0.9 + hash(x, z, 5) * 0.2;
  const [r, g, b] =
    autumn && hash(x, z, 6) < TURNED_SHARE
      ? pick(TURNED, hash(x, z, 7))
      : pick(GREENS, hash(x, z, 8));
  return [r * shade, g * shade, b * shade];
}
