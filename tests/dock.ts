// The dock shows one contextual action as a pill and folds the others into a
// "More actions" menu (ui/ActionDock.tsx). Which one is the pill depends on
// where she stands (the El near its stairs, a taxi on a sidewalk), so tests
// ask for an action by its name and this opens the menu when it is in there.

import { expect, type Locator, type Page } from "@playwright/test";

/** The button for the dock action `name`, once it can be clicked: the pill, or
 * its entry in the More menu (opened here if it is shut). */
export async function dockAction(
  page: Page,
  name: string | RegExp,
  timeout = 150_000,
): Promise<Locator> {
  const button = page.getByRole("button", { name });
  const more = page.getByRole("button", { name: "More actions", exact: true });
  await expect
    .poll(
      async () => {
        if (await button.isVisible()) return true;
        // the action may not have registered yet: look again after opening
        if (
          (await more.isVisible()) &&
          (await more.getAttribute("aria-expanded")) !== "true"
        )
          await more.click();
        return button.isVisible();
      },
      { timeout, message: `dock action ${String(name)}` },
    )
    .toBe(true);
  return button;
}
