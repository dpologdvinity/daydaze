// Reuse existing handwritten dialogue verbatim; no generated vendor dialogue.
// shortcut: counters share existing handwritten copy; use distinct voices when the owner supplies new lines.
import { cashierBank } from "./cashier.ts";
import { snackCashierBank } from "./snack-cashier.ts";
import { serverBank } from "./server.ts";
import { regularBank } from "./regular.ts";
import type { DialogueSituation, RoleBank } from "./types.ts";
function select(
  bank: RoleBank,
  situation: DialogueSituation,
  indices: readonly number[],
) {
  return (bank[situation] ?? []).filter((_, i) => indices.includes(i));
}
export const streetFoodVendorBank: RoleBank = {
  "greeting-first": [
    ...select(cashierBank, "greeting-first", [3, 5, 6, 7, 8, 10]),
    ...select(serverBank, "greeting-first", [5]),
    ...select(snackCashierBank, "greeting-first", [6]),
    ...select(regularBank, "greeting-first", [2, 8]),
  ],
  tapped: [
    ...select(cashierBank, "tapped", [0, 10]),
    ...select(snackCashierBank, "tapped", [0, 2, 4, 6]),
    ...select(serverBank, "tapped", [0, 5, 6, 9]),
  ],
  idle: [
    ...select(cashierBank, "idle", [0, 7, 10]),
    ...select(snackCashierBank, "idle", [3, 5]),
    ...select(serverBank, "idle", [2, 4, 5, 9, 12]),
  ],
  goodbye: [
    ...select(snackCashierBank, "goodbye", [0, 2, 4, 7, 9]),
    ...select(cashierBank, "goodbye", [8, 9]),
    ...select(serverBank, "goodbye", [0, 6, 7]),
  ],
};
