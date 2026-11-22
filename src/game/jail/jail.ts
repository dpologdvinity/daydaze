// Jail sentences and bail, saved as an end time on the wall clock so the
// countdown survives a reload.
import { spend } from "../wallet.ts";
import type { RoomId } from "../roomTypes.ts";
import { isRecord } from "../typed.ts";

// Sentences run on the wall clock and are saved as an end time, so the
// countdown survives a reload. Times are epoch milliseconds.
export type JailSave = { endsAt: number | null };

export const DEFAULT_JAIL: JailSave = { endsAt: null };

const MINUTE_MS = 60_000;
export const BAIL_BASE_COINS = 20;
export const BAIL_PER_MINUTE_COINS = 10;
export const GOOD_BEHAVIOR_MS = 30_000;

export function sentence(now: number, minutes: number): JailSave {
  return { endsAt: now + minutes * MINUTE_MS };
}

export function remainingMs(jail: JailSave, now: number): number {
  if (jail.endsAt === null) return 0;
  return Math.max(0, jail.endsAt - now);
}

export function isJailed(jail: JailSave, now: number): boolean {
  return remainingMs(jail, now) > 0;
}

/** The cell block is the only available destination during a sentence. */
export function jailAllowsTravel(
  jail: JailSave,
  now: number,
  room: RoomId,
): boolean {
  return room === "jail" || !isJailed(jail, now);
}

export function bailCost(jail: JailSave, now: number): number {
  const minutesLeft = Math.ceil(remainingMs(jail, now) / MINUTE_MS);
  if (minutesLeft === 0) return 0;
  return BAIL_BASE_COINS + minutesLeft * BAIL_PER_MINUTE_COINS;
}

// Each good-behavior win (cards, push-ups) takes time off, never below zero.
export function goodBehavior(jail: JailSave, now: number): JailSave {
  if (jail.endsAt === null) return jail;
  const endsAt = Math.max(now, jail.endsAt - GOOD_BEHAVIOR_MS);
  return { endsAt: endsAt === now ? null : endsAt };
}

/** A qualifying community service set earns a minute off. */
export function rhythmService(
  jail: JailSave,
  now: number,
  grade: "S" | "A" | "B" | "C" | null,
): JailSave {
  if (grade === null || grade === "C") return jail;
  return goodBehavior(goodBehavior(jail, now), now);
}

// Pays the bail from the wallet. Null when the player cannot afford it.
export function bailOut(
  jail: JailSave,
  now: number,
  coins: number,
): { jail: JailSave; coins: number } | null {
  if (!isJailed(jail, now)) return { jail, coins };
  const left = spend(coins, bailCost(jail, now));
  return left === null ? null : { jail: { endsAt: null }, coins: left };
}

// Saved jail times are untrusted: anything that is not a finite time is dropped.
export function validateJail(value: unknown): JailSave {
  if (!isRecord(value)) return DEFAULT_JAIL;
  const endsAt = value.endsAt;
  return typeof endsAt === "number" && Number.isFinite(endsAt)
    ? { endsAt }
    : DEFAULT_JAIL;
}
