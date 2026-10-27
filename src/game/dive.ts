// Scuba diving on the reef: the diver's air, the sea life she can spot, the
// species log and its score, and the reef's seeded layout (coral ridges, kelp,
// the wreck, each school and loner). Pure: the client draws and animates it,
// and checks sightings with `canSee`.

import type { Vec2 } from "./walk.ts";

/** Seconds of air in a fresh tank at the surface's pressure. */
export const AIR_SECONDS = 210;
/** Below this many seconds left the gauge warns; at 0 she must go up. */
export const LOW_AIR = 45;

/** Meters of water over the reef floor at a point: it deepens going out. */
export function depthAt(_x: number, z: number): number {
  return Math.max(4, 5 + (SPAWN[1] - z) * 0.22);
}

/** Air used per second at a depth: pressure adds an atmosphere every 10 m. */
export function drainPerSecond(depth: number): number {
  return 1 + Math.max(0, depth) / 10;
}

/** The air left after `dt` seconds at `depth` (never below 0). */
export function stepAir(air: number, depth: number, dt: number): number {
  return Math.max(0, air - drainPerSecond(depth) * dt);
}

export type Gauge = "ok" | "low" | "out";

export function gaugeOf(air: number): Gauge {
  return air <= 0 ? "out" : air <= LOW_AIR ? "low" : "ok";
}

/** A fresh tank's share (0..1), for the gauge's needle. */
export const airShare = (air: number): number =>
  Math.min(1, Math.max(0, air / AIR_SECONDS));

// ----------------------------------------------------------------- the reef

export const SPAWN: Vec2 = [0, 3.2];
/** The ladder up to the dive buoy. */
export const LADDER: Vec2 = [0, 5.2];
export const FLOOR: readonly Vec2[] = [
  [-24, -48],
  [24, -48],
  [24, 6.2],
  [-24, 6.2],
];
/** The wreck and how close counts as exploring it. */
export const WRECK = { at: [-10, -27] as Vec2, yaw: 0.6, radius: 7 } as const;

/** What can be spotted. `id` is also the creature kind the client draws. */
export const SPECIES = [
  { id: "cute-clownfish", label: "Clownfish" },
  { id: "cute-butterflyfish", label: "Butterflyfish" },
  { id: "cute-lionfish", label: "Lionfish" },
  { id: "cute-mandarinfish", label: "Mandarinfish" },
  { id: "cute-puffer", label: "Pufferfish" },
  { id: "cute-bluetang", label: "Blue tang" },
  { id: "cute-yellowtang", label: "Yellow tang" },
  { id: "cute-zebraclownfish", label: "Zebra clownfish" },
  { id: "grouper", label: "Coral grouper" },
  { id: "turtle", label: "Sea turtle" },
  { id: "manta-ray", label: "Manta ray" },
  { id: "shark", label: "Reef shark" },
  { id: "whale", label: "Whale" },
  { id: "crab", label: "Crab" },
] as const;
export type SpeciesId = (typeof SPECIES)[number]["id"];

export const isSpecies = (v: unknown): v is SpeciesId =>
  SPECIES.some((s) => s.id === v);

export const speciesLabel = (id: SpeciesId): string =>
  SPECIES.find((s) => s.id === id)?.label ?? id;

/** One group of creatures: where it lives and how it moves. */
export type Life = {
  species: SpeciesId;
  /** Home point on the floor plan, and meters above the seabed. */
  at: Vec2;
  above: number;
  /** Circling radius (a school's spread, a patrol's loop). */
  radius: number;
  count: number;
  /** Radians per second round the home point. */
  turn: number;
};

export const LIFE: readonly Life[] = [
  {
    species: "cute-clownfish",
    at: [7, -5],
    above: 1.1,
    radius: 1.4,
    count: 4,
    turn: 0.5,
  },
  {
    species: "cute-butterflyfish",
    at: [-6, -9],
    above: 1.8,
    radius: 2,
    count: 2,
    turn: -0.45,
  },
  {
    species: "cute-lionfish",
    at: [-6, -23],
    above: 1.4,
    radius: 1.2,
    count: 1,
    turn: 0.25,
  },
  {
    species: "cute-mandarinfish",
    at: [12, -16],
    above: 0.9,
    radius: 1.3,
    count: 1,
    turn: 0.4,
  },
  {
    species: "cute-puffer",
    at: [-14, -14],
    above: 2.4,
    radius: 1.8,
    count: 1,
    turn: -0.3,
  },
  {
    species: "cute-bluetang",
    at: [4, -20],
    above: 2.2,
    radius: 2.8,
    count: 5,
    turn: 0.55,
  },
  {
    species: "cute-yellowtang",
    at: [-3, -10],
    above: 1.6,
    radius: 2.4,
    count: 5,
    turn: -0.6,
  },
  {
    species: "cute-zebraclownfish",
    at: [15, -27],
    above: 1.2,
    radius: 1.4,
    count: 2,
    turn: 0.5,
  },
  {
    species: "grouper",
    at: [-12, -30],
    above: 1.5,
    radius: 3,
    count: 1,
    turn: 0.18,
  },
  {
    species: "turtle",
    at: [8, -33],
    above: 3.2,
    radius: 9,
    count: 1,
    turn: 0.1,
  },
  {
    species: "manta-ray",
    at: [0, -36],
    above: 5.5,
    radius: 12,
    count: 1,
    turn: 0.12,
  },
  {
    species: "shark",
    at: [-4, -42],
    above: 3.6,
    radius: 11,
    count: 1,
    turn: -0.14,
  },
  {
    species: "whale",
    at: [10, -45],
    above: 8,
    radius: 14,
    count: 1,
    turn: 0.05,
  },
  { species: "crab", at: [-8, -24], above: 0, radius: 2, count: 1, turn: 0.2 },
];

