// Shared helper for barista station tests and screenshots (BaristaPanel.tsx):
// fulfills shift tickets according to recipes so shifts qualify as passed.

import { expect, type Locator } from "@playwright/test";
import { ESPRESSO } from "../src/game/barista.ts";
import { TICKETS } from "../src/game/orders.ts";

const ESPRESSO_LABELS = new Map(
  ESPRESSO.ingredients.map((i) => [i.id, i.label]),
);
const ESPRESSO_RECIPES = new Map(
  ESPRESSO.menu.map((m) => [
    m.name,
    m.recipe.map((id) => ESPRESSO_LABELS.get(id) ?? id),
  ]),
);

/** Completes an 8-ticket shift at the barista station with all correct orders. */
export async function completeBaristaShift(panel: Locator): Promise<void> {
  for (let i = 0; i < TICKETS; i++) {
    await expect(panel.getByLabel("Shift")).toContainText(
      `${i + 1}/${TICKETS}`,
    );
    const text = (await panel.getByRole("status").textContent()) ?? "";
    const match = text.match(/(?:Ticket|Next):\s*([^\n\r]+)/);
    const drink = match ? match[1].trim() : "";
    const ingredients = ESPRESSO_RECIPES.get(drink) ?? [];
    for (const ingredient of ingredients) {
      await panel
        .getByRole("button", { name: ingredient, exact: true })
        .click();
    }
    await panel.getByRole("button", { name: "Hand it over" }).click();
  }
}
