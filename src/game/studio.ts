// Loft Studios on Gallery Row: a rehearsal loft with a grand piano, a drum
// kit, a marimba and a light-up floor piano. Walk up to one (or pick it on
// the panel) and play its eight notes from the panel or the keys 1 to 8.
// One layout, shared by the room's floor and blockers (rooms.ts) and the
// client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -8, x1: 8, z0: -6, z1: 6 } as const;
export const SPAWN: Vec2 = [0, 4.6];
export const EXIT: Vec2 = [0, 5.6];
export const STUDIO_DOOR = {
  position: [-168, -266.4] as const,
  landing: [-168, -263] as const,
};

export type Station = "piano" | "drums" | "marimba" | "floor_piano";

/** Each instrument: where it stands, its footprint and where you play it. */
export const STATIONS: Record<
  Station,
  { at: Vec2; half: Vec2; player: Vec2; walkOn?: true }
> = {
  piano: { at: [-4.6, -3.4], half: [1, 1.3], player: [-4.6, -1.6] },
  drums: { at: [4.4, -3.6], half: [1.2, 1], player: [4.4, -2] },
  marimba: { at: [0, -4.4], half: [1.2, 0.45], player: [0, -3.4] },
  // the floor piano lies flat: you walk on it
  floor_piano: {
    at: [0, 1.2],
    half: [2.4, 0.7],
    player: [0, 1.2],
    walkOn: true,
  },
};

/** The station you're standing at, within 1.6 m of where it's played. */
export function stationNear(p: Vec2): Station | null {
  let best: Station | null = null;
  let bestD = 1.6;
  for (const [id, s] of Object.entries(STATIONS)) {
    const d = Math.hypot(p[0] - s.player[0], p[1] - s.player[1]);
    if (d <= bestD && isStation(id)) {
      best = id;
      bestD = d;
    }
  }
  return best;
}

export function isStation(id: string): id is Station {
  return id in STATIONS;
}

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = Object.values(STATIONS)
  .filter((s) => !s.walkOn)
  .map(({ at: [x, z], half: [hx, hz] }) => box(x - hx, z - hz, x + hx, z + hz));
