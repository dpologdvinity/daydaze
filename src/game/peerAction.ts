// What a player is doing, in the 24 characters a move message's `action`
// carries: their mood; for a dance, the move, so everyone sees the same
// dance; on a seat or a ride, whether they sit, lie or stand and the height
// they're at ("sit@38", in centimeters), since moves carry only x and z; behind the
// wheel, the car and its paint ("car:pebble:ff4fb3"). A move id too long to
// fit goes as a plain "dance".
import { isDanceMoveId, type DanceMoveId } from "./dance/moves.ts";
import { carById } from "./driving/roster.ts";
import { MOODS, type Mood } from "./look.ts";

const LIMIT = 24;
const isMood = (a: string): a is Mood => MOODS.some((m) => m.id === a);

export type Held = { pose: "sit" | "lie" | "stand"; y: number };
const CODE = { sit: "sit", lie: "lay", stand: "up" } as const;

export type Doing = {
  mood: Mood;
  dance?: DanceMoveId;
  /** On a seat or a ride: how they're held, at this height (m). */
  seat?: Held;
  /** Driving: which car, in which paint ("#rrggbb"). */
  car?: { id: string; color: string };
};

export function encodeAction(
  mood: Mood,
  dance: DanceMoveId,
  seat?: Held,
  car?: { id: string; color: string },
): string {
  const paint = car && /^#([0-9a-f]{6})$/i.exec(car.color)?.[1];
  const driven = paint && `car:${car.id}:${paint.toLowerCase()}`;
  if (driven && driven.length <= LIMIT) return driven;
  if (seat) {
    const cm = Math.max(-200, Math.min(2000, Math.round(seat.y * 100)));
    return `${CODE[seat.pose]}@${cm}`;
  }
  const full = `dance:${dance}`;
  return mood === "dance" && full.length <= LIMIT ? full : mood;
}

/** A received action: an unknown mood is idle, an unknown move no move. */
export function decodeAction(action: string): Doing {
  const car = /^car:([a-z0-9-]{1,14}):([0-9a-f]{6})$/.exec(action);
  if (car)
    return carById(car[1])
      ? { mood: "idle", car: { id: car[1], color: `#${car[2]}` } }
      : { mood: "idle" };
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
