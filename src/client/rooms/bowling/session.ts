import { useSyncExternalStore } from "react";
import {
  bowl,
  freshRack,
  frameTotals,
  NEW_GAME,
  PIN_SPOTS,
  position,
  roll,
  THROW_LIMITS,
  type Game,
  type Roll,
} from "../../../game/bowling.ts";
import { award } from "../../ui/prizeDesk.ts";

/**
 * One player's game on the lane, shared by the alley's 3D scene (which
 * draws it and plays each roll back) and the overlay's panel (which takes
 * the input and shows the score).
 *
 * A turn: slide along the foul line (place), press to start the aim
 * sweeping, press to lock it and start the power swinging, press to bowl.
 */
export type Phase = "off" | "place" | "aim" | "power" | "rolling" | "over";

export type Lane = {
  phase: Phase;
  game: Game;
  standing: readonly boolean[];
  offset: number;
  hook: -1 | 0 | 1;
  angle: number;
  /** When the current sweep (aim or power) started, performance.now() ms. */
  sweepAt: number;
  roll: Roll | null;
  /** The last ball's pin count, for the panel's call ("Strike!"). */
  last: { pins: number; strike: boolean; spare: boolean } | null;
};

const RACK = PIN_SPOTS.map(() => true);
const OFF: Lane = {
  phase: "off",
  game: NEW_GAME,
  standing: RACK,
  offset: 0,
  hook: 0,
  angle: 0,
  sweepAt: 0,
  roll: null,
  last: null,
};

let lane: Lane = OFF;
const listeners = new Set<() => void>();

function set(next: Partial<Lane>) {
  lane = { ...lane, ...next };
  for (const l of listeners) l();
}

export function getLane(): Lane {
  return lane;
}

export function useLane(): Lane {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getLane,
    getLane,
  );
}

/** The aim's sweep, radians, at `now`: a slow swing either side. */
export function aimAt(now: number, since: number): number {
  return Math.sin(((now - since) / 1000) * Math.PI * 0.9) * THROW_LIMITS.angle;
}

/** The power's swing, 0..1, at `now`. */
export function powerAt(now: number, since: number): number {
  return 0.5 - Math.cos(((now - since) / 1000) * Math.PI * 1.8) * 0.5;
}

/** How hard a hook pulls, for each of the three settings. */
const HOOK = 0.45;

export function startGame() {
  set({ ...OFF, phase: "place" });
}

export function leaveLane() {
  set(OFF);
}

export function nudge(dir: -1 | 1) {
  if (lane.phase !== "place") return;
  const offset = lane.offset + dir * 0.05;
  set({
    offset: Math.max(
      -THROW_LIMITS.offset,
      Math.min(THROW_LIMITS.offset, offset),
    ),
  });
}

export function setHook(hook: -1 | 0 | 1) {
  if (lane.phase === "place" || lane.phase === "aim") set({ hook });
}

/** The one button: start the aim, lock it, then bowl at the power shown. */
export function press(now: number) {
  if (lane.phase === "place") set({ phase: "aim", sweepAt: now });
  else if (lane.phase === "aim")
    set({ phase: "power", angle: aimAt(now, lane.sweepAt), sweepAt: now });
  else if (lane.phase === "power") {
    const [lo, hi] = THROW_LIMITS.speed;
    const speed = lo + (hi - lo) * powerAt(now, lane.sweepAt);
    const result = roll(lane.standing, {
      offset: lane.offset,
      angle: lane.angle,
      speed,
      // "Hook left" curls towards -x, the left as you face the pins
      hook: lane.hook * HOOK,
    });
    set({ phase: "rolling", roll: result, sweepAt: now });
  } else if (lane.phase === "over") startGame();
}

/** The scene calls this when a roll has played out: score it, rack up. */
export function settle() {
  if (lane.phase !== "rolling" || !lane.roll) return;
  const pins = lane.roll.knocked.length;
  const before = lane.game;
  const fresh = freshRack(before);
  const game = bowl(before, pins);
  const standing = freshRack(game)
    ? RACK
    : lane.standing.map((up, i) => up && !lane.roll?.knocked.includes(i));
  if (position(game).over)
    award(
      "bowling",
      frameTotals(game)
        .filter((t) => t !== null)
        .at(-1) ?? 0,
    );
  set({
    phase: position(game).over ? "over" : "place",
    game,
    standing,
    roll: null,
    angle: 0,
    last: {
      pins,
      strike: fresh && pins === 10,
      spare:
        !fresh && pins > 0 && pins === lane.standing.filter(Boolean).length,
    },
  });
}
