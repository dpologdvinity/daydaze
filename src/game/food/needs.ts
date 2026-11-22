// Hunger and thirst are gentle needs for every player. They build slowly with
// play; weed's munchies and dry mouth speed them up (adults only, the caller
// supplies the gate). Food and nonalcoholic drinks relieve them without
// touching any substance meter. A high need only trims the walk a little and
// lights a HUD hint: it never blocks play. Needs live in memory, so a reload
// starts fed.
import { FELT } from "../effects/substances.ts";

export type Needs = { hunger: number; thirst: number };
/** Weed's munchies and dry mouth are mentioned from here. */
export const NEED_NOTICE = 0.25;
/** Plain hunger and thirst are mentioned from here. */
export const NEED_PECKISH = 0.6;
/** The walk starts to slow from here, down to `SLOWEST_PACE` at 1. */
const SLOW_FROM = 0.6;
const SLOWEST_PACE = 0.9;
// Seconds for a need to climb from 0 to 1 on its own, and the extra seconds
// at full weed (the weed share scales with how high she is).
const HUNGER_SECONDS = 1800;
const THIRST_SECONDS = 1200;
const MUNCHIES_SECONDS = 120;
const DRY_MOUTH_SECONDS = 90;

export const freshNeeds = (): Needs => ({ hunger: 0, thirst: 0 });

export function stepNeeds(
  needs: Needs,
  high: number,
  seconds: number,
  adultOk: boolean,
): Needs {
  if (!Number.isFinite(seconds) || seconds <= 0) return needs;
  const felt =
    adultOk && Number.isFinite(high) && high >= FELT ? Math.min(1, high) : 0;
  return {
    hunger: Math.min(
      1,
      needs.hunger + seconds * (1 / HUNGER_SECONDS + felt / MUNCHIES_SECONDS),
    ),
    thirst: Math.min(
      1,
      needs.thirst + seconds * (1 / THIRST_SECONDS + felt / DRY_MOUTH_SECONDS),
    ),
  };
}

export function satisfyNeed(needs: Needs, kind: "food" | "drink"): Needs {
  return kind === "food"
    ? { ...needs, hunger: Math.max(0, needs.hunger - 0.65) }
    : { ...needs, thirst: Math.max(0, needs.thirst - 0.8) };
}

/** Walk-speed multiplier: 1 until a need passes `SLOW_FROM`, then down to 0.9. */
export function needPace(needs: Needs): number {
  const worst = Math.max(needs.hunger, needs.thirst);
  if (!Number.isFinite(worst) || worst <= SLOW_FROM) return 1;
  return (
    1 -
    ((1 - SLOWEST_PACE) * (Math.min(1, worst) - SLOW_FROM)) / (1 - SLOW_FROM)
  );
}

/** The HUD heading, or null while no need is worth mentioning. `weedy` is a
 * felt weed high (adults only): it names the need in its own words. */
export function needLabel(needs: Needs, weedy: boolean): string | null {
  if (weedy && needs.hunger >= NEED_NOTICE) return "The munchies";
  if (weedy && needs.thirst >= NEED_NOTICE) return "Cotton mouth";
  const hungry = needs.hunger >= NEED_PECKISH;
  const thirsty = needs.thirst >= NEED_PECKISH;
  if (hungry && thirsty) return "Hungry and thirsty";
  return hungry ? "Hungry" : thirsty ? "Thirsty" : null;
}
