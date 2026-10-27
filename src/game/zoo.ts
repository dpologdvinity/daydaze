// The Daydaze Zoo, behind its gate on Park Avenue in Uptown: a loop of
// paths past six fenced habitats: the savanna (giraffes and zebras), the
// elephants, the lions' rocks, the penguins' pool, the flamingo pond and the
// petting farm (alpacas, a donkey and a cow, animated GLBs).
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
  "savanna" | "elephants" | "lions" | "penguins" | "flamingos" | "farm";
export type Rect = { x0: number; z0: number; x1: number; z1: number };

/** Each habitat's fenced rectangle. */
export const HABITATS: Record<Habitat, Rect> = {
  savanna: { x0: -19, z0: -15, x1: -5, z1: -4 },
  elephants: { x0: 5, z0: -15, x1: 19, z1: -4 },
  flamingos: { x0: -3, z0: -15, x1: 3, z1: -9 },
  lions: { x0: -19, z0: 0, x1: -7, z1: 9 },
  penguins: { x0: 7, z0: 0, x1: 19, z1: 9 },
  farm: { x0: -5, z0: 0, x1: 5, z1: 8 },
};

/** The petting farm's animals: each wanders its own loop, `inset` meters
 * inside the fence on top of loopAt's own, `speed` in meters per second. */
export const FARM_ANIMALS: readonly {
  kind: "alpaca" | "donkey" | "cow";
  inset: number;
  speed: number;
  phase: number;
  dir: 1 | -1;
}[] = [
  { kind: "alpaca", inset: 0, speed: 0.6, phase: 0, dir: 1 },
  { kind: "alpaca", inset: 0.6, speed: 0.5, phase: 2.6, dir: -1 },
  { kind: "donkey", inset: 1.2, speed: 0.7, phase: 4.4, dir: 1 },
  { kind: "cow", inset: 0, speed: 0.4, phase: 1.3, dir: -1 },
];

/** The farm animals that call (the cow and the donkey) at `t` seconds, near
 * where they wander; the calls are distant, so the loop's phase is enough. */
export function farmVoicesAt(
  t: number,
): { kind: "cow" | "donkey"; at: Vec2 }[] {
  return FARM_ANIMALS.flatMap((a) => {
    if (a.kind === "alpaca") return [];
    const h = HABITATS.farm;
    const pen = {
      x0: h.x0 + a.inset,
      z0: h.z0 + a.inset,
      x1: h.x1 - a.inset,
      z1: h.z1 - a.inset,
    };
    return [{ kind: a.kind, at: loopAt(pen, t, a.speed, a.phase).at }];
  });
}

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

/** A placed prop: where, which way (rotation about y) and its scale per axis. */
export type Spot = {
  x: number;
  z: number;
  yaw: number;
  sx: number;
  sy: number;
  sz: number;
};

/** Fence panel length (meters) the fence model is stretched to, about. */
const PANEL = 2.2;
/** Panel height scale: Kenney's fence is 0.35 m tall at scale 1. */
const FENCE_K = 2.4;

/** Fence panels round each of `rects`, end to end: a model `modelLength`
 * meters long along x gets an x scale that makes a whole number of panels fill
 * every side exactly, and `height` scales it up and thick. */
export function rectFenceSpots(
  rects: readonly Rect[],
  modelLength: number,
  height: number,
  panel = PANEL,
  overlap = 1,
): Spot[] {
  const out: Spot[] = [];
  for (const h of rects) {
    const sides: [number, number, number, number][] = [
      [h.x0, h.z0, h.x1, h.z0],
      [h.x1, h.z0, h.x1, h.z1],
      [h.x1, h.z1, h.x0, h.z1],
      [h.x0, h.z1, h.x0, h.z0],
    ];
    for (const [ax, az, bx, bz] of sides) {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / panel));
      const seg = len / n;
      for (let k = 0; k < n; k++) {
        const f = (k + 0.5) / n;
        out.push({
          x: ax + (bx - ax) * f,
          z: az + (bz - az) * f,
          // the model's length runs along x: turn x onto the side's direction
          yaw: Math.atan2(-(bz - az), bx - ax),
          // overlap closes the gaps a model's open ends would leave
          sx: (seg / modelLength) * overlap,
          sy: height,
          sz: height,
        });
      }
    }
  }
  return out;
}

/** The Zoo's fence panels (Kenney's is 1 m long). */
export const fenceSpots = (): Spot[] =>
  rectFenceSpots(Object.values(HABITATS), 1, FENCE_K);

export const FENCE_SPOTS = fenceSpots();

const spot = (x: number, z: number, yaw: number, k: number): Spot => ({
  x,
  z,
  yaw,
  sx: k,
  sy: k,
  sz: k,
});

/** Rock piles: tall ones are the lions' rocks, large ones edge the penguins'
 * pool. Kenney's rocks are about a meter, so the scale is meters. */
export const ROCK_SPOTS = {
  tall: [
    spot(-13, 4.5, 0.3, 3.2),
    spot(-11.2, 3.4, 2.1, 2.4),
    spot(-14.6, 5.8, 4, 2.6),
    spot(-12.3, 6.2, 1.2, 2),
  ],
  large: [
    spot(9.2, 1.8, 0.4, 2.2),
    spot(16.8, 7.4, 2.2, 2.4),
    spot(9.8, 7.6, 4.1, 1.8),
    spot(16.2, 1.6, 1, 2),
  ],
} as const satisfies Record<string, readonly Spot[]>;

/** Shade trees in the savanna and by the paths: Quaternius' common tree,
 * which is about 8 m tall, brought down to a zoo tree. */
export const TREE_SPOTS: readonly Spot[] = [
  [-16.5, -12.5, 0.5],
  [-7.5, -6, 0.42],
  [16.5, -6, 0.46],
  [5, 11.5, 0.38],
  [12, 11, 0.42],
  [-12, 11.5, 0.42],
].map(([x, z, k], i) => spot(x ?? 0, z ?? 0, i * 1.3, k ?? 0.4));
