// Your garage: the road cars you own. Everyone starts with the beater; the
// rest are bought at Daydaze Motors for their roster price. Pure.
import type { CarSpec } from "./driving/car.ts";
import { ROAD_CARS } from "./driving/roster.ts";
import { spend } from "./wallet.ts";

export const STARTER = "quill-lite";

/** Coins at the dealership: the roster's sticker price scaled to a game
 * paying 5 to 40 coins, rounded to tens (a Pebble is 140, the Zenith 8,800). */
export function priceOf(car: CarSpec): number {
  return Math.round(car.price / 25 / 10) * 10;
}

const isRoadCar = (id: unknown): id is string =>
  typeof id === "string" && ROAD_CARS.some((c) => c.id === id);

/** A saved garage: known road cars only, each once, the starter always. */
export function cleanGarage(value: unknown): string[] {
  const ids = Array.isArray(value) ? value.filter(isRoadCar) : [];
  return [...new Set([STARTER, ...ids])];
}

export type Purchase =
  | { ok: true; coins: number; garage: string[] }
  | { ok: false; reason: "owned" | "unknown" | "coins" };

/** Buys car `id` for its price, if it's a road car you don't own yet. */
export function buyCar(
  coins: number,
  garage: readonly string[],
  id: string,
): Purchase {
  const car = ROAD_CARS.find((c) => c.id === id);
  if (!car) return { ok: false, reason: "unknown" };
  if (garage.includes(id)) return { ok: false, reason: "owned" };
  const left = spend(coins, priceOf(car));
  if (left === null) return { ok: false, reason: "coins" };
  return { ok: true, coins: left, garage: [...garage, id] };
}
