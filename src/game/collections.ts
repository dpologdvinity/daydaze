// Collections: a photo album of the places you've been, closet sets that pay
// a reward once you own every piece, and a sticker book of your best grade in
// each game. Places and claimed sets are save fields; stickers come straight
// from the personal bests. (Snapshot thumbnails live on the device, in
// src/client/album.ts: images are too big for the save.) Pure.

import { gradeFor, PRIZE_GAMES, PRIZE_TABLES, type Bests } from "./prizes.ts";
import type { PrizeGame } from "./prizes.ts";
import { isRoomId, ROOMS, type RoomId } from "./rooms.ts";
import type { PayGrade } from "./wallet.ts";

/** Every place that gets a page in the album: all but the cells. */
export const ALBUM_PLACES: readonly RoomId[] = Object.keys(ROOMS)
  .filter(isRoomId)
  .filter((id) => id !== "jail");

/** `visited` with `room` added (once), if it's an album place. */
export function visit(visited: readonly RoomId[], room: RoomId): RoomId[] {
  if (visited.includes(room) || !ALBUM_PLACES.includes(room))
    return [...visited];
  return [...visited, room];
}

/** A closet set: own every piece and claim its reward, once. */
export type ClosetSet = {
  id: string;
  label: string;
  /** Shop item ids (src/game/shop.ts). */
  items: readonly string[];
  /** Coins for completing it. */
  reward: number;
};

export const CLOSET_SETS: readonly ClosetSet[] = [
  {
    id: "y2k",
    label: "Y2K princess",
    items: [
      "tracksuit-y2k",
      "baby-tee-mini",
      "platforms",
      "lips-blue-raspberry-gloss",
      "#ffb3d9",
    ],
    reward: 120,
  },
  {
    id: "red-carpet",
    label: "Red carpet",
    items: [
      "sequin-slip",
      "glam-faux-fur",
      "lips-chrome-berry",
      "diamond-stud",
    ],
    reward: 200,
  },
  {
    id: "salon-day",
    label: "Salon day",
    items: ["sleek-bob", "curl-cloud", "#c0c0c8", "#7ee8a2"],
    reward: 150,
  },
  {
    id: "thrift-queen",
    label: "Thrift queen",
    items: ["#c9a227", "#6b7a2a", "#b5502a", "#3a5a8a", "#f2e6c8", "#6a1a2a"],
    reward: 80,
  },
  {
    id: "pierced",
    label: "All the sparkle",
    items: ["rose-gold-stud", "rose-gold-ring", "diamond-stud", "opal-stud"],
    reward: 100,
  },
];

/** How much of a set the wardrobe holds. */
export function setProgress(set: ClosetSet, wardrobe: readonly string[]) {
  const owned = set.items.filter((id) => wardrobe.includes(id)).length;
  return {
    owned,
    total: set.items.length,
    complete: owned === set.items.length,
  };
}

export type ClaimResult =
  | { ok: true; coins: number; sets: string[] }
  | { ok: false; reason: "unknown" | "incomplete" | "claimed" };

/** Claims a complete set's reward: coins up, the set marked claimed. */
export function claimSet(
  save: { coins: number; wardrobe: readonly string[]; sets: readonly string[] },
  id: string,
): ClaimResult {
  const set = CLOSET_SETS.find((s) => s.id === id);
  if (!set) return { ok: false, reason: "unknown" };
  if (save.sets.includes(id)) return { ok: false, reason: "claimed" };
  if (!setProgress(set, save.wardrobe).complete)
    return { ok: false, reason: "incomplete" };
  return { ok: true, coins: save.coins + set.reward, sets: [...save.sets, id] };
}

/** One page of the sticker book: a game and your best grade there, if any. */
export type Sticker = {
  game: PrizeGame;
  label: string;
  grade: PayGrade | null;
};

/** A sticker per game, graded on your personal best. */
export function stickers(bests: Bests): Sticker[] {
  return PRIZE_GAMES.map((game) => {
    const best = bests[game];
    return {
      game,
      label: PRIZE_TABLES[game].label,
      grade: best === undefined ? null : gradeFor(game, best),
    };
  });
}

/** Stored visited places: known album places only, each once. */
export function cleanVisited(value: unknown): RoomId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v, i): v is RoomId =>
      isRoomId(v) && ALBUM_PLACES.includes(v) && value.indexOf(v) === i,
  );
}

/** Stored claimed sets: known set ids only, each once. */
export function cleanSets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v, i): v is string =>
      typeof v === "string" &&
      CLOSET_SETS.some((s) => s.id === v) &&
      value.indexOf(v) === i,
  );
}
