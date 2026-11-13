// Standing conversations on the city's sidewalks: a pair, now and then three
// or four, who stopped to talk at the edge of the walk, away from the lane the
// walkers keep to. Like the walkers (pedestrians.ts) they are pure data, and
// the renderer draws only the few nearest the player (ChatGroups.tsx); how
// each person moves is game/dance/conversation.ts. Their looks are borrowed
// from the walkers', so the street has no second cast to build.

import { mix } from "../dance/idlePlan.ts";
import type { Look } from "../look.ts";
import type { Vec2 } from "../walk.ts";
import { CHAT_RING } from "../chatSpots.ts";
import { isBlocked } from "../area.ts";
import { daylightAt } from "./daylight.ts";
import { FURNITURE, PARKED_CARS } from "./dressing.ts";
import { CITY_AREA, CITY_SURFACES, PROPS, ROAD_NODES } from "./layout.ts";
import { YARD_TREES } from "./yards.ts";
import { elBoxes } from "./el.ts";
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

/** How far (m) a huddle of `size` reaches from its middle: the ring plus an arm's gesture. */
export const huddleReach = (size: 2 | 3 | 4): number => CHAT_RING[size] + 0.9;
/** How much farther than its reach a lamp, bench, tree, vending machine or planter may stand. */
const HUDDLE_MARGIN = 0.5;

/** Every place something stands on the street: the plan's furniture, its props
 * (trees, lamps, palms, hydrants) and the yards' trees. */
const THINGS: readonly Vec2[] = [
  ...FURNITURE.map((f): Vec2 => [f.x, f.z]),
  ...PROPS.map((p): Vec2 => [p.position[0], p.position[1]]),
  ...YARD_TREES.map(([x, z]): Vec2 => [x, z]),
  // a parked car is long: its middle and a point a car's half-length out along each axis
  ...PARKED_CARS.flatMap((c): Vec2[] => [
    [c.x, c.z],
    [c.x - 1.7, c.z],
    [c.x + 1.7, c.z],
    [c.x, c.z - 1.7],
    [c.x, c.z + 1.7],
  ]),
];

/** The El's low boxes (its columns at the curbs, its platform and its stairs)
 * as floor rectangles: the trestle's gaps are the cross streets (ElLine.tsx). */
const EL_FOOTPRINTS = elBoxes([
  ...new Set(
    ROAD_NODES.filter((n) => Math.abs(n.position[1]) === 192).map(
      (n) => n.position[0],
    ),
  ),
])
  .filter((b) => b.y - b.sy / 2 < 3)
  .map((b) => [b.x - b.sx / 2, b.x + b.sx / 2, b.z - b.sz / 2, b.z + b.sz / 2]);

/** How near (m) a point is to a rectangle on the floor (0 inside). */
const nearRect = (p: Vec2, [x0, x1, z0, z1]: readonly number[]): number =>
  Math.hypot(
    Math.max(x0 - p[0], 0, p[0] - x1),
    Math.max(z0 - p[1], 0, p[1] - z1),
  );

/** Whether a huddle of `size` fits at `at`: nothing stands within its reach
 * and a margin of its middle, and no wall or building is within its reach. */
export function huddleFits(
  at: Vec2,
  size: 2 | 3 | 4,
  things: readonly Vec2[] = THINGS,
): boolean {
  const reach = huddleReach(size);
  if (EL_FOOTPRINTS.some((r) => nearRect(at, r) < reach + 0.3)) return false;
  if (
    things.some(
      (t) => Math.hypot(t[0] - at[0], t[1] - at[1]) < reach + HUDDLE_MARGIN,
    )
  )
    return false;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    for (const r of [reach, reach / 2])
      if (
        isBlocked(CITY_AREA, [at[0] + Math.sin(a) * r, at[1] + Math.cos(a) * r])
      )
        return false;
  }
  return !isBlocked(CITY_AREA, at);
}

/** A fixed pseudo-random value in 0..1 per (i, k). */
const rand = (i: number, k: number): number => mix(i, k) / 0x100000000;

/** How far across the sidewalk (0 to 1) a group stands: out of the walkers' lanes
 * (0.3 to 0.7), at the building side or the curb side, whichever is clear. */
