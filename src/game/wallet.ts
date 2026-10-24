// The coin wallet: the balance cap, the starting balance, minigame payouts by
// grade, and earning and spending. Pure; balances are whole coins from 0 to
// MAX_COINS.

/** Highest balance a wallet can hold; earnings past it are dropped. */
export const MAX_COINS = 999_999;
/** Balance a new save starts with. */
export const STARTING_COINS = 100;

/** Coins paid for a minigame grade. Both games grade S to C, so one scale fits. */
const GRADE_PAY = { S: 40, A: 25, B: 12, C: 5 } as const;

/** A minigame grade, S (best) to C. */
export type PayGrade = keyof typeof GRADE_PAY;

/** Coins a minigame pays for a grade. */
export function payoutFor(grade: PayGrade): number {
  return GRADE_PAY[grade];
}

/**
 * Type guard for a valid balance: a whole number from 0 to MAX_COINS. Use it on
 * saved or network values.
 */
export function isCoins(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_COINS
  );
}

/** The balance after earning `amount`, capped at MAX_COINS. */
export function earn(coins: number, amount: number): number {
  return Math.min(MAX_COINS, coins + amount);
}

/** The balance after paying `price`, or null when the wallet cannot cover it. */
export function spend(coins: number, price: number): number | null {
  return price <= coins ? coins - price : null;
}
