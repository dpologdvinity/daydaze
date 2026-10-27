// People walking the city's sidewalks. Each pedestrian paces one sidewalk
// strip, end to end and back, at her own speed and lane; where she is is a
// pure function of time, so every client agrees and nothing is stored.
// The renderer draws only the few nearest the player.
import {
  BEARDS,
  HAIR_COLORS,
  HAIR_STYLES,
  MENSWEAR,
  SHORT_CUTS,
  OUTFIT_COLORS,
  SKINS,
  DEFAULT_LOOK,
  type Look,
} from "../look.ts";
import { naturalPace } from "../dance/clips.ts";
import { NPC_GAITS, gaitOf } from "../gaits.ts";
import type { Vec2 } from "../walk.ts";
import type { LandKind } from "../creatures.ts";
import { PARK } from "./park.ts";
import { CITY_SURFACES } from "./layout.ts";

export type Pedestrian = {
  /** The strip she paces: from `a` to `b` along its middle, offset by `lane`. */
  a: Vec2;
  b: Vec2;
  speed: number;
  /** Seconds into her walk at time 0. */
  start: number;
  look: Look;
  /** A dog trotting beside her (the park's dog walkers). */
  dog?: LandKind;
};

export type PedestrianPose = { x: number; z: number; yaw: number };

/** A fixed pseudo-random value in 0..1 per (i, k). */
function rand(i: number, k: number): number {
  const x = Math.sin(i * 91.7 + k * 47.3) * 24634.6345;
  return x - Math.floor(x);
}

function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

// the everyday outfits read best on the street
const STREET_OUTFITS = ["jeans", "shorts", "blouse", "flares", "mini"] as const;
// sculpted styles are cheapest to draw; strand styles add the variety
const STREET_HAIR = HAIR_STYLES.filter((h) =>
  ["waves", "ponytail", "bob", "buns", "afro", "braids", "mid-wavy"].includes(
    h.id,
  ),
);

/** About one pedestrian per 40 m of sidewalk, on every long strip. */
export const PEDESTRIANS: readonly Pedestrian[] = CITY_SURFACES.filter(
  (s) => s.kind === "sidewalk",
).flatMap((s, si) => {
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
  if (length < 30) return [];
  const count = Math.max(1, Math.round(length / 40));
  return Array.from({ length: count }, (_, k): Pedestrian => {
    const i = si * 7 + k;
    // lanes keep to the middle of the strip, clear of lamps at its edge
    const lane = 0.3 + rand(i, 1) * 0.4;
    const a: Vec2 = along
      ? [x0 + 1, z0 + (z1 - z0) * lane]
      : [x0 + (x1 - x0) * lane, z0 + 1];
    const b: Vec2 = along
      ? [x1 - 1, z0 + (z1 - z0) * lane]
      : [x0 + (x1 - x0) * lane, z1 - 1];
    // about two in five are men: menswear, a short cut, often a beard,
    // bare lips and a man's easy walk
    const man = rand(i, 9) < 0.4;
    const gait = man ? "stride" : pick(NPC_GAITS, rand(i, 11));
    // on the park's paths the first walker of each strip has a dog with her
    const inPark =
      x0 >= PARK.x0 && x1 <= PARK.x1 && z0 >= PARK.z0 && z1 <= PARK.z1;
    return {
      a,
      b,
      dog: inPark && k === 0 ? (si % 2 ? "husky" : "shibainu") : undefined,
      // her gait clip's own pace, give or take a little, so her legs keep
      // up with the ground at 1x (src/game/dance/stride.ts)
      speed:
        (naturalPace(gaitOf(gait).clip, man) ?? 1.3) *
        (0.95 + rand(i, 2) * 0.1),
      start: rand(i, 3) * 400,
      look: man
        ? {
            ...DEFAULT_LOOK,
            body: "masculine",
            skin: pick(SKINS, rand(i, 4)).id,
            hairStyle: pick(SHORT_CUTS, rand(i, 5)),
            hairColor: pick(HAIR_COLORS.slice(0, 4), rand(i, 6)).id,
            outfit: pick(MENSWEAR, rand(i, 7)),
            outfitColor: pick(OUTFIT_COLORS, rand(i, 8)).id,
            lips: "lips-bare-balm",
            brows: "brows-sculpted-espresso",
            beard: pick(BEARDS, rand(i, 10)).id,
            gait,
          }
        : {
            ...DEFAULT_LOOK,
            skin: pick(SKINS, rand(i, 4)).id,
            hairStyle: pick(STREET_HAIR, rand(i, 5)).id,
            hairColor: pick(HAIR_COLORS, rand(i, 6)).id,
            outfit: pick(STREET_OUTFITS, rand(i, 7)),
            outfitColor: pick(OUTFIT_COLORS, rand(i, 8)).id,
            gait,
          },
    };
  });
});

/** Where pedestrian `p` is at `time` seconds: pacing a to b and back. */
export function pedestrianAt(
  p: Pedestrian,
  time: number,
  out: PedestrianPose = { x: 0, z: 0, yaw: 0 },
): PedestrianPose {
  const dx = p.b[0] - p.a[0];
  const dz = p.b[1] - p.a[1];
  const length = Math.hypot(dx, dz);
  if (length === 0) {
    out.x = p.a[0];
    out.z = p.a[1];
    out.yaw = 0;
    return out;
  }
  const d =
    ((((p.start + time) * p.speed) % (length * 2)) + length * 2) % (length * 2);
  const forward = d <= length;
  const t = forward ? d / length : 2 - d / length;
  out.x = p.a[0] + dx * t;
  out.z = p.a[1] + dz * t;
  out.yaw = forward ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz);
  return out;
}

const scratch: PedestrianPose = { x: 0, z: 0, yaw: 0 };

/** The indices of the `count` pedestrians nearest `at` at `time`, within
 * `radius` meters, nearest first. */
export function nearestPedestrians(
  at: Vec2,
  time: number,
  count: number,
  radius: number,
): number[] {
  const near: { i: number; d: number }[] = [];
  PEDESTRIANS.forEach((p, i) => {
    // cheap reject: her whole strip is out of range
    const cx = (p.a[0] + p.b[0]) / 2;
    const cz = (p.a[1] + p.b[1]) / 2;
    const half = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) / 2;
    if (Math.hypot(cx - at[0], cz - at[1]) - half > radius) return;
    const pose = pedestrianAt(p, time, scratch);
    const d = Math.hypot(pose.x - at[0], pose.z - at[1]);
    if (d <= radius) near.push({ i, d });
  });
  return near
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((n) => n.i);
}
