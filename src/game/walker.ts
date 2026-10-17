import { stepInArea, clampToArea, type WalkArea } from "./area.ts";
import { portalAt } from "./portals.ts";
import type { Portal, Spawn } from "./rooms.ts";
import { SIM_HZ } from "./city/tuning.ts";
import { WALK_SPEED, yawTowards, type Vec2 } from "./walk.ts";

/** Seconds per simulation step: walking runs at a fixed rate, whatever the frame rate. */
export const SIM_STEP = 1 / SIM_HZ;

/** The simulated walking state. The renderer interpolates between steps. */
export type Walker = {
  pos: Vec2;
  yaw: number;
  target: Vec2 | null;
  /** Set once a portal fires, so it fires once per visit. */
  leaving: boolean;
};

export function createWalker(spawn: Spawn): Walker {
  return { pos: spawn.position, yaw: spawn.yaw, target: null, leaving: false };
}

/** Sends a click on the floor to the walker as a target. */
export function setTarget(walker: Walker, area: WalkArea, point: Vec2) {
  walker.target = clampToArea(area, point);
}

/** The shortest signed turn from `from` to `to`, in (-pi, pi]. */
export function turnBetween(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * One simulation step. `intent` is a unit move direction in the world (or
 * null to follow the target); `dt` is the step length. Moves the walker,
 * returns whether it moved and any portal it stepped into.
 */
export function stepWalker(
  walker: Walker,
  area: WalkArea,
  intent: Vec2 | null,
  dt: number,
  /** Faster than walking (on skates), slower, or 1. */
  speedScale = 1,
): { moved: boolean; portal: Portal | null } {
  const from = walker.pos;
  let goal = walker.target;
  if (intent) {
    walker.target = null;
    goal = [from[0] + intent[0], from[1] + intent[1]];
  }
  if (!goal || walker.leaving) return { moved: false, portal: null };

  const diff = turnBetween(walker.yaw, yawTowards(from, goal));
  walker.yaw += diff * Math.min(1, dt * 9);
  // pivot first on sharp turns, then stride
  const step = WALK_SPEED * speedScale * dt * (Math.abs(diff) < 1.2 ? 1 : 0.3);
  const next = stepInArea(area, from, goal, step);
  const progress = Math.hypot(next[0] - from[0], next[1] - from[1]);
  const moved = progress > 1e-4;
  walker.pos = next;
  // stop at the target, or when pinned against an edge
  const arrived = next[0] === goal[0] && next[1] === goal[1];
  if (!moved || arrived) walker.target = null;
  const portal = portalAt(area, next);
  if (portal) {
    walker.leaving = true;
    walker.target = null;
  }
  return { moved, portal };
}
