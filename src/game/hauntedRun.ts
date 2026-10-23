// The haunted house as a game: find the way out. Every room has three doors
// and one leads deeper; the others hold something that jumps out at you
// (a scare, never gore) and costs nerve. Reach the exit eight rooms in
// before your nerve runs out. Pure and seeded.

export const DEPTH = 8;
export const NERVE = 3;
/** Points for each bit of nerve left, and for getting out at all. */
const NERVE_POINTS = 100;
const ESCAPE_POINTS = 200;

export type Run = {
  seed: number;
  depth: number;
  nerve: number;
  escaped: boolean;
};

export const newRun = (seed: number): Run => ({
  seed,
  depth: 0,
  nerve: NERVE,
  escaped: false,
});

/** Which door (0 left, 1 ahead, 2 right) leads on from room `depth`. */
export function rightDoor(seed: number, depth: number): number {
  const h = Math.imul((seed ^ (depth * 0x9e3779b1)) >>> 0, 0x85ebca6b) >>> 0;
  return (h >>> 7) % 3;
}

export const runOver = (r: Run) => r.escaped || r.nerve <= 0;

export function open(r: Run, door: number): { run: Run; scared: boolean } {
  if (runOver(r)) return { run: r, scared: false };
  if (door === rightDoor(r.seed, r.depth)) {
    const depth = r.depth + 1;
    return { run: { ...r, depth, escaped: depth >= DEPTH }, scared: false };
  }
  return { run: { ...r, nerve: r.nerve - 1 }, scared: true };
}

export const runScore = (r: Run) =>
  r.escaped ? r.nerve * NERVE_POINTS + ESCAPE_POINTS : 0;
