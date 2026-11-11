/** A stack-limited inventory: add() merges into existing stacks up to MAX per stack, then opens new stacks. Returns how many items did not fit. */
export const MAX = 10;
export type Stack = { id: string; count: number };
export function add(slots: (Stack | null)[], id: string, count: number): number {
  let left = count;
  for (const s of slots) {
    if (s && s.id === id && s.count < MAX) {
      const take = Math.min(MAX, left);
      s.count += take;
      left -= take;
    }
  }
  for (let i = 0; i < slots.length && left > 0; i++) {
    if (!slots[i]) {
      const take = Math.min(MAX, left);
      slots[i] = { id, count: take };
      left -= take;
    }
  }
  return left;
}
