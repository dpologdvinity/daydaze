// Records from Vinyl Vault: each of the jukebox's tracks on vinyl. Bought
// ones play on the record player at home. Pure.
import { spend } from "./wallet.ts";

/** The jukebox's tracks, by id (src/audio/proceduralJukebox.ts; its test
 * checks the two lists match). Kept here so the save, which the server
 * also reads, needs no browser audio code. */
export const RECORD_IDS = [
  "savanna-nightclub",
  "canopy-lofi",
  "waterhole-twilight",
  "carnival-calliope",
  "sugar-rush-pop",
  "warehouse-acid",
  "player-two-chiptune",
  "la-noche-salsa",
  "roller-disco",
] as const;
export type RecordId = (typeof RECORD_IDS)[number];

/** Coins for one record. */
export const RECORD_PRICE = 30;

export function isTrackId(id: unknown): id is RecordId {
  return RECORD_IDS.some((r) => r === id);
}

/** A saved crate: real tracks only, each once. */
export function cleanRecords(value: unknown): RecordId[] {
  const ids = Array.isArray(value) ? value.filter(isTrackId) : [];
  return [...new Set(ids)];
}

export type RecordSale =
  | { ok: true; coins: number; records: RecordId[] }
  | { ok: false; reason: "owned" | "unknown" | "coins" };

export function buyRecord(
  coins: number,
  records: readonly RecordId[],
  id: string,
): RecordSale {
  if (!isTrackId(id)) return { ok: false, reason: "unknown" };
  if (records.includes(id)) return { ok: false, reason: "owned" };
  const left = spend(coins, RECORD_PRICE);
  if (left === null) return { ok: false, reason: "coins" };
  return { ok: true, coins: left, records: [...records, id] };
}
