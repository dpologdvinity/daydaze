import {
  newRound,
  roundOver,
  roundScore,
  shoot,
  stepRound,
  type Round,
  type Shot,
} from "../../../game/laserTag.ts";
import type { Vec2 } from "../../../game/walk.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** Each rival by her vest's color, for the panel and the beams. */
export const RIVAL_NAMES = ["Cyan", "Pink", "Lime", "Gold"] as const;
export const RIVAL_COLORS = ["#4fe3ff", "#ff4fb3", "#7dff6b", "#ffd84f"];

const OFF = {
  phase: "off" as "off" | "playing" | "over",
  round: newRound(1),
  /** Your last shot: at whom, how it went and when (round seconds). */
  shot: null as { rival: number; result: Shot; t: number } | null,
};

export const tag = createStore(OFF);

/** Where you stand, kept by the scene each frame for the panel's shots. */
export const you: { at: Vec2 } = { at: [0, 6.6] };

export function start() {
  tag.set({
    phase: "playing",
    round: newRound(Math.floor(Math.random() * 1e6)),
    shot: null,
  });
}

export function leave() {
  tag.set(OFF);
}

/** Runs the round on by `dt` seconds; called once a frame by the scene. */
export function tick(dt: number) {
  const s = tag.get();
  if (s.phase !== "playing") return;
  const round: Round = stepRound(s.round, dt, you.at);
  if (roundOver(round)) {
    tag.set({ phase: "over", round });
    award("laser-tag", roundScore(round));
  } else if (round !== s.round) tag.set({ round });
}

/** Fire at rival `i` from where you stand. */
export function fire(i: number) {
  const s = tag.get();
  if (s.phase !== "playing") return;
  const { round, shot } = shoot(s.round, i, you.at);
  tag.set({ round, shot: { rival: i, result: shot, t: round.t } });
}
