// Crazy Eights between two players online. The one who asks deals from a
// seed both share and sits as "you"; the one who says yes sits as "guard".
// Each move goes to the other player numbered, so both tables stay the same
// card for card. Messages ride the room's game relay (networkProtocol.ts) as
// short JSON; anything off is dropped.
import { MAX_GAME_DATA } from "../../net/networkProtocol.ts";
import { seatDraw, seatPlay, type Table, type Who } from "./crazyEights.ts";

export type DuelMessage =
  | { k: "invite"; seed: number }
  | { k: "accept"; seed: number }
  | { k: "decline" }
  /** Move `n` of the game: play card `i` (calling suit `s` for an eight). */
  | { k: "play"; n: number; i: number; s?: number }
  | { k: "draw"; n: number }
  | { k: "quit" };

export const encodeDuel = (m: DuelMessage): string => JSON.stringify(m);

const int = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;

export function parseDuel(data: string): DuelMessage | null {
  if (data.length > MAX_GAME_DATA) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const f = new Map<string, unknown>(Object.entries(value));
  const seed = f.get("seed");
  const n = f.get("n");
  switch (f.get("k")) {
    case "invite":
    case "accept":
      return int(seed, 2 ** 32 - 1)
        ? { k: f.get("k") === "invite" ? "invite" : "accept", seed }
        : null;
    case "decline":
      return { k: "decline" };
    case "quit":
      return { k: "quit" };
    case "draw":
      return int(n, 10_000) ? { k: "draw", n } : null;
    case "play": {
      const i = f.get("i");
      const s = f.get("s");
      if (!int(n, 10_000) || !int(i, 60)) return null;
      if (s === undefined) return { k: "play", n, i };
      return int(s, 3) ? { k: "play", n, i, s } : null;
    }
    default:
      return null;
  }
}

/** A move by `who`: the table after it, or the same table if it's not
 * theirs to make. */
export function applyMove(t: Table, who: Who, m: DuelMessage): Table {
  if (m.k === "play") return seatPlay(t, who, m.i, m.s);
  if (m.k === "draw") return seatDraw(t, who);
  return t;
}

export const otherSeat = (who: Who): Who => (who === "you" ? "guard" : "you");