const LANES = [0.84, 0.16] as const;
/** Meters a group may be slid along its strip to find a clear spot, nearest first. */
const SLIDES = [0, 1.5, -1.5, 3, -3, 4.5, -4.5, 6, -6, 9, -9, 12, -12, 15, -15];
/** About one group per this many meters of sidewalk. */
const SPACING = 90;
/** Strips shorter than this have none. */
const MIN_STRIP = 60;

/** Where the walk begins in front of a newcomer: a group within sight of the city's spawn. */
const SHOWCASE_AT: Vec2 = [22, 9];

export const CHAT_GROUPS: readonly ChatGroup[] = (() => {
  const out: ChatGroup[] = [];
  /** How many people group `i` has: mostly two. */
  const sizeOf = (i: number, pair: boolean): 2 | 3 | 4 =>
    pair || rand(i, 1) < 0.62 ? 2 : rand(i, 2) < 0.8 ? 3 : 4;
  const add = (at: Vec2, i: number, size: 2 | 3 | 4) => {
    const seed = 1 + (mix(i, 5) % 100000);
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
  const sidewalks = CITY_SURFACES.filter((s) => s.kind === "sidewalk");
  const boxOf = (s: (typeof sidewalks)[number]) => {
    const xs = s.polygon.map(([x]) => x);
    const zs = s.polygon.map(([, z]) => z);
    return [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...zs),
      Math.max(...zs),
    ] as const;
  };
  /** Searches a strip for a clear spot near fraction `f` of its length. */
  const find = (
    strip: readonly [number, number, number, number],
    f: number,
    size: 2 | 3 | 4,
  ): Vec2 | null => {
    const [x0, x1, z0, z1] = strip;
    const along = x1 - x0 >= z1 - z0;
    // only the things near this strip matter: a handful of the thousands
    const pad = huddleReach(4) + HUDDLE_MARGIN + 16;
    const near = THINGS.filter(
      (t) =>
        t[0] > x0 - pad &&
        t[0] < x1 + pad &&
        t[1] > z0 - pad &&
        t[1] < z1 + pad,
    );
    for (const slide of SLIDES)
      for (const lane of LANES) {
        const at: Vec2 = along
          ? [x0 + (x1 - x0) * f + slide, z0 + (z1 - z0) * lane]
          : [x0 + (x1 - x0) * lane, z0 + (z1 - z0) * f + slide];
        const inside = along
          ? at[0] > x0 + 2 && at[0] < x1 - 2
          : at[1] > z0 + 2 && at[1] < z1 - 2;
        if (inside && huddleFits(at, size, near)) return at;
      }
    return null;
  };
  // a pair, so the low tier's two dolls draw it, on the strip by the spawn
  const spawnStrip = sidewalks
    .map(boxOf)
    .find(
      ([x0, x1, z0, z1]) =>
        SHOWCASE_AT[0] >= x0 &&
        SHOWCASE_AT[0] <= x1 &&
        SHOWCASE_AT[1] >= z0 &&
        SHOWCASE_AT[1] <= z1,
    );
  const showcase =
    spawnStrip &&
    find(
      spawnStrip,
      (SHOWCASE_AT[0] - spawnStrip[0]) / (spawnStrip[1] - spawnStrip[0]),
      2,
    );
  if (showcase) add(showcase, 0, 2);
  sidewalks.forEach((s, si) => {
    // every second strip: a group on each is a lot of dolls to have in the city
    if (si % 2 !== 0) return;
    const strip = boxOf(s);
    const [x0, x1, z0, z1] = strip;
    const length = Math.max(x1 - x0, z1 - z0);
    if (length < MIN_STRIP) return;
    const count = Math.max(1, Math.round(length / SPACING));
    for (let k = 0; k < count; k++) {
      const i = 100 + si * 11 + k;
      const f = (k + 0.25 + rand(si * 11 + k, 6) * 0.5) / count;
      const size = sizeOf(i, false);
      const at = find(strip, f, size);
      // keep clear of the groups already placed (the showcase by the spawn)
      if (
        !at ||
        out.some((g) => Math.hypot(g.at[0] - at[0], g.at[1] - at[1]) < 20)
      )
        continue;
      add(at, i, size);
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
