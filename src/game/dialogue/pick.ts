import { LINE_BANKS } from "./index.ts";
import {
  PLACEHOLDER_IDS,
  type DialogueContext,
  type DialogueRole,
  type DialogueSituation,
  type Line,
  type LineConditions,
  type LineEntry,
  type PlaceholderId,
  type RoleBank,
} from "./types.ts";

export const RECENT_WINDOW = 6;

// A missing situation falls back to these, in order.
const FALLBACK_SITUATIONS = [
  "tapped",
  "idle",
] as const satisfies readonly DialogueSituation[];

// Neutral words that still read naturally in any placeholder slot.
const PLACEHOLDER_FALLBACKS: Record<PlaceholderId, string> = {
  name: "friend",
  item: "fit",
  place: "the place",
  drink: "drink",
};

export type Rng = () => number;

// Keys of recently used lines, oldest first. Pass the returned list back in.
export type RecentLines = readonly string[];

export type PickArgs = {
  role: DialogueRole;
  situation: DialogueSituation;
  context?: DialogueContext;
  rng: Rng;
  recent?: RecentLines;
  bank?: RoleBank;
};

export type PickResult = {
  text: string;
  recent: RecentLines;
};

// Small seeded generator (mulberry32) so tests and replays are deterministic.
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickLine({
  role,
  situation,
  context = {},
  rng,
  recent = [],
  bank = LINE_BANKS[role],
}: PickArgs): PickResult {
  const lines = eligibleLines(bank, situation, context);
  if (lines.length === 0) return { text: "...", recent };

  const key = (line: Line) => `${role}:${line.text}`;
  const fresh = lines.filter((line) => !recent.includes(key(line)));
  // When everything was used recently, take the one used longest ago.
  const chosen =
    fresh.length > 0
      ? weightedPick(fresh, rng)
      : lines.reduce((oldest, line) =>
          recent.lastIndexOf(key(line)) < recent.lastIndexOf(key(oldest))
            ? line
            : oldest,
        );

  const text = fillPlaceholders(chosen.text, context);
  return { text, recent: [...recent, key(chosen)].slice(-RECENT_WINDOW) };
}

// Replaces {name}, {item}, {place} and {drink}. Unknown tokens vanish, so no raw brace shows.
export function fillPlaceholders(
  text: string,
  context: DialogueContext,
): string {
  return text.replace(/\{(\w+)\}/g, (_, id: string) => {
    if (!isPlaceholderId(id)) return "";
    const value = context[id]?.replace(/[{}]/g, "").trim();
    return value ? value : PLACEHOLDER_FALLBACKS[id];
  });
}

function eligibleLines(
  bank: RoleBank,
  situation: DialogueSituation,
  context: DialogueContext,
): Line[] {
  for (const id of [situation, ...FALLBACK_SITUATIONS]) {
    const lines = (bank[id] ?? [])
      .map(normalize)
      .filter((line) => matches(line.when, context));
    if (lines.length > 0) return lines;
  }
  return [];
}

function normalize(entry: LineEntry): Line {
  return typeof entry === "string" ? { text: entry } : entry;
}

function matches(
  when: LineConditions | undefined,
  context: DialogueContext,
): boolean {
  if (!when) return true;
  return (
    allowed(when.neighborhood, context.neighborhood) &&
    allowed(when.venue, context.venue) &&
    allowed(when.time, context.time)
  );
}

function allowed<T extends string>(
  want: T | readonly T[] | undefined,
  have: T | undefined,
): boolean {
  if (want === undefined) return true;
  if (have === undefined) return false;
  return typeof want === "string" ? want === have : want.includes(have);
}

function weightedPick(lines: readonly Line[], rng: Rng): Line {
  const weight = (line: Line) =>
    line.weight !== undefined && Number.isFinite(line.weight) && line.weight > 0
      ? line.weight
      : 1;
  const total = lines.reduce((sum, line) => sum + weight(line), 0);
  let roll = rng() * total;
  for (const line of lines) {
    roll -= weight(line);
    if (roll < 0) return line;
  }
  return lines[lines.length - 1];
}

function isPlaceholderId(id: string): id is PlaceholderId {
  return (PLACEHOLDER_IDS as readonly string[]).includes(id);
}
