// The water-gun battle's session: the pure battle (waterGuns.ts) on a clock,
// plus where the player is aiming on the pool and the last squirt, so the
// scene (WaterGuns.tsx) can draw the stream and the soaked floatie.

import { POOL } from "../../../game/waterPark.ts";
import {
  BATTLE_SECONDS,
  battleOver,
  newBattle,
  squirt,
  type Battle,
  type Target,
} from "../../../game/waterGuns.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

export type Phase = "off" | "playing" | "over";

/** The aim keeps a little inside the coping. */
const EDGE = 0.4;

const OFF = {
  phase: "off" as Phase,
  battle: newBattle(1) as Battle,
  /** performance.now() the battle began. */
  since: 0,
  /** Where the squirt will land: [x, z] on the pool. */
  aim: [(POOL.x0 + POOL.x1) / 2, (POOL.z0 + POOL.z1) / 2] as [number, number],
  /** The last squirt: where it landed, when, and what it soaked; `n`
   * counts squirts. */
  shot: null as {
    at: [number, number];
    when: number;
    soaked: Target | null;
    n: number;
  } | null,
};

export const waterGuns = createStore(OFF);

/** Seconds into the battle at `now`. */
export const battleTime = (now: number) => (now - waterGuns.get().since) / 1000;

export function start(now: number) {
  waterGuns.set({
    ...OFF,
    phase: "playing",
    battle: newBattle(Math.floor(Math.random() * 1e9)),
    since: now,
  });
}

export const leave = () => waterGuns.set(OFF);

/** Aims at a point on the pool, kept inside it. */
export function aimAt(x: number, z: number) {
  const s = waterGuns.get();
  if (s.phase !== "playing") return;
  waterGuns.set({
    aim: [
      Math.min(POOL.x1 - EDGE, Math.max(POOL.x0 + EDGE, x)),
      Math.min(POOL.z1 - EDGE, Math.max(POOL.z0 + EDGE, z)),
    ],
  });
}

/** Moves the aim by (dx, dz) meters: the arrow keys and buttons. */
export function nudge(dx: number, dz: number) {
  const [x, z] = waterGuns.get().aim;
  aimAt(x + dx, z + dz);
}

/** Squirts at the aim. */
export function fire(now: number) {
  const s = waterGuns.get();
  if (s.phase !== "playing") return;
  const at: [number, number] = [s.aim[0], s.aim[1]];
  const { battle, soaked } = squirt(s.battle, at[0], at[1], battleTime(now));
  waterGuns.set({
    battle,
    shot: { at, when: now, soaked, n: (s.shot?.n ?? 0) + 1 },
  });
  tick(now);
}

/** Ends the battle when the tank's dry or the time's up. */
export function tick(now: number) {
  const s = waterGuns.get();
  if (s.phase !== "playing" || !battleOver(s.battle, battleTime(now))) return;
  waterGuns.set({ phase: "over", since: now });
  award("water-guns", s.battle.score);
}

/** Seconds left in the battle. */
export const secondsLeft = (now: number) =>
  Math.max(0, Math.ceil(BATTLE_SECONDS - battleTime(now)));
