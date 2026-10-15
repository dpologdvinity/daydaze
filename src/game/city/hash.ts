// Stable pseudo-random picks, shared by the dressing and the detail pass, so
// the same place always dresses the same way on every load.

function fract(v: number): number {
  return v - Math.floor(v);
}

/** A stable 0..1 number for a place, so the same spot always dresses the same. */
export function hash(...n: number[]): number {
  let h = 0.37;
  for (const v of n) h = fract(Math.sin(h * 91.3 + v * 17.7) * 43758.5453);
  return h;
}

export function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}
