import { spend } from "../wallet.ts";

// Sentences run on the wall clock and are saved as an end time, so the
// countdown survives a reload. Times are epoch milliseconds.
export type JailSave = { endsAt: number | null };

export const DEFAULT_JAIL: JailSave = { endsAt: null };

const MINUTE_MS = 60_000;
export const BAIL_BASE_COINS = 20;
export const BAIL_PER_MINUTE_COINS = 10;
export const GOOD_BEHAVIOUR_MS = 30_000;

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

export function bailCost(jail: JailSave, now: number): number {
  const minutesLeft = Math.ceil(remainingMs(jail, now) / MINUTE_MS);
  if (minutesLeft === 0) return 0;
  return BAIL_BASE_COINS + minutesLeft * BAIL_PER_MINUTE_COINS;
}

// Each good-behaviour win (cards, push-ups) takes time off, never below zero.
export function goodBehaviour(jail: JailSave, now: number): JailSave {
  if (jail.endsAt === null) return jail;
  const endsAt = Math.max(now, jail.endsAt - GOOD_BEHAVIOUR_MS);
  return { endsAt: endsAt === now ? null : endsAt };
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
  if (typeof value !== "object" || value === null) return DEFAULT_JAIL;
  const endsAt = (value as Record<string, unknown>).endsAt;
  return typeof endsAt === "number" && Number.isFinite(endsAt)
    ? { endsAt }
    : DEFAULT_JAIL;
}
