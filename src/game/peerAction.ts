// What a player is doing, in the 24 characters a move message's `action`
// carries: their mood; for a dance, the move, so everyone sees the same
// dance; on a seat or a ride, whether they sit, lie or stand and the height
// they're at ("sit@38", in centimeters), since moves carry only x and z;
// behind the wheel, the paint, the rims, underglow, tint and wrap packed in two
// base-36 characters, and the car ("c:ff4fb30kpebble"); after a few
// drinks, how buzzed ("idle~2"); in an emote with someone, which and which
// side ("pair:hug:f"); riding in someone's car, just "ride". A move id too
// long to fit goes as a plain "dance".
import { allows, type ContentTier } from "./age.ts";
import { isDanceMoveId, type DanceMoveId } from "./dance/moves.ts";
import { RIMS, TINTS, UNDERGLOWS, WRAPS, type CarMods } from "./city/drive.ts";
import { carById } from "./driving/roster.ts";
import { MOODS, type Mood } from "./look.ts";
import { isTogetherId, roleMove, type Pair } from "./dance/together.ts";

const LIMIT = 24;
const isMood = (a: string): a is Mood => MOODS.some((m) => m.id === a);

export type Held = { pose: "sit" | "lie" | "stand"; y: number };
const CODE = { sit: "sit", lie: "lay", stand: "up" } as const;

export type Driven = { id: string; color: string; mods?: CarMods };

const MOD_LISTS = [
  ["rims", RIMS],
  ["glow", UNDERGLOWS],
  ["tint", TINTS],
  ["wrap", WRAPS],
] as const;

// every combination of mods, as one number written in two base-36 characters
const COMBOS = MOD_LISTS.reduce((n, [, list]) => n * list.length, 1);

export type Doing = {
  mood: Mood;
  dance?: DanceMoveId;
  /** On a seat or a ride: how they're held, at this height (m). */
  seat?: Held;
  /** Driving: which car, in which paint ("#rrggbb"), with which mods. */
  car?: Driven;
  /** How buzzed, 1 to 3, shown over their head; sober is none. */
  buzz?: Tier;
  /** In an emote with another player. */
  pair?: Pair;
  /** A passenger in someone's car: out of sight, the name tag rides along. */
  ride?: true;
};

export type Tier = 1 | 2 | 3;

/** A buzz level (0..1) as the tier others see: 0 is sober. */
export function buzzTier(level: number): 0 | Tier {
  return level >= 0.75 ? 3 : level >= 0.45 ? 2 : level >= 0.2 ? 1 : 0;
}

export function encodeAction(
  mood: Mood,
  dance: DanceMoveId,
  seat?: Held,
  car?: Driven,
  buzz: 0 | Tier = 0,
  pair?: Pair,
  ride = false,
): string {
  const tag = buzz ? `~${buzz}` : "";
  const body = ride
    ? "ride"
    : pair
      ? `pair:${pair.emote}:${pair.role === "lead" ? "l" : "f"}`
      : describe(mood, dance, LIMIT - tag.length, seat, car);
  return body + tag;
}

function describe(
  mood: Mood,
  dance: DanceMoveId,
  limit: number,
  seat?: Held,
  car?: Driven,
): string {
  const paint = car && /^#([0-9a-f]{6})$/i.exec(car.color)?.[1];
  const code = MOD_LISTS.reduceRight(
    (n, [key, list]) =>
      n * list.length +
      Math.max(
        0,
        list.findIndex((m) => m.id === car?.mods?.[key]),
      ),
    0,
  );
  const mods = code.toString(36).padStart(2, "0");
  const driven = paint && `c:${paint.toLowerCase()}${mods}${car.id}`;
  if (driven && driven.length <= limit) return driven;
  if (seat) {
    const cm = Math.max(-200, Math.min(2000, Math.round(seat.y * 100)));
    return `${CODE[seat.pose]}@${cm}`;
  }
  const full = `dance:${dance}`;
  return mood === "dance" && full.length <= limit ? full : mood;
}

/** A received action: an unknown mood is idle, an unknown move no move. */
export function decodeAction(action: string): Doing {
  const tier = /~([1-3])$/.exec(action)?.[1];
  if (!tier) return decodeBody(action);
  const buzz = tier === "3" ? 3 : tier === "2" ? 2 : 1;
  return { ...decodeBody(action.slice(0, -2)), buzz };
}

function decodeBody(action: string): Doing {
  if (action === "ride") return { mood: "sit", ride: true };
  const pair = /^pair:([a-z-]{1,14}):([lf])$/.exec(action);
  if (pair) {
    const emote = pair[1];
    if (!isTogetherId(emote)) return { mood: "idle" };
    const role = pair[2] === "l" ? "lead" : "follow";
    return {
      mood: "dance",
      dance: roleMove(emote, role),
      pair: { emote, role },
    };
  }
  const car = /^c:([0-9a-f]{6})([0-9a-z]{2})([a-z0-9-]{1,14})$/.exec(action);
  if (car) {
    const mods: CarMods = {};
    let code = parseInt(car[2], 36);
    if (code < COMBOS)
      for (const [key, list] of MOD_LISTS) {
        const mod = list[code % list.length];
        code = Math.floor(code / list.length);
        if (mod && mod !== list[0]) mods[key] = mod.id;
      }
    return carById(car[3])
      ? { mood: "idle", car: { id: car[3], color: `#${car[1]}`, mods } }
      : { mood: "idle" };
  }
  const held = /^(sit|lay|up)@(-?\d{1,4})$/.exec(action);
  if (held) {
    const pose = held[1] === "up" ? "stand" : held[1] === "lay" ? "lie" : "sit";
    const y = Number(held[2]) / 100;
    return { mood: pose === "stand" ? "idle" : "sit", seat: { pose, y } };
  }
  if (action.startsWith("dance:")) {
    const move = action.slice(6);
    return isDanceMoveId(move)
      ? { mood: "dance", dance: move }
      : { mood: "dance" };
  }
  return { mood: isMood(action) ? action : "idle" };
}

/** The buzz tier to show over a peer: a 13+ client never shows one, whatever the peer sends. */
export function shownBuzz(
  buzz: Tier | undefined,
  tier: ContentTier,
): Tier | undefined {
  return allows(tier, "alcohol") ? buzz : undefined;
}
