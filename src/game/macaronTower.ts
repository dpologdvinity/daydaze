// Sucre's macaron tower: each new macaron slides back and forth over the
// tower; drop it, and whatever hangs past the one below falls away, so the
// next is that much narrower. Drop within a whisker of dead center and it
// keeps its size. Miss the tower entirely and it's over. Pure: the client
// feeds in where the slider was when the player dropped.

/** A full macaron's width, and how close counts as perfect. */
export const WIDTH = 1;
export const PERFECT = 0.03;
/** The slider sweeps this far either side of the tower's center. */
export const SWEEP = 1.2;
/** Sweeps per second at the start; each layer is a little quicker. */
const BASE_SPEED = 0.35;
const SPEED_STEP = 0.025;

export type Layer = { x: number; width: number };
export type Tower = {
  layers: readonly Layer[];
  perfects: number;
  over: boolean;
};

export const newTower = (): Tower => ({
  layers: [{ x: 0, width: WIDTH }],
  perfects: 0,
  over: false,
});

export const top = (t: Tower): Layer =>
  t.layers[t.layers.length - 1] ?? { x: 0, width: WIDTH };

/** Macarons stacked on the base. */
export const height = (t: Tower) => t.layers.length - 1;

/** Where the sliding macaron is `seconds` into its sweep: a back-and-forth
 * from -SWEEP to SWEEP, quicker as the tower grows. */
export function sliderAt(t: Tower, seconds: number): number {
  const speed = BASE_SPEED + height(t) * SPEED_STEP;
  const phase = (((seconds * speed) % 1) + 1) % 1;
  // a triangle wave, starting at the left edge
  return -SWEEP + (phase < 0.5 ? phase * 2 : 2 - phase * 2) * 2 * SWEEP;
}

/** Drops the next macaron at `x`: it keeps only its overlap with the top. */
export function drop(t: Tower, x: number): { tower: Tower; perfect: boolean } {
  if (t.over) return { tower: t, perfect: false };
  const below = top(t);
  if (Math.abs(x - below.x) <= PERFECT)
    return {
      tower: {
        ...t,
        layers: [...t.layers, { x: below.x, width: below.width }],
        perfects: t.perfects + 1,
      },
      perfect: true,
    };
  const left = Math.max(x - below.width / 2, below.x - below.width / 2);
  const right = Math.min(x + below.width / 2, below.x + below.width / 2);
  if (right - left <= 0.02)
    return { tower: { ...t, over: true }, perfect: false };
  return {
    tower: {
      ...t,
      layers: [...t.layers, { x: (left + right) / 2, width: right - left }],
    },
    perfect: false,
  };
}

/** Points: 10 a macaron, 5 more for each perfect drop. */
export const towerScore = (t: Tower) => height(t) * 10 + t.perfects * 5;