/** Individuals drawn at once: the reef's creature budget on the low tier. */
export const LIFE_COUNT = LIFE.reduce((n, l) => n + l.count, 0);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A placed prop: which model, where, how it faces and how big. */
export type Placed = { kind: number; at: Vec2; yaw: number; scale: number };

/**
 * The reef's coral ridges (`kind` 0-5 is the coral set) and kelp stands,
 * scattered over the floor in clumps, kept off the spawn and the wreck.
 */
export function reefPlan(seed = 7): { coral: Placed[]; kelp: Placed[] } {
  const random = rng(seed);
  const coral: Placed[] = [];
  const kelp: Placed[] = [];
  const free = (x: number, z: number) =>
    Math.hypot(x - SPAWN[0], z - SPAWN[1]) > 4.5 &&
    Math.hypot(x - WRECK.at[0], z - WRECK.at[1]) > WRECK.radius + 0.5;
  for (let i = 0; coral.length < 26 && i < 400; i++) {
    const x = (random() * 2 - 1) * 21;
    const z = SPAWN[1] - 2 - random() * 44;
    if (!free(x, z)) continue;
    coral.push({
      kind: Math.floor(random() * 6),
      at: [x, z],
      yaw: random() * Math.PI * 2,
      scale: 0.7 + random() * 0.8,
    });
  }
  for (let i = 0; kelp.length < 40 && i < 600; i++) {
    const x = (random() * 2 - 1) * 22;
    const z = SPAWN[1] - 3 - random() * 44;
    if (!free(x, z)) continue;
    kelp.push({
      kind: 0,
      at: [x, z],
      yaw: random() * Math.PI * 2,
      scale: 0.8 + random() * 0.9,
    });
  }
  return { coral, kelp };
}

// ------------------------------------------------------------ the species log

/** What a diver has seen this dive. */
export type Log = { seen: readonly SpeciesId[]; wreck: boolean };

export const NEW_LOG: Log = { seen: [], wreck: false };

/** The log with `id` added (once). */
export function spot(log: Log, id: SpeciesId): Log {
  return log.seen.includes(id) ? log : { ...log, seen: [...log.seen, id] };
}

/** The log once she has swum into the wreck's zone. */
export const exploreWreck = (log: Log): Log =>
  log.wreck ? log : { ...log, wreck: true };

/** Whether a point is inside the wreck's zone. */
export function atWreck(p: Vec2): boolean {
  return Math.hypot(p[0] - WRECK.at[0], p[1] - WRECK.at[1]) <= WRECK.radius;
}

/** How many kinds a diver has to find for the goal. */
export const GOAL = 5;

/** The dive's score: each species spotted, and two for exploring the wreck. */
export const scoreOf = (log: Log): number =>
  log.seen.length + (log.wreck ? 2 : 0);

/** How far, and how wide a view, counts as spotting something. */
export const SPOT_RANGE = 9;
export const SPOT_HALF_ANGLE = 1.0;

/**
 * Whether a creature at `target` is in the diver's sight: within range and
 * inside the cone in front of her (yaw 0 faces +z, as everywhere in the game).
 */
export function canSee(
  diver: Vec2,
  yaw: number,
  target: Vec2,
  range = SPOT_RANGE,
  half = SPOT_HALF_ANGLE,
): boolean {
  const dx = target[0] - diver[0];
  const dz = target[1] - diver[1];
  const d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d < 0.5) return true;
  const off = Math.atan2(dx, dz) - yaw;
  const wrapped = Math.atan2(Math.sin(off), Math.cos(off));
  return Math.abs(wrapped) <= half;
}

/** Whether a dive may start: gear is rented, and the room is the reef. */
export function mayDive(room: string, gear: boolean): boolean {
  return room !== "reef-dive" || gear;
}
