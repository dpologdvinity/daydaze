import {
  LASER_FIELD,
  newRound,
  roundOver,
  roundScore,
  shoot,
  stepRound,
  type Field,
  type Shot,
} from "../../../game/laserTag.ts";
import { PAINT_FIELD } from "../../../game/paintball.ts";
import type { PrizeGame } from "../../../game/prizes.ts";
import type { Vec2 } from "../../../game/walk.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** One tag game's live round, shared by its scene and its panel. */
export function createTagGame(
  field: Field,
  prize: PrizeGame,
  /** Each rival by her color, for the panel and the beams or splats. */
  names: readonly string[],
  colors: readonly string[],
) {
  const off = {
    phase: "off" as "off" | "playing" | "over",
    round: newRound(1, field),
    /** Your last shot: at whom, how it went and when (round seconds). */
    shot: null as { rival: number; result: Shot; t: number } | null,
  };
  const store = createStore(off);
  /** Where you stand, kept by the scene each frame for the panel's shots. */
  const you: { at: Vec2 } = { at: [0, 6.6] };
  return {
    field,
    names,
    colors,
    store,
    you,
    start() {
      store.set({
        phase: "playing",
        round: newRound(Math.floor(Math.random() * 1e6), field),
        shot: null,
      });
    },
    leave() {
      store.set(off);
    },
    /** Runs the round on by `dt` seconds; called once a frame. */
    tick(dt: number) {
      const s = store.get();
      if (s.phase !== "playing") return;
      const round = stepRound(s.round, dt, you.at);
      if (roundOver(round)) {
        store.set({ phase: "over", round });
        award(prize, roundScore(round));
      } else if (round !== s.round) store.set({ round });
    },
    /** Fire at rival `i` from where you stand. */
    fire(i: number) {
      const s = store.get();
      if (s.phase !== "playing") return;
      const { round, shot } = shoot(s.round, i, you.at);
      store.set({ round, shot: { rival: i, result: shot, t: round.t } });
    },
  };
}

export type TagGame = ReturnType<typeof createTagGame>;

export const laserTag = createTagGame(
  LASER_FIELD,
  "laser-tag",
  ["Cyan", "Pink", "Lime", "Gold"],
  ["#4fe3ff", "#ff4fb3", "#7dff6b", "#ffd84f"],
);

export const paintball = createTagGame(
  PAINT_FIELD,
  "paintball",
  ["Red", "Blue", "Orange", "Purple", "Green"],
  ["#e63946", "#2e7dff", "#ff8a3d", "#9b5cff", "#2fbf71"],
);
