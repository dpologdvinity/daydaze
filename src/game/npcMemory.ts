// What recurring NPCs remember about the player: per NPC, how many days they
// have met and the last day. From that, which greeting the NPC gives and
// whether it uses the player's name. Saved with the player (SaveV1.npcs), local
// only; the record is capped, so a save can't grow without bound. Pure.

import type { DialogueSituation } from "./dialogue/types.ts";
import { isRecord } from "./typed.ts";

export type NpcMemory = {
  /** Distinct days the player has met this NPC. */
  visits: number;
  /** The last of those days (challenges.ts `dayOf`). */
  last: number;
};

/** Memories by `npcKey`. */
export type NpcMemories = Record<string, NpcMemory>;

/** Days away after which an NPC greets the player as someone back from afar. */
export const RETURNING_DAYS = 7;
/** Visit days from which an NPC calls the player by name. */
const NAME_VISITS = 2;
/** The most NPCs remembered; past it, the longest unseen are forgotten. */
export const MAX_NPCS = 150;
/** Cap on a visit count, so a hand-edited save stays sane. */
export const MAX_VISITS = 9999;

const KEY_PATTERN = /^[a-z0-9-]{1,40}:[a-z0-9-]{1,40}$/;

function slug(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "npc";
}

/** The memory key for an NPC: its venue (room id) and name, as lowercase slugs. */
export function npcKey(venue: string | undefined, name: string): string {
  return `${slug(venue ?? "city")}:${slug(name)}`;
}

/**
 * The greeting an NPC gives: first for a stranger (and for the first day's
 * later meetings), returning after RETURNING_DAYS away, regular otherwise.
 */
export function greetingFor(
  memory: NpcMemory | undefined,
  day: number,
): Extract<
  DialogueSituation,
  "greeting-first" | "greeting-regular" | "greeting-returning"
> {
  if (!memory || (memory.visits <= 1 && memory.last === day))
    return "greeting-first";
  return day - memory.last >= RETURNING_DAYS
    ? "greeting-returning"
    : "greeting-regular";
}

/** Whether this NPC knows the player well enough to use their name. */
export function knowsPlayer(memory: NpcMemory | undefined): boolean {
  return memory !== undefined && memory.visits >= NAME_VISITS;
}

// The newest MAX_NPCS entries, in a fresh record.
function capped(entries: [string, NpcMemory][]): NpcMemories {
  const kept =
    entries.length > MAX_NPCS
      ? [...entries].sort((a, b) => a[1].last - b[1].last).slice(-MAX_NPCS)
      : entries;
  return Object.fromEntries(kept);
}

/**
 * The record after meeting `key` on `day`: one more visit per new day. The
 * same record comes back for a repeat of the day, a day before the last
 * (a clock that went backwards) or a bad key or day.
 */
export function meet(
  memories: NpcMemories,
  key: string,
  day: number,
): NpcMemories {
  if (!KEY_PATTERN.test(key) || !Number.isSafeInteger(day) || day < 0)
    return memories;
  const before = memories[key];
  if (before && day <= before.last) return memories;
  const next: NpcMemory = {
    visits: Math.min((before?.visits ?? 0) + 1, MAX_VISITS),
    last: day,
  };
  return capped([
    ...Object.entries(memories).filter(([k]) => k !== key),
    [key, next],
  ]);
}

function whole(value: unknown, min: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min;
}

/** The record read from storage: bad entries dropped, visits clamped, size capped. */
export function cleanNpcMemories(value: unknown): NpcMemories {
  if (!isRecord(value)) return {};
  const entries: [string, NpcMemory][] = [];
  for (const [key, entry] of Object.entries(value)) {
    if (!KEY_PATTERN.test(key) || !isRecord(entry)) continue;
    const { visits, last } = entry;
    if (whole(visits, 1) && whole(last, 0))
      entries.push([key, { visits: Math.min(visits, MAX_VISITS), last }]);
  }
  return capped(entries);
}
