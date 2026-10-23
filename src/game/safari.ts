// Safari photo hunt at the Daydaze Zoo: a list of four animals to
// photograph in two minutes. Face one, close enough, and snap: everything
// on the list in the frame gets ticked, and closer shots score more. Pure:
// the client passes where the animals are (zoo.ts animalsAt) at the snap.
import type { Vec2 } from "./walk.ts";
import type { Species } from "./zoo.ts";

export const HUNT_SECONDS = 120;
export const LIST_SIZE = 4;
/** How far the camera reaches, and half its field of view. */
export const RANGE = 14;
export const HALF_FOV = (35 * Math.PI) / 180;
const SHOT_POINTS = 25;
const CLOSE_BONUS = 15;

export const SPECIES: readonly { id: Species; label: string }[] = [
  { id: "giraffe", label: "Giraffe" },
  { id: "zebra", label: "Zebra" },
  { id: "elephant", label: "Elephant" },
  { id: "lion", label: "Lion" },
  { id: "penguin", label: "Penguin" },
  { id: "flamingo", label: "Flamingo" },
];

/** Four different animals, picked by the seed. */
export function huntList(seed: number): Species[] {
  const pool = SPECIES.map((s) => s.id);
  const out: Species[] = [];
  let h = seed >>> 0 || 1;
  while (out.length < LIST_SIZE) {
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
    const pick = pool.splice(h % pool.length, 1)[0];
    if (pick) out.push(pick);
  }
  return out;
}

/** How centered and close `at` is from `from` facing `yaw` (0 faces +z):
 * null when out of frame, else 0 (edge, far) to 1 (dead center, close). */
export function framing(from: Vec2, yaw: number, at: Vec2): number | null {
  const dx = at[0] - from[0];
  const dz = at[1] - from[1];
  const dist = Math.hypot(dx, dz);
  if (dist > RANGE || dist < 0.01) return null;
  const turn = Math.atan2(dx, dz) - yaw;
  const off = Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn)));
  if (off > HALF_FOV) return null;
  return (1 - dist / RANGE) * 0.7 + (1 - off / HALF_FOV) * 0.3;
}

export type Hunt = {
  list: readonly Species[];
  /** What's been photographed, with the points each shot scored. */
  shots: readonly { kind: Species; points: number }[];
};

export const newHunt = (seed: number): Hunt => ({
  list: huntList(seed),
  shots: [],
});

export const huntDone = (h: Hunt) => h.shots.length >= h.list.length;
export const huntScore = (h: Hunt) =>
  h.shots.reduce((sum, s) => sum + s.points, 0);

/** A full list early earns a point for each second left. */
export const finalScore = (h: Hunt, secondsLeft: number) =>
  huntScore(h) + (huntDone(h) ? Math.max(0, Math.floor(secondsLeft)) : 0);

/** Snap: every listed animal not yet shot, best framed of its kind. */
export function snap(
  h: Hunt,
  from: Vec2,
  yaw: number,
  animals: readonly { kind: Species; at: Vec2 }[],
): { hunt: Hunt; got: Species[] } {
  const best = new Map<Species, number>();
  for (const a of animals) {
    if (!h.list.includes(a.kind) || h.shots.some((s) => s.kind === a.kind))
      continue;
    const f = framing(from, yaw, a.at);
    if (f !== null && f > (best.get(a.kind) ?? -1)) best.set(a.kind, f);
  }
  const got = [...best.keys()];
  return {
    hunt: {
      ...h,
      shots: [
        ...h.shots,
        ...got.map((kind) => ({
          kind,
          points: SHOT_POINTS + Math.round((best.get(kind) ?? 0) * CLOSE_BONUS),
        })),
      ],
    },
    got,
  };
}
