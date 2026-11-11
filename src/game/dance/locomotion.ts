// The small clips around walking: setting off from standing, arriving, and
// turning on the spot or back on yourself. The walker already ramps her speed
// and yaw (walker.ts) and her pace changes between a stroll and a hurry
// (pace.ts), so these clips never drive the motion: each plays only its first
// moments (a lean, a weight shift, the feet turning), faded in and out, over
// the walk or idle loop. Everything is read from what a doll is seen doing
// (its speed and yaw), so a stranger's doll plays them too. Pure; HumanDoll
// plays what this returns.

import { MOVING } from "./clips.ts";
import type { MocapPack } from "./mocapTypes.ts";

/** Seconds she must have stood still before a set-off plays a start clip, so
 * a quick re-click or a stop-and-go plays none. */
export const START_STILL = 0.3;
/** Seconds she must have been walking before stopping plays a stop clip. */
export const STOP_AFTER = 0.5;
/** Swing in yaw (radians, decaying over SWING_TAU seconds) that counts as a
 * sharp turn: a bit over 90 degrees. */
export const TURN_SWING = 1.6;
const SWING_TAU = 0.25;
/** Seconds before another turn clip can play. */
const TURN_COOLDOWN = 1;
/** Within this many seconds of setting off, a turn is the pivot of a start
 * (in place), not a turn back mid-stride. */
const PIVOT_WINDOW = 0.5;

/** A one-shot clip to lay over the walk or idle: plays from its start for
 * `seconds` (at `rate`), crossfaded in over `fade`; the doll's own loop
 * fades back in after. */
export type LocoPlay = {
  id: string;
  seconds: number;
  rate: number;
  fade: number;
  pack: MocapPack;
};

/** What a doll is seen doing this frame. */
export type LocoInput = {
  dt: number;
  /** Ground speed, m/s. */
  speed: number;
  /** Facing, radians (undefined when the doll's yaw isn't known). */
  yaw: number | undefined;
  /** Moving at the hurry (the jog) rather than a stroll. */
  hurry: boolean;
  /** The man's doll (his walk takes), not the woman's. */
  man: boolean;
  /** Seated, swimming, carried or otherwise not walking on the ground. */
  busy: boolean;
};

/** The tracker's memory. */
export type Loco = {
  /** Seconds standing still. */
  still: number;
  /** Seconds walking. */
  walking: number;
  /** Decaying sum of recent signed yaw changes, radians. */
  swing: number;
  yaw: number;
  cooldown: number;
};

export function createLoco(): Loco {
  return { still: 0, walking: 0, swing: 0, yaw: Number.NaN, cooldown: 0 };
}

const PACK: MocapPack = "moves";

const START: Record<"walk" | "walk-f" | "sprint", LocoPlay> = {
  walk: { id: "start-walk", seconds: 0.4, rate: 1.2, fade: 0.15, pack: PACK },
  "walk-f": {
    id: "start-walk-f",
    seconds: 0.4,
    rate: 1.2,
    fade: 0.15,
    pack: PACK,
  },
  sprint: {
    id: "start-sprint",
    seconds: 0.35,
    rate: 1,
    fade: 0.12,
    pack: PACK,
  },
};
const STOP = {
  man: { id: "stop-walk", seconds: 0.5, rate: 1.3, fade: 0.15, pack: PACK },
  woman: { id: "stop-walk-f", seconds: 0.5, rate: 1.3, fade: 0.15, pack: PACK },
} as const;
const TURN = {
  // positive yaw turns toward +x: to her left (0 faces +z)
  left: { id: "turn-left", seconds: 0.5, rate: 1.6, fade: 0.12, pack: PACK },
  right: { id: "turn-right", seconds: 0.5, rate: 1.6, fade: 0.12, pack: PACK },
  back: { id: "turn-180", seconds: 0.45, rate: 1.2, fade: 0.12, pack: PACK },
} as const;

/** The signed shortest turn from `from` to `to`, radians. */
function wrap(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * Advances the tracker by one frame; returns a clip to play when this frame
 * is a set-off, an arrival or a sharp turn, else null. Bad input changes
 * nothing.
 */
export function stepLoco(l: Loco, s: LocoInput): LocoPlay | null {
  if (!(s.dt > 0) || !Number.isFinite(s.dt) || !Number.isFinite(s.speed))
    return null;
  l.cooldown = Math.max(0, l.cooldown - s.dt);
  const moving = s.speed > MOVING;
  const before = { still: l.still, walking: l.walking };
  if (moving) {
    l.walking += s.dt;
    l.still = 0;
  } else {
    l.still += s.dt;
    l.walking = 0;
  }
  // the swing of her facing: a pivot or a turn back shows as a lot of yaw in
  // a few tenths of a second, a drift or a wide arc as little
  const step =
    s.yaw !== undefined && Number.isFinite(s.yaw) && Number.isFinite(l.yaw)
      ? wrap(l.yaw, s.yaw)
      : 0;
  if (s.yaw !== undefined && Number.isFinite(s.yaw)) l.yaw = s.yaw;
  l.swing = l.swing * Math.exp(-s.dt / SWING_TAU) + step;
  if (s.busy) {
    l.swing = 0;
    return null;
  }

  if (l.cooldown === 0 && Math.abs(l.swing) >= TURN_SWING) {
    const left = l.swing > 0;
    l.swing = 0;
    l.cooldown = TURN_COOLDOWN;
    // pivoting on the spot, or at the start of a walk: feet turn in place
    if (!moving || l.walking <= PIVOT_WINDOW)
      return left ? TURN.left : TURN.right;
    return TURN.back;
  }
  // set off after standing a while (a re-click on the move has no start)
  if (moving && before.walking === 0 && before.still >= START_STILL)
    return s.hurry ? START.sprint : s.man ? START.walk : START["walk-f"];
  // arrived after a real walk
  if (!moving && before.walking >= STOP_AFTER)
    return s.man ? STOP.man : STOP.woman;
  return null;
}
