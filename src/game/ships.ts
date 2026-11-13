// The offshore fleet: the cruise liner, sail ship, Viking boat and lifeboat
// from Quaternius' Ships pack (public/models/ships/, art/marina/build_fleet.py),
// anchored beyond Starboard Marina's docks and off Beachside's waterline, and
// how they ride the swell. Pure data and math; src/client/city/Fleet.tsx draws
// them. Every name is invented.

import type { Vec2 } from "./walk.ts";

export type ShipKind = "cruise" | "sail" | "viking" | "lifeboat";

/** Each model's length in meters at scale 1, as art/marina/build_fleet.py sizes it. */
export const SHIP_LENGTH: Record<ShipKind, number> = {
  cruise: 150,
  sail: 26,
  viking: 12,
  lifeboat: 7,
};

/** How a kind rides at anchor: the most it heaves (m), rolls, pitches and
 * swings round its anchor (radians), how far it wanders (m), and the swell's
 * period (s). Big ships barely move. */
export const SHIP_SWAY: Record<
  ShipKind,
  {
    heave: number;
    roll: number;
    pitch: number;
    swing: number;
    drift: number;
    period: number;
  }
> = {
  cruise: {
    heave: 0.12,
    roll: 0.004,
    pitch: 0.002,
    swing: 0.015,
    drift: 5,
    period: 14,
  },
  sail: {
    heave: 0.16,
    roll: 0.03,
    pitch: 0.014,
    swing: 0.12,
    drift: 3,
    period: 7,
  },
  viking: {
    heave: 0.14,
    roll: 0.045,
    pitch: 0.02,
    swing: 0.15,
    drift: 2.5,
    period: 5.5,
  },
  lifeboat: {
    heave: 0.1,
    roll: 0.05,
    pitch: 0.025,
    swing: 0.2,
    drift: 1.2,
    period: 4.5,
  },
};

/** One ship at anchor. */
export type ShipSpec = {
  kind: ShipKind;
  /** An invented name. */
  name: string;
  /** Where it lies (x, z), in meters. */
  at: Vec2;
  /** Which way its bow points, radians about y (0 is +z). */
  yaw: number;
  /** Size against the model's own length. */
  scale: number;
};

/** The model a ship is drawn from, by its path under public/models/. `far`
 * picks the decimated twin where one exists (the sail ship's, for the city's
 * horizon). */
export function shipModel(kind: ShipKind, far: boolean): string {
  return kind === "sail" && far ? "ships/sail-lo" : `ships/${kind}`;
}

/** Past Beachside's waterline (WATER_Z = 340 in city/layout.ts): the cruise
 * liner far out, parallel to the shore; sail and Viking ships nearer. All
 * beyond 90 m of the sand, so the horizon has scale and the beach keeps its
 * sea. */
export const CITY_FLEET: readonly ShipSpec[] = [
  {
    kind: "cruise",
    name: "Aurora Belle",
    at: [-170, 585],
    yaw: Math.PI / 2,
    scale: 1,
  },
  { kind: "sail", name: "Morning Glory", at: [140, 455], yaw: -2.4, scale: 1 },
  {
    kind: "sail",
    name: "Little Dipper",
    at: [-330, 500],
    yaw: 0.7,
    scale: 0.85,
  },
  { kind: "viking", name: "Saltwind", at: [330, 445], yaw: 2.2, scale: 1 },
];

/** Past Starboard Marina's yachts, around the jet-ski course (x -56 to 56, z
 * -76 to -28): a liner on the horizon at 0.42 scale, a sail ship and a Viking
 * boat to either side, a lifeboat tied off the cross dock's east end. */
export const MARINA_FLEET: readonly ShipSpec[] = [
  {
    kind: "cruise",
    name: "Aurora Belle",
    at: [-20, -105],
    yaw: Math.PI / 2,
    scale: 0.5,
  },
  { kind: "sail", name: "Morning Glory", at: [-78, -62], yaw: 0.5, scale: 1 },
  { kind: "viking", name: "Saltwind", at: [72, -58], yaw: -1, scale: 1 },
  { kind: "lifeboat", name: "Rescue Two", at: [11, -6.2], yaw: 0.3, scale: 1 },
];

/** Where a ship is and how it leans at one moment. */
export type ShipPose = {
  x: number;
  /** Heave above the water line. */
  y: number;
  z: number;
  yaw: number;
  roll: number;
  pitch: number;
};

/** Makes `ships.length` poses to reuse every frame. */
export const makePoses = (count: number): ShipPose[] =>
  Array.from({ length: count }, () => ({
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    roll: 0,
    pitch: 0,
  }));

/**
 * Writes into `out` where ship number `index` lies at `t` seconds: heaving,
 * rolling and pitching on its kind's swell, swinging a little on its anchor and
 * wandering a few meters, each ship on its own phase. Deterministic, so the
 * same `t` gives the same pose, and bounded by the kind's SHIP_SWAY. Allocates
 * nothing.
 */
export function shipPose(
  ship: ShipSpec,
  index: number,
  t: number,
  out: ShipPose,
): ShipPose {
  const sway = SHIP_SWAY[ship.kind];
  const w = (2 * Math.PI) / sway.period;
  const phase = index * 2.4;
  out.y = Math.sin(w * t + phase) * sway.heave;
  out.roll = Math.sin(w * t * 0.9 + phase + 1) * sway.roll;
  out.pitch = Math.sin(w * t * 1.1 + phase + 2) * sway.pitch;
  // the slow swing and wander run on much longer cycles than the swell
  const slow = (2 * Math.PI * t) / (sway.period * 16);
  out.yaw = ship.yaw + Math.sin(slow + phase) * sway.swing;
  out.x = ship.at[0] + Math.sin(slow * 0.7 + phase) * sway.drift;
  out.z = ship.at[1] + Math.cos(slow * 0.6 + phase) * sway.drift;
  return out;
}
