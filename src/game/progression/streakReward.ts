// A daily-streak check-in as one atomic save update: the new streak record, a
// milestone's coins and day-30 cosmetic, and its XP on the Street ladder (the
// ladder for showing up in the city) all land together, so a milestone that
// pays always counts toward progression. Loaded with the streak code, on demand.
import type { SaveV1 } from "../save.ts";
import { checkIn } from "../streak.ts";
import { earn } from "../wallet.ts";
import { rewardXp } from "./activities.ts";

/** Counts `day` for the streak; returns `s` itself when the day already counted. */
export function applyCheckIn(s: SaveV1, day: number): SaveV1 {
  const c = checkIn(s.streak, day);
  if (!c.fresh) return s;
  const item = c.reward?.item;
  const paid: SaveV1 = {
    ...s,
    streak: c.save,
    coins: earn(s.coins, c.reward?.coins ?? 0),
    wardrobe:
      item && !s.wardrobe.includes(item) ? [...s.wardrobe, item] : s.wardrobe,
  };
  return rewardXp(paid, "street", c.reward?.xp ?? 0);
}
