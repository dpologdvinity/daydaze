// The signature look of a weekly night (src/game/events.ts): how far its room's
// own lights dim, what it paints over the room, and the pure motion math for
// the mall rave's lasers and confetti cannons. Pure, no React or three.js: the
// client (src/client/rooms/NightDecor.tsx) draws it.

import type { ClubNight } from "./events.ts";

type NightId = ClubNight["id"];

/** What a night does to the room beyond its decor cloud. */
export type NightLook = {
  /** Scale on the room's own lights (1 leaves them alone, 0 is dark). */
  lights: number;
  /** Scale on the shared key light the dolls are lit by. */
  key: number;
  /** Intensity of the night-colored fill light. */
  tint: number;
  /**
   * `lasers`: a canopy of colored beams and confetti cannons.
   * `blacklight`: saturated and white surfaces fluoresce on their own.
   */
  signature: "lasers" | "blacklight";
  /** The sky and fog the room goes to, when it has them. */
  backdrop?: string;
};

export const NIGHT_LOOKS: Partial<Record<NightId, NightLook>> = {
  // the mall's lights drop to a glimmer so the beams are the light
  "mall-rave": { lights: 0.22, key: 0.45, tint: 0.35, signature: "lasers" },
  // a real blacklight room: dark, deep violet, everything else glows by itself
  "uv-night": {
    lights: 0.12,
    key: 0.18,
    tint: 0.7,
    signature: "blacklight",
    backdrop: "#08001c",
  },
};

/**
 * Aim of laser `i` of `n` in a fan at time `t` seconds: a yaw round the
 * vertical and a tilt down from straight up. The fan turns slowly and each
 * beam nods on its own phase, always pointing well below the horizontal
 * ceiling plane and never straight down the wall.
 */
export function laserAim(i: number, n: number, t: number): [number, number] {
  const yaw = (i / n) * Math.PI * 2 + t * 0.35;
  const tilt = 0.95 + Math.sin(t * 0.9 + i * 1.9) * 0.55;
  return [yaw, tilt];
}

/** Seconds between a cannon's shots, and how long its confetti stays up. */
export const CANNON_PERIOD = 6;
const FLIGHT = 5;

/** Seconds since cannon `k` last fired at clock `t` (the cannons take turns). */
export function cannonAge(k: number, t: number): number {
  const phase = (k * CANNON_PERIOD) / 4;
  return (((t + phase) % CANNON_PERIOD) + CANNON_PERIOD) % CANNON_PERIOD;
}

/**
 * Where a scrap of confetti is `age` seconds after the shot, relative to the
 * cannon, into `out`. `a` and `b` (0..1) are the scrap's own random draws: its
 * speed and its heading; `ceiling` is how high the shot should reach. A scrap
 * climbs on a burst of speed, then air drag takes over and it flutters down at
 * a steady slow fall, drifting sideways as it goes. Past its flight it is
 * parked far below the floor so it simply isn't drawn.
 */
export function confettiAt(
  age: number,
  a: number,
  b: number,
  ceiling: number,
  out: [number, number, number],
): void {
  if (age > FLIGHT) {
    out[0] = out[2] = 0;
    out[1] = -100;
    return;
  }
  // the burst: speed bleeds off quickly (drag) toward a top height H, then a
  // steady fall brings the scrap back to the floor just as its flight ends
  const drag = 1.1;
  const H = ceiling * (0.6 + a * 0.4);
  const eased = (1 - Math.exp(-drag * age)) / drag;
  const up = H * drag * eased;
  const fall = (H / FLIGHT) * 1.25 * (age - eased);
  const reach = 2.2 + a * 3;
  const spread = eased;
  const heading = b * Math.PI * 2;
  out[0] =
    Math.cos(heading) * reach * spread + Math.sin(age * 2.3 + b * 9) * 0.3;
  out[1] = Math.max(0.05, up - fall);
  out[2] =
    Math.sin(heading) * reach * spread + Math.cos(age * 1.9 + a * 9) * 0.3;
}
