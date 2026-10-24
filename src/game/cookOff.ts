// The Filipino cook-off at Kamayan Hall: two cooks, one kitchen, the same
// eight tickets (orders.ts, one shared seed). Highest score wins. Online the
// scores ride the room's game relay; offline you cook against Tita Baby's
// ghost score for that seed. Pure.
import { MAX_GAME_DATA } from "../net/networkProtocol.ts";
import { MAX_TIP, ORDER_POINTS, TICKETS, type Station } from "./orders.ts";

export const COOKOFF: Station = {
  ingredients: [
    { id: "rice", label: "Garlic rice" },
    { id: "pork", label: "Pork" },
    { id: "chicken", label: "Chicken" },
    { id: "shrimp", label: "Shrimp" },
    { id: "soy", label: "Soy sauce" },
    { id: "vinegar", label: "Cane vinegar" },
    { id: "garlic", label: "Garlic" },
    { id: "tamarind", label: "Tamarind broth" },
    { id: "kangkong", label: "Kangkong" },
    { id: "noodles", label: "Pancit noodles" },
    { id: "wrapper", label: "Lumpia wrapper" },
    { id: "peanut", label: "Peanut sauce" },
    { id: "egg", label: "Egg" },
    { id: "calamansi", label: "Calamansi" },
  ],
  menu: [
    {
      name: "Chicken adobo",
      recipe: ["chicken", "soy", "vinegar", "garlic", "rice"],
    },
    { name: "Pork adobo", recipe: ["pork", "soy", "vinegar", "garlic"] },
    {
      name: "Sinigang na hipon",
      recipe: ["shrimp", "tamarind", "kangkong", "rice"],
    },
    { name: "Pork sinigang", recipe: ["pork", "tamarind", "kangkong"] },
    {
      name: "Pancit canton",
      recipe: ["noodles", "chicken", "shrimp", "soy", "calamansi"],
    },
    { name: "Lumpia shanghai", recipe: ["wrapper", "pork", "garlic"] },
    { name: "Kare-kare", recipe: ["pork", "peanut", "kangkong", "rice"] },
    { name: "Sisig", recipe: ["pork", "egg", "calamansi", "garlic", "rice"] },
    { name: "Silog plate", recipe: ["rice", "egg", "garlic"] },
  ],
};

/** Tita Baby's score for a seed: six to eight right, a few tips. */
export function ghostScore(seed: number): number {
  const h = Math.imul(seed ^ 0x5bd1e995, 0x27d4eb2d) >>> 0;
  const right = 6 + (h % 3);
  return Math.min(
    TICKETS * (ORDER_POINTS + MAX_TIP),
    right * ORDER_POINTS + ((h >>> 8) % (right * 3 + 1)),
  );
}

export function outcome(mine: number, theirs: number): "win" | "lose" | "tie" {
  return mine > theirs ? "win" : mine < theirs ? "lose" : "tie";
}

export type CookMessage =
  | { k: "cook-invite"; seed: number }
  | { k: "cook-accept"; seed: number }
  | { k: "cook-score"; score: number }
  | { k: "cook-stop" };

export const encodeCook = (m: CookMessage) => JSON.stringify(m);

const MAX_SCORE = TICKETS * (ORDER_POINTS + MAX_TIP);
const int = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;

/** A relayed message, if it's one of ours and well formed. */
export function parseCook(data: string): CookMessage | null {
  if (data.length > MAX_GAME_DATA) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const k: unknown = Reflect.get(value, "k");
  if (k === "cook-stop") return { k };
  if (k === "cook-invite" || k === "cook-accept") {
    const seed: unknown = Reflect.get(value, "seed");
    return int(seed, 2 ** 31) ? { k, seed } : null;
  }
  if (k === "cook-score") {
    const score: unknown = Reflect.get(value, "score");
    return int(score, MAX_SCORE) ? { k, score } : null;
  }
  return null;
}

/**
 * Which stove you cook at (0 or 1): alone you take the first and Tita Baby
 * the second; in a match the two players sort by id, so each client puts
 * its cook at a different stove.
 */
export function myStove(me: string | null, rival: string | null): 0 | 1 {
  if (!me || !rival) return 0;
  return me < rival ? 0 : 1;
}
