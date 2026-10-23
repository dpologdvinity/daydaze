import type { Penalty } from "./shoplift.ts";

// Offence count and store bans, saved so a ban and a repeat offence survive a reload.
export type CrimeSave = {
  offences: number;
  /** Store id to the epoch millisecond the ban ends. */
  bans: Record<string, number>;
  /** The "stolen" tag: item id to the store it was lifted from. */
  stolen: Record<string, string>;
};

export const DEFAULT_CRIME: CrimeSave = { offences: 0, bans: {}, stolen: {} };

export function isBanned(
  crime: CrimeSave,
  storeId: string,
  now: number,
): boolean {
  const until = crime.bans[storeId];
  return until !== undefined && until > now;
}

export function recordCaught(
  crime: CrimeSave,
  storeId: string,
  now: number,
  penalty: Penalty,
): CrimeSave {
  const bans =
    penalty.kind === "warning"
      ? { ...crime.bans, [storeId]: now + penalty.banMs }
      : crime.bans;
  return { ...crime, offences: crime.offences + 1, bans };
}

const MAX_OFFENCES = 1000;
const MAX_BANS = 50;
const MAX_STOLEN = 200;

// Saved crime data is untrusted: keep a sane count and finite ban times only.
export function validateCrime(value: unknown): CrimeSave {
  if (typeof value !== "object" || value === null) return DEFAULT_CRIME;
  const { offences, bans, stolen } = value as Record<string, unknown>;
  const count =
    typeof offences === "number" && Number.isInteger(offences) && offences >= 0
      ? Math.min(offences, MAX_OFFENCES)
      : 0;
  const kept: Record<string, number> = {};
  if (typeof bans === "object" && bans !== null) {
    for (const [storeId, until] of Object.entries(bans)) {
      if (Object.keys(kept).length >= MAX_BANS) break;
      if (storeId.length > 64) continue;
      if (typeof until === "number" && Number.isFinite(until)) {
        kept[storeId] = until;
      }
    }
  }
  const tags: Record<string, string> = {};
  if (typeof stolen === "object" && stolen !== null) {
    for (const [itemId, storeId] of Object.entries(stolen)) {
      if (Object.keys(tags).length >= MAX_STOLEN) break;
      if (itemId.length > 64 || typeof storeId !== "string") continue;
      if (storeId.length <= 64) tags[itemId] = storeId;
    }
  }
  return { offences: count, bans: kept, stolen: tags };
}
