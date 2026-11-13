// Sitting down and standing up as a move of the doll's root: from the spot
// she stopped on to the seat and back, with the turn that puts her back to
// the seat. The Mixamo/UAL transition clips (dance/transitions.ts) bend her
// knees and carry the last `reach` meters of the step themselves; this moves
// the root under them so she lands on the seat instead of popping onto it.
// Pure; PlayerController steps it and draws her at its pose. Standing up
// mid-sit reverses it from wherever it is, so nothing snaps.

import { turnBetween } from "./walker.ts";
import type { Vec2 } from "./walk.ts";

/** A sit-down or stand-up in progress. `p` runs 0 (standing at `from`) to 1
 * (on the seat); `dir` says which way it is going. */
export type SeatMove = {
  from: { x: number; z: number; yaw: number };
  to: { x: number; y: number; z: number; yaw: number };
  p: number;
  dir: 1 | -1;
  /** Seconds for the whole way, 0 to 1. */
  seconds: number;
};

/** Where to put the root: meters, and a yaw in radians. */
export type RootPose = { x: number; y: number; z: number; yaw: number };

export type SitSpec = {
  /** The floor spot in front of (or behind) the seat she walked to. */
  approach: Vec2;
  /** The seat's center. */
  at: Vec2;
  /** The root's height once seated (the seat's top less her thigh). */
  rootY: number;
  /** The way she faces seated. */
  yaw: number;
  /** The way she faces at the approach. */
  fromYaw: number;
  /** How far ahead of the root the clip's hips start; 0 to just lower. */
  reach: number;
  seconds: number;
};

/** The first share of a sit-down spent turning her back to the seat. */
const TURN_SHARE = 0.4;

/** Starts a sit-down at `approach`. The clip's hips begin `reach` ahead of
 * the root, so the root starts that far behind the spot she stood on. */
export function startSit(s: SitSpec): SeatMove {
  const fx = Math.sin(s.yaw);
  const fz = Math.cos(s.yaw);
  return {
    from: {
      x: s.approach[0] - fx * s.reach,
      z: s.approach[1] - fz * s.reach,
      yaw: s.fromYaw,
    },
    to: { x: s.at[0], y: s.rootY, z: s.at[1], yaw: s.yaw },
    p: 0,
    dir: 1,
    seconds: Math.max(0.05, s.seconds),
  };
}

/** Turns a sit-down round into a stand-up from where it has got to, taking
 * `seconds` for the whole way back (so a half-sat doll is up in half that). */
export function riseFrom(m: SeatMove, seconds: number): void {
  m.dir = -1;
  m.seconds = Math.max(0.05, seconds);
}

/** Advances by `dt` seconds. Returns whether it is still going (a settled
 * seat, or a stand-up that has finished, returns false). */
export function stepSeatMove(m: SeatMove, dt: number): boolean {
  if (!Number.isFinite(dt) || dt < 0) return false;
  m.p = Math.min(1, Math.max(0, m.p + (m.dir * dt) / m.seconds));
  return m.dir === 1 ? m.p < 1 : m.p > 0;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** The root pose at the move's progress. Turns early, travels eased, and
 * rises late: her knees are already bent by the time her feet leave the floor. */
export function seatPose(m: SeatMove, out: RootPose): RootPose {
  const travel = smooth(m.p);
  out.x = m.from.x + (m.to.x - m.from.x) * travel;
  out.z = m.from.z + (m.to.z - m.from.z) * travel;
  out.y = m.to.y * smooth(m.p * m.p);
  out.yaw =
    m.from.yaw +
    turnBetween(m.from.yaw, m.to.yaw) * smooth(Math.min(1, m.p / TURN_SHARE));
  return out;
}
