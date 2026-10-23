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

test("two players meet in the Plaza, talk, become friends and play cards", async ({
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
  // B turns on the strict filter: A's swearing reaches B masked
  await b.getByLabel("Strict chat filter: hide swearing too").check();
  await b.getByRole("button", { name: "Close" }).click();
  await say.fill("well damn that");
  await say.press("Enter");
  await expect(b.locator(".peer-tag .bubble")).toHaveText("well **** that", {
    timeout: 60_000,
  });

  // a hand of Crazy Eights: A deals and goes first
  await tagOnA.click();
  await a.getByRole("button", { name: "Play Crazy Eights" }).click();
  const invite = b.getByRole("region", { name: "Card game invite" });
  await invite.getByRole("button", { name: "Play" }).click({ timeout: 60_000 });
  const tableA = a.getByRole("region", { name: "Crazy Eights" });
  const tableB = b.getByRole("region", { name: "Crazy Eights" });
  await expect(tableA.getByRole("status")).toContainText("Your turn", {
    timeout: 60_000,
  });
  await expect(tableB.getByRole("status")).toContainText("'s turn");
  await tableA.getByRole("button", { name: "Draw" }).click();
  await expect(tableB.getByRole("status")).toContainText("Your turn", {
    timeout: 60_000,
  });
  await expect(tableB).toContainText("holds 6");

  // a hug: A asks, B says yes and steps in; each sees the other in the pose
  await tagOnA.click();
  await a
    .getByRole("group", { name: "Do something together" })
    .getByRole("button", { name: "Hug" })
    .click();
  const ask = b.getByRole("region", { name: "Emote invite" });
  await ask.getByRole("button", { name: "Yes" }).click({ timeout: 60_000 });
  await expect(a.locator(".peer-tag")).toHaveAttribute(
    "data-doing",
    "pair:hug",
    { timeout: 60_000 },
  );
  await expect(b.locator(".peer-tag")).toHaveAttribute(
    "data-doing",
    "pair:hug",
    { timeout: 60_000 },
  );
  await b
    .getByRole("region", { name: "Together" })
    .getByRole("button", { name: "Stop" })
    .click();
  await expect(a.locator(".peer-tag")).not.toHaveAttribute(
    "data-doing",
    "pair:hug",
    { timeout: 60_000 },
  );

  // a cook-off challenge: B takes it, and both are sent to the kitchen
  await tagOnA.click();
  await a.getByRole("button", { name: "Challenge to a cook-off" }).click();
  await b
    .getByRole("region", { name: "Cook-off invite" })
    .getByRole("button", { name: "Cook" })
    .click({ timeout: 60_000 });
  await expect(b.getByText("You're in. Head to Kamayan Hall")).toBeVisible();
  await expect(a.getByText("is in. Head to Kamayan Hall")).toBeVisible({
    timeout: 60_000,
  });

  // B signs up (keeping the guest's progress), logs out, and logs back in
  const name = `Tester${Date.now() % 100000}`;
  await b.getByRole("button", { name: "Friends", exact: true }).click();
  const acct = b.getByRole("region", { name: "Account" });
  await acct.getByLabel("Name").fill(name);
  await acct.getByLabel("Password").fill("correct horse battery");
  await acct.getByRole("button", { name: "Sign up" }).click();
  await expect(acct).toContainText(`Signed in as ${name}`, { timeout: 60_000 });
  await acct.getByRole("button", { name: "Log out" }).click();
  await expect(acct.getByRole("status")).toContainText("Logged out", {
    timeout: 60_000,
  });
  await acct.getByLabel("Name").fill(name);
  await acct.getByLabel("Password").fill("correct horse battery");
  await acct.getByRole("button", { name: "Log in" }).click();
  await expect(acct.getByRole("status")).toContainText(
    `Welcome back, ${name}`,
    {
      timeout: 60_000,
    },
  );
});
