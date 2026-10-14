import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openDecks(page: Page) {
  await page.clock.install({ time: new Date("2026-10-14T22:00:00Z") });
  await page.goto("/minigames.html");
  await page.clock.pauseAt(new Date("2026-10-14T23:00:00Z"));
  await page.getByRole("button", { name: "Open DJ booth" }).click();
  await page.getByRole("button", { name: "Start the set" }).click();
}

async function axeViolations(page: Page) {
  return (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
}

const payouts = (page: Page) => page.getByLabel("Mango Decks payouts");

test("missed beats reset the streak, the result keeps the peak, and leaving pays once", async ({
  page,
}) => {
  await openDecks(page);
  await page.clock.runFor(500);
  await page.getByRole("button", { name: "Hit lane D" }).click();
  await expect(page.locator(".md-streak")).toContainText("1 streak");
  await page.clock.runFor(1200);
  await expect(page.locator(".md-streak")).toContainText("0 streak");
  await page.clock.runFor(17000);
  await expect(page.getByRole("button", { name: "Play again" })).toBeFocused();
  await expect(page.locator(".md-stats")).toContainText("Peak streak1");
  await expect(page.locator(".md-grade")).toHaveText("Grade C");
  await page.clock.runFor(2000);
  await expect(payouts(page)).toHaveText("[]");

  // A better second set: D on beat one, J on beat two.
  await page.getByRole("button", { name: "Play again" }).click();
  await page.clock.runFor(500);
  await page.getByRole("button", { name: "Hit lane D" }).click();
  await page.clock.runFor(500);
  await page.getByRole("button", { name: "Hit lane J" }).click();
  await page.clock.runFor(18000);
  await expect(page.locator(".md-stats")).toContainText("Score200");
  await page.clock.resume();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Leave the booth" }).click();
  await expect(payouts(page)).toHaveText(
    '[{"score":200,"peakStreak":2,"accuracy":6,"grade":"C"}]',
  );
  await expect(
    page.getByRole("button", { name: "Open DJ booth" }),
  ).toBeFocused();
});

test("a held key cannot score another beat, a fresh key press can", async ({
  page,
}) => {
  await openDecks(page);
  await page.clock.runFor(500);
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "d", repeat: true, bubbles: true }),
    ),
  );
  await expect(page.locator(".md-score strong")).toHaveText("0");
  await page.keyboard.press("d");
  await expect(page.locator(".md-score strong")).toHaveText("100");
});

test("audio initialization failure still permits scoring and completion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", {
      value: class {
        constructor() {
          throw new Error("Audio unavailable");
        }
      },
    });
  });
  await openDecks(page);
  await page.clock.runFor(500);
  await page.getByRole("button", { name: "Hit lane D" }).click();
  await expect(page.locator(".md-score strong")).toHaveText("100");
  await page.clock.runFor(18000);
  await page.getByRole("button", { name: "Leave the booth" }).click();
  await expect(payouts(page)).toHaveText(
    '[{"score":100,"peakStreak":1,"accuracy":3,"grade":"C"}]',
  );
  expect(errors).toEqual([]);
});

test("lanes take focus, notes meet the hit line, the booth passes axe, and Escape restores focus without paying", async ({
  page,
}) => {
  await openDecks(page);
  await expect(page.getByRole("button", { name: "Hit lane D" })).toBeFocused();
  await page.clock.runFor(500);
  const centers = await page
    .locator(".md-lane")
    .first()
    .evaluate((lane) => {
      const note = lane.querySelector(".md-note")!.getBoundingClientRect();
      const line = lane.querySelector(".md-hit-line")!.getBoundingClientRect();
      return { note: note.y + note.height / 2, line: line.y + line.height / 2 };
    });
  expect(Math.abs(centers.note - centers.line)).toBeLessThan(3);
  const pad = await page
    .getByRole("button", { name: "Hit lane K" })
    .boundingBox();
  expect(pad?.height).toBeGreaterThanOrEqual(72);
  await page.clock.resume();
  expect(await axeViolations(page)).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open DJ booth" }),
  ).toBeFocused();
  await expect(payouts(page)).toHaveText("[]");
});

test("reduced motion stills the crowd and lights but keeps notes falling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDecks(page);
  await expect(page.locator(".md-raver").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.clock.runFor(500);
  await expect(page.locator(".md-lane-0 .md-note")).toHaveCount(1);
});
