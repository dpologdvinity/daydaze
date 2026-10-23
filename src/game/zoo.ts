// The Daydaze Zoo, behind its gate on Park Avenue in Uptown: a loop of
// paths past five fenced habitats: the savanna (giraffes and zebras), the
// elephants, the lions' rocks, the penguins' pool and the flamingo pond.
// One layout, shared by the room's floor and blockers (rooms.ts) and the
// client's scene, which walks the animals round inside their habitats.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -20, x1: 20, z0: -16, z1: 14 } as const;
export const SPAWN: Vec2 = [0, 12.4];
export const EXIT: Vec2 = [0, 13.4];
export const ZOO_DOOR = {
  position: [374, -245.5] as const,
  landing: [374, -249.5] as const,
};

export type Habitat =
  "savanna" | "elephants" | "lions" | "penguins" | "flamingos";
export type Rect = { x0: number; z0: number; x1: number; z1: number };

/** Each habitat's fenced rectangle. */
export const HABITATS: Record<Habitat, Rect> = {
  savanna: { x0: -19, z0: -15, x1: -5, z1: -4 },
  elephants: { x0: 5, z0: -15, x1: 19, z1: -4 },
  flamingos: { x0: -3, z0: -15, x1: 3, z1: -9 },
  lions: { x0: -19, z0: 0, x1: -7, z1: 9 },
  penguins: { x0: 7, z0: 0, x1: 19, z1: 9 },
};

/** Where an animal walking a loop round its habitat is at `t` seconds: an
 * ellipse inset from the fence, and the way it faces (yaw, walk.ts). */
export function loopAt(
  h: Rect,
  t: number,
  speed: number,
  phase: number,
): { at: Vec2; yaw: number } {
  const cx = (h.x0 + h.x1) / 2;
  const cz = (h.z0 + h.z1) / 2;
  const rx = (h.x1 - h.x0) / 2 - 1.6;
  const rz = (h.z1 - h.z0) / 2 - 1.6;
  const a = phase + (t * speed) / Math.max(rx, rz);
  const at: Vec2 = [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz];
  // the tangent, turned to the walk convention (0 faces +z)
  const dx = -Math.sin(a) * rx;
  const dz = Math.cos(a) * rz;
  return { at, yaw: Math.atan2(dx, dz) };
}

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = Object.values(
  HABITATS,
).map((h) => box(h.x0, h.z0, h.x1, h.z1));

export type Species =
  "giraffe" | "zebra" | "elephant" | "lion" | "penguin" | "flamingo";

/** The four-legged animals, each walking its habitat's loop. */
export const WALKERS: readonly {
  kind: "giraffe" | "zebra" | "elephant" | "lion";
  home: Habitat;
  speed: number;
  phase: number;
}[] = [
  { kind: "giraffe", home: "savanna", speed: 0.7, phase: 0 },
  { kind: "giraffe", home: "savanna", speed: 0.7, phase: 2.2 },
  { kind: "zebra", home: "savanna", speed: 1.1, phase: 1 },
  { kind: "zebra", home: "savanna", speed: 1.1, phase: 3.4 },
  { kind: "zebra", home: "savanna", speed: 1.1, phase: 4.8 },
  { kind: "elephant", home: "elephants", speed: 0.5, phase: 0 },
  { kind: "elephant", home: "elephants", speed: 0.5, phase: 3.1 },
  { kind: "lion", home: "lions", speed: 0.6, phase: 0.5 },
  { kind: "lion", home: "lions", speed: 0.6, phase: 3.6 },
];

export const PENGUINS = 6;
export const FLAMINGOS = 6;

/** Penguin `i` waddling round the pool. */
export const penguinAt = (i: number, t: number) =>
  loopAt(HABITATS.penguins, t, 0.5, (i / PENGUINS) * Math.PI * 2);

/** Flamingo `i`, standing in its spot in the pond. */
export function flamingoAt(i: number): Vec2 {
  const h = HABITATS.flamingos;
  return [
    h.x0 + 1 + (i % 3) * ((h.x1 - h.x0 - 2) / 2),
    h.z0 + 1.6 + Math.floor(i / 3) * 2.6,
  ];
}

/** Every animal and where it is at `t` seconds of the scene's clock. */
export function animalsAt(t: number): { kind: Species; at: Vec2 }[] {
  return [
    ...WALKERS.map((w) => ({
      kind: w.kind,
      at: loopAt(HABITATS[w.home], t, w.speed, w.phase).at,
    })),
    ...Array.from({ length: PENGUINS }, (_, i) => ({
      kind: "penguin" as const,
      at: penguinAt(i, t).at,
    })),
    ...Array.from({ length: FLAMINGOS }, (_, i) => ({
      kind: "flamingo" as const,
      at: flamingoAt(i),
    })),
  ];
}
