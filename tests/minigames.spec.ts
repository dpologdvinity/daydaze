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
  await page.clock.fastForward(18000);
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
  await page.clock.fastForward(18000);
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
  await page.clock.fastForward(18000);
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

async function openBar(page: Page) {
  await page.clock.install({ time: new Date("2026-10-14T22:00:00Z") });
  await page.goto("/minigames.html");
  await page.clock.pauseAt(new Date("2026-10-14T23:00:00Z"));
  await page.getByRole("button", { name: "Open the bar" }).click();
  await page.getByRole("button", { name: "Take the first order" }).click();
}

type Ticket = { pours: string[]; glass: string; garnish: string };

/** Reads the drink off the recipe card the way a player would. */
async function readTicket(page: Page): Promise<Ticket> {
  const items = await page
    .getByRole("list", { name: "Recipe card" })
    .getByRole("listitem")
    .allInnerTexts();
  const pours = items.flatMap((item) => {
    const [, label, count] = /^(.*?)(?: × (\d+))?$/.exec(item.trim()) ?? [];
    return Array<string>(Number(count ?? 1)).fill(label);
  });
  const [glass, garnish] = await page.locator(".mx-specs dd").allInnerTexts();
  return { pours, glass, garnish };
}

async function build(page: Page, ticket: Ticket, garnish = ticket.garnish) {
  for (const name of [...ticket.pours, ticket.glass, garnish]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
}

/** Stops the needle dead centre: it sweeps across and back every 1.6 s. */
async function mixPerfectly(page: Page) {
  await page.getByRole("button", { name: /^(Shake|Stir) it$/ }).click();
  await page.clock.runFor(400);
  await page.getByRole("button", { name: /^Stop (shaking|stirring)$/ }).click();
  await expect(page.locator(".mx-quality")).toHaveText(/^Perfect/);
  await page.clock.runFor(400);
}

const barPayouts = (page: Page) => page.getByLabel("Last Call payouts");

test("the recipe card is what gets judged, and a perfect round pays once even when serving rapidly", async ({
  page,
}) => {
  // Five full orders take about 35s alone and more under parallel load.
  test.setTimeout(120_000);
  await openBar(page);
  for (let order = 0; order < 5; order++) {
    await build(page, await readTicket(page));
    await mixPerfectly(page);
    await page
      .getByRole("button", { name: /^Serve / })
      .evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
    const receipt = page.locator(".mx-receipt");
    await expect(receipt).toContainText("tipped");
    await expect(receipt.locator(".mx-lost")).toHaveCount(0);
    const total = (await receipt.locator(".mx-receipt-head").innerText())
      .split(" ")
      .pop();
    if (order === 0) {
      await expect(page.locator(".mx-tally dd").first()).toHaveText(
        total ?? "",
      );
    }
    await expect(page.locator(".mx-tally dd").last()).toHaveText(
      String(order + 1),
    );
    await page.clock.runFor(400);
    await page
      .getByRole("button", { name: /^(Next guest|Close out the round)$/ })
      .click();
  }
  await expect(page.locator(".mx-grade")).toHaveText("Grade S");
  await expect(page.locator(".mx-stats")).toContainText("Served5 of 5");
  await expect(page.locator(".mx-stats")).toContainText("Perfect5");
  const tips = await page.locator(".mx-stats dd").first().innerText();
  await expect(barPayouts(page)).toHaveText("[]");
  await page.getByRole("button", { name: "Close up" }).click();
  await expect(barPayouts(page)).toHaveText(
    `[{"tips":${tips},"served":5,"perfect":5,"grade":"S"}]`,
  );
  await expect(
    page.getByRole("button", { name: "Open the bar" }),
  ).toBeFocused();
});

test("a wrong garnish loses its tip and the streak, and leaving mid-round pays nothing", async ({
  page,
}) => {
  await openBar(page);
  const ticket = await readTicket(page);
  // No drink on the menu takes a lime wheel.
  await build(page, ticket, "Lime wheel");
  await mixPerfectly(page);
  await page.getByRole("button", { name: /^Serve / }).click();
  const receipt = page.locator(".mx-receipt");
  await expect(receipt.getByRole("listitem")).toHaveText([
    /^Pour \+\d+$/,
    "Glass +2",
    "Garnish +0",
    /^Perfect (shake|stir) \+3$/,
    "Quick serve +3",
  ]);
  await expect(receipt.locator(".mx-lost")).toHaveText("Garnish +0");
  await expect(page.locator(".mx-tally dd").last()).toHaveText("0");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(barPayouts(page)).toHaveText("[]");
  await expect(
    page.getByRole("button", { name: "Open the bar" }),
  ).toBeFocused();
});

test("audio failure cannot interrupt pouring, mixing or serving", async ({
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
  await openBar(page);
  await build(page, await readTicket(page));
  await mixPerfectly(page);
  await page.getByRole("button", { name: /^Serve / }).click();
  await expect(page.locator(".mx-receipt")).toContainText("tipped");
  expect(errors).toEqual([]);
});

test("the bar plays by keyboard alone, has big tap targets, and passes axe", async ({
  page,
}) => {
  await openBar(page);
  await expect(page.getByRole("button", { name: "Tequila" })).toBeFocused();
  const ticket = await readTicket(page);
  for (const name of [...ticket.pours, ticket.glass, ticket.garnish]) {
    await page.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
  }
  for (const chip of await page.locator(".mx-chip").all()) {
    expect((await chip.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  }
  await page.clock.resume();
  expect(await axeViolations(page)).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.clock.pauseAt(new Date("2026-10-14T23:30:00Z"));

  await page.getByRole("button", { name: /^(Shake|Stir) it$/ }).focus();
  await page.keyboard.press("Enter");
  const stop = page.getByRole("button", { name: /^Stop (shaking|stirring)$/ });
  await expect(stop).toBeFocused();
  await page.clock.runFor(400);
  await page.keyboard.press("Space");
  await expect(page.locator(".mx-quality")).toHaveText(/^Perfect/);
  await page.clock.runFor(400);
  await expect(page.getByRole("button", { name: /^Serve / })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".mx-receipt")).toContainText("tipped");
  await expect(page.getByRole("button", { name: "Next guest" })).toBeFocused();
  await page.clock.resume();
  expect(await axeViolations(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open the bar" }),
  ).toBeFocused();
});

test("reduced motion holds the glass and neon still but the meter keeps sweeping", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openBar(page);
  await page.getByRole("button", { name: "Soda water" }).click();
  await page.getByRole("button", { name: /^(Shake|Stir) it$/ }).click();
  await expect(page.locator(".mx-glass")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".mx-neon")).toHaveCSS("animation-name", "none");
  await page.clock.runFor(400);
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "50");
});
