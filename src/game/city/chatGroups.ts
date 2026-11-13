// Standing conversations on the city's sidewalks: a pair, now and then three
// or four, who stopped to talk at the edge of the walk, away from the lane the
// walkers keep to. Like the walkers (pedestrians.ts) they are pure data, and
// the renderer draws only the few nearest the player (ChatGroups.tsx); how
// each person moves is game/dance/conversation.ts. Their looks are borrowed
// from the walkers', so the street has no second cast to build.

import { mix } from "../dance/idlePlan.ts";
import type { Look } from "../look.ts";
import type { Vec2 } from "../walk.ts";
import { daylightAt } from "./daylight.ts";
import { CITY_SURFACES } from "./layout.ts";
import { PEDESTRIANS } from "./pedestrians.ts";

export type ChatGroup = {
  /** The middle of the ring of people. */
  at: Vec2;
  /** Fixes the group's tone and turns (conversation.ts) and where its people stand. */
  seed: number;
  looks: readonly Look[];
  /** Ring angle of the first person, radians. */
  turn: number;
  /** 0..1: out later than the groups with lower numbers, like pedestrianOut. */
  night: number;
};

/** A fixed pseudo-random value in 0..1 per (i, k). */
const rand = (i: number, k: number): number => mix(i, k) / 0x100000000;

/** How far across the sidewalk (0 to 1) a group stands: past the walkers' lanes (0.3 to 0.7). */
const LANE = 0.84;
/** About one group per this many meters of sidewalk. */
const SPACING = 90;
/** Strips shorter than this have none. */
const MIN_STRIP = 60;

/** Where the walk begins in front of a newcomer: a group within sight of the city's spawn. */
const SHOWCASE: Vec2 = [22, 7 + 4 * LANE];

export const CHAT_GROUPS: readonly ChatGroup[] = (() => {
  const out: ChatGroup[] = [];
  const add = (at: Vec2, i: number, pair = false) => {
    const seed = 1 + (mix(i, 5) % 100000);
    const size = pair || rand(i, 1) < 0.62 ? 2 : rand(i, 2) < 0.8 ? 3 : 4;
    const looks = Array.from(
      { length: size },
      (_, m) => PEDESTRIANS[mix(i, 40 + m) % PEDESTRIANS.length]?.look as Look,
    );
    out.push({
      at,
      seed,
      looks,
      turn: rand(i, 3) * Math.PI * 2,
      night: rand(i, 4),
    });
  };
  // a pair, so the low tier's two dolls draw it
  add(SHOWCASE, 0, true);
  CITY_SURFACES.filter((s) => s.kind === "sidewalk").forEach((s, si) => {
    // every second strip: a group on each is a lot of dolls to have in the city
    if (si % 2 !== 0) return;
    const xs = s.polygon.map(([x]) => x);
    const zs = s.polygon.map(([, z]) => z);
    const [x0, x1, z0, z1] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...zs),
      Math.max(...zs),
    ];
    const along = x1 - x0 >= z1 - z0;
    const length = along ? x1 - x0 : z1 - z0;
    if (length < MIN_STRIP) return;
    const count = Math.max(1, Math.round(length / SPACING));
    for (let k = 0; k < count; k++) {
      const f = (k + 0.25 + rand(si * 11 + k, 6) * 0.5) / count;
      const at: Vec2 = along
        ? [x0 + (x1 - x0) * f, z0 + (z1 - z0) * LANE]
        : [x0 + (x1 - x0) * LANE, z0 + (z1 - z0) * f];
      // keep clear of the groups already placed (the showcase by the spawn)
      if (out.some((g) => Math.hypot(g.at[0] - at[0], g.at[1] - at[1]) < 20))
        continue;
      add(at, 100 + si * 11 + k);
    }
  });
  return out;
})();

/** Whether a group is out at `hour` (0..24): all by day, some at the dead of night. */
export function chatGroupOut(g: ChatGroup, hour: number): boolean {
  return g.night >= 0.75 * daylightAt(hour).neon;
}

/**
 * The groups nearest `at` within `radius`, nearest first, as many as fit in
 * `dolls` people. Groups out at `hour` only: everyone by day, some at night.
 */
export function nearestChatGroups(
  at: Vec2,
  radius: number,
  dolls: number,
  /** Whether a group is out: by its `night` number. */
  out: (g: ChatGroup) => boolean = () => true,
): number[] {
  const near = CHAT_GROUPS.flatMap((g, i) => {
    const d = Math.hypot(g.at[0] - at[0], g.at[1] - at[1]);
    return d <= radius && out(g) ? [{ i, d }] : [];
  }).sort((a, b) => a.d - b.d);
  const picked: number[] = [];
  let left = dolls;
  for (const { i } of near) {
    const size = CHAT_GROUPS[i]?.looks.length ?? 0;
    if (size > left) continue;
    picked.push(i);
    left -= size;
  }
  return picked;
}
