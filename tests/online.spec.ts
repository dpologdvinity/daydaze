import { expect, test, type Browser, type Page } from "@playwright/test";

// Two players in one Plaza copy, each in their own browser context (their
// own cookie, so their own guest).
async function player(browser: Browser): Promise<Page> {
  // a smaller canvas: two SwiftShader pages share the CPU
  const context = await browser.newContext({
    viewport: { width: 900, height: 600 },
  });
  const page = await context.newPage();
  await page.goto("/?online=1&quality=low&room=plaza");
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", "10", {
    timeout: 480_000,
  });
  return page;
}

test("two players meet in the Plaza, talk and become friends", async ({
  browser,
}) => {
  const a = await player(browser);
  const b = await player(browser);
  const tagOnA = a.locator(".peer-tag .nametag");
  const tagOnB = b.locator(".peer-tag .nametag");
  await expect(tagOnA).toHaveCount(1, { timeout: 120_000 });
  await expect(tagOnB).toHaveCount(1, { timeout: 120_000 });

  const say = a.getByRole("textbox", { name: "Chat message" });
  await say.fill("hi from the plaza");
  await say.press("Enter");
  await expect(b.locator(".peer-tag .bubble")).toHaveText("hi from the plaza", {
    timeout: 60_000,
  });

  await tagOnA.click();
  await a.getByRole("button", { name: "Add friend" }).click();
  await expect(
    a.getByRole("button", { name: "Friend request sent (take back)" }),
  ).toBeVisible();
  await tagOnB.click();
  await b.getByRole("button", { name: "Accept friend request" }).click();
  await expect(b.getByRole("button", { name: "Unfriend" })).toBeVisible();
  await b.getByRole("button", { name: "Close" }).click();
  await b.getByRole("button", { name: "Friends", exact: true }).click();
  await expect(b.getByRole("list", { name: "Your friends" })).toContainText(
    "Daydaze Plaza #1",
  );
});
