export const MAX_COINS = 999_999;
export const STARTING_COINS = 100;

/** Coins paid for a minigame grade. Both games grade S to C, so one scale fits. */
const GRADE_PAY = { S: 40, A: 25, B: 12, C: 5 } as const;

export type PayGrade = keyof typeof GRADE_PAY;

export function payoutFor(grade: PayGrade): number {
  return GRADE_PAY[grade];
}

export function isCoins(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_COINS
  );
}

export function earn(coins: number, amount: number): number {
  return Math.min(MAX_COINS, coins + amount);
}

/** The balance after paying `price`, or null when the wallet cannot cover it. */
export function spend(coins: number, price: number): number | null {
  return price <= coins ? coins - price : null;
}
