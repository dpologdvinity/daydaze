import { expect, test, type Browser, type Page } from "@playwright/test";

// Two players in one Plaza copy, each in their own browser context (their
// own cookie, so their own guest).
// the first-visit walkthrough would cover the HUD; mark it done
const ONBOARDED = () => {
  const key = "daydaze-save-v1";
  const save = JSON.parse(localStorage.getItem(key) ?? "{}");
  if (!("onboarded" in save))
    localStorage.setItem(key, JSON.stringify({ ...save, onboarded: true }));
};

/** A control in the game menu, opening the menu first if it's shut. */
async function fromMenu(page: Page, name: string | RegExp, timeout = 150_000) {
  const toggle = page.getByRole("button", { name: "Menu", exact: true });
  if ((await toggle.getAttribute("aria-expanded", { timeout })) !== "true")
    await toggle.click();
  return page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("button", { name, exact: typeof name === "string" });
}

async function player(browser: Browser): Promise<Page> {
  // a smaller canvas: two SwiftShader pages share the CPU
  const context = await browser.newContext({
    viewport: { width: 900, height: 600 },
  });
  await context.addInitScript(ONBOARDED);
  const page = await context.newPage();
  await page.goto("/?online=1&quality=low&room=plaza&debug=1");
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", "10", {
    timeout: 480_000,
  });
  return page;
}

// each test opens its own contexts; close them, pass or fail, so their
// SwiftShader canvases don't keep eating the CPU the next test needs
test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) await context.close();
});

/** Page errors show in the test output, for debugging a broken frame loop. */
function logErrors(a: Page, b: Page) {
  for (const [who, page] of [
    ["A", a],
    ["B", b],
  ] as const)
    page.on("pageerror", (e) => console.log(`${who} page error:`, e.message));
}

/** Two players in the Plaza who see each other and are friends. */
async function friends(browser: Browser) {
  const a = await player(browser);
  const b = await player(browser);
  logErrors(a, b);
  const tagOnA = a.locator(".peer-tag .nametag");
  const tagOnB = b.locator(".peer-tag .nametag");
  await expect(tagOnA).toHaveCount(1, { timeout: 120_000 });
  await expect(tagOnB).toHaveCount(1, { timeout: 120_000 });
  await tagOnA.click();
  await a.getByRole("button", { name: "Add friend" }).click();
  await tagOnB.click({ timeout: 60_000 });
  await b
    .getByRole("button", { name: "Accept friend request" })
    .click({ timeout: 60_000 });
  await expect(b.getByRole("button", { name: "Unfriend" })).toBeVisible();
  await b.getByRole("button", { name: "Close" }).click();
  await a.getByRole("button", { name: "Close" }).click();
  return { a, b, tagOnA, tagOnB };
}

test("two players meet in the Plaza, talk, become friends and play cards", async ({
  browser,
}) => {
  // chat, cards, emotes and a cook-off on two SwiftShader pages
  test.setTimeout(1_800_000);
  const a = await player(browser);
  const b = await player(browser);
  logErrors(a, b);
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

  // B shows their pronouns; A sees them on B's card
  await b.getByRole("button", { name: "Dressing room" }).click();
  await b.getByRole("tab", { name: "Body" }).click();
  await b
    .getByRole("radiogroup", { name: "Pronouns" })
    .getByRole("radio", { name: "she/they" })
    .click();
  await b.getByRole("button", { name: "Close dressing room" }).click();
  await tagOnA.click();
  await expect(
    a.getByRole("region", { name: /'s card$/ }).getByText("she/they"),
  ).toBeVisible({ timeout: 60_000 });
  await a.getByRole("button", { name: "Add friend" }).click();
  await expect(
    a.getByRole("button", { name: "Friend request sent (take back)" }),
  ).toBeVisible();
  await tagOnB.click();
  await b.getByRole("button", { name: "Accept friend request" }).click();
  await expect(b.getByRole("button", { name: "Unfriend" })).toBeVisible();
  await b.getByRole("button", { name: "Close" }).click();
  await (await fromMenu(b, "Friends")).click();
  await expect(b.getByRole("list", { name: "Your friends" })).toContainText(
    "Daydaze Plaza #1",
  );
  // the Friends panel lists this room's copies and who's in each
  await expect(b.getByRole("region", { name: "Room copies" })).toContainText(
    "Daydaze Plaza #1: 2 here",
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

  // a piggyback: B climbs on A's back and is carried as A walks
  await tagOnA.click();
  await a
    .getByRole("group", { name: "Do something together" })
    .getByRole("button", { name: "Piggyback" })
    .click();
  await b
    .getByRole("region", { name: "Emote invite" })
    .getByRole("button", { name: "Yes" })
    .click({ timeout: 60_000 });
  for (const page of [a, b])
    await expect(page.locator(".peer-tag")).toHaveAttribute(
      "data-doing",
      "pair:piggyback",
      { timeout: 60_000 },
    );
  const before = await b.locator("canvas").getAttribute("data-spot");
  await a.locator("canvas").focus();
  await a.keyboard.down("ArrowUp");
  await expect
    .poll(() => b.locator("canvas").getAttribute("data-spot"), {
      timeout: 120_000,
    })
    .not.toBe(before);
  await a.keyboard.up("ArrowUp");
  // still on: walking doesn't end a piggyback, Stop does
  await expect(a.locator(".peer-tag")).toHaveAttribute(
    "data-doing",
    "pair:piggyback",
  );
  await b
    .getByRole("region", { name: "Together" })
    .getByRole("button", { name: "Stop" })
    .click();
  await expect(a.locator(".peer-tag")).not.toHaveAttribute(
    "data-doing",
    "pair:piggyback",
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

  // a karaoke duet: both go up to the Loft, A asks, B says yes, and they
  // trade lines; each part's score crosses the relay to a shared total
  for (const page of [a, b])
    await page.getByRole("button", { name: "Go to Karaoke Loft" }).click();
  await expect(tagOnA).toHaveCount(1, { timeout: 240_000 });
  // in the Loft, B's name tag can sit under the test-only debug buttons:
  // click the tag itself rather than whatever covers its spot
  await tagOnA.dispatchEvent("click");
  await a.getByRole("button", { name: "Sing a duet" }).click();
  await b
    .getByRole("group", { name: "Duet invite" })
    .getByRole("button", { name: "Sing!" })
    .click({ timeout: 120_000 });
  for (const page of [a, b]) {
    const mic = page.getByRole("region", { name: "Karaoke" });
    await expect(mic).toContainText("duet with", { timeout: 120_000 });
    await expect(mic.getByRole("status")).toContainText("together", {
      timeout: 300_000,
    });
  }
});

test("friends party through doors, ride in a car and race at the Speedway", async ({
  browser,
}) => {
  test.setTimeout(1_800_000);
  const { a, b, tagOnA, tagOnB } = await friends(browser);
  // A invites B (a friend now) to a party; when A goes through to the
  // Velvet Room, B follows into the same copy
  await tagOnA.click();
  await a.getByRole("button", { name: "Invite to your party" }).click();
  await b
    .getByRole("region", { name: "Party invite" })
    .getByRole("button", { name: "Join" })
    .click({ timeout: 60_000 });
  await expect(a.getByRole("region", { name: "Party" })).toContainText(
    "Your party:",
    { timeout: 60_000 },
  );
  await a.getByRole("button", { name: "Go to Velvet Room" }).click();
  for (const page of [a, b])
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The Velvet Room",
      { timeout: 240_000 },
    );
  await expect(tagOnA).toHaveCount(1, { timeout: 120_000 });
  await expect(tagOnB).toHaveCount(1, { timeout: 120_000 });
  await expect(b.getByRole("region", { name: "Party" })).toContainText(
    "you follow them through doors",
  );

  // the party heads into the city; A gets in the car and gives B a ride.
  // Two SwiftShader pages in the city draw a frame every 1.5 to 5 s, so
  // every step here waits minutes, not seconds
  await a.getByRole("button", { name: "Go to City" }).click();
  for (const page of [a, b])
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-city-car",
      "parked",
      { timeout: 240_000 },
    );
  await expect(tagOnA).toHaveCount(1, { timeout: 120_000 });
  await a.getByRole("button", { name: "Drive your car" }).click();
  await expect(a.locator("canvas")).toHaveAttribute(
    "data-city-car",
    "driving",
    { timeout: 120_000 },
  );
  await tagOnA.click();
  await a.getByRole("button", { name: "Offer a ride" }).click();
  await b
    .getByRole("region", { name: "Ride offer" })
    .getByRole("button", { name: "Get in" })
    .click({ timeout: 180_000 });
  await expect(b.getByRole("region", { name: "Ride" })).toContainText(
    "Riding with",
  );
  await expect(a.locator(".peer-tag")).toHaveAttribute("data-doing", "ride", {
    timeout: 180_000,
  });
  // A drives off: B moves with the car without walking a step
  const parkedAt = await b.locator("canvas").getAttribute("data-spot");
  await a.locator("canvas").focus();
  await a.keyboard.down("ArrowUp");
  await expect
    .poll(() => b.locator("canvas").getAttribute("data-spot"), {
      timeout: 180_000,
    })
    .not.toBe(parkedAt);
  await a.keyboard.up("ArrowUp");
  await b.getByRole("button", { name: "Get out" }).click();
  await expect(b.getByRole("region", { name: "Ride" })).toHaveCount(0);
  await expect(a.locator(".peer-tag")).not.toHaveAttribute(
    "data-doing",
    "ride",
    { timeout: 180_000 },
  );

  // the party goes on to the Speedway, and A challenges B to a race: both
  // get the green light together and see each other's kart on the oval
  await a.getByRole("button", { name: "Go to Speedway" }).click();
  for (const page of [a, b])
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-race-phase",
      "walk",
      { timeout: 240_000 },
    );
  await tagOnA.click({ timeout: 120_000 });
  await a.getByRole("button", { name: "Race on the Neon Oval" }).click();
  await b
    .getByRole("region", { name: "Race invite" })
    .getByRole("button", { name: "Race!" })
    .click({ timeout: 120_000 });
  for (const page of [a, b])
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-race-phase",
      "racing",
      { timeout: 180_000 },
    );
  for (const page of [a, b])
    await expect(page.locator(".peer-tag")).toHaveAttribute(
      "data-doing",
      "car:zip-kart",
      { timeout: 180_000 },
    );
});

test("a friend visits your apartment while the door is unlocked", async ({
  browser,
}) => {
  test.setTimeout(1_200_000);
  const { a, b, tagOnA, tagOnB } = await friends(browser);
  // A goes home and unlocks the door; B visits from the Friends panel, and
  // is sent back out when A locks up
  await a.getByRole("button", { name: "Go to Apartment" }).click();
  await a
    .getByRole("button", { name: "Door: locked" })
    .click({ timeout: 240_000 });
  await expect(a.getByRole("button", { name: "Door: unlocked" })).toBeVisible();
  await (await fromMenu(b, "Friends")).click();
  await b
    .getByRole("button", { name: /^Visit .+'s place$/ })
    .first()
    .click();
  await expect(b.getByText(/You're at .+'s place\./)).toBeVisible({
    timeout: 240_000,
  });
  await expect(b.getByRole("heading", { level: 1 })).toHaveText(
    /'s apartment$/,
  );
  await expect(tagOnA).toHaveCount(1, { timeout: 180_000 });
  await expect(tagOnB).toHaveCount(1, { timeout: 180_000 });
  await a.getByRole("button", { name: "Door: unlocked" }).click();
  await expect(b.getByText(/locked up/)).toBeVisible({ timeout: 180_000 });
  await expect(b.getByRole("heading", { level: 1 })).not.toHaveText(
    /apartment/,
    { timeout: 180_000 },
  );
});

test("a guest signs up, logs out and logs back in, keeping their progress", async ({
  browser,
}) => {
  const b = await player(browser);
  // B signs up (keeping the guest's progress), logs out, and logs back in
  const name = `Tester${Date.now() % 100000}`;
  await (await fromMenu(b, "Friends")).click();
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

test("an invite link brings a friend into the same room copy", async ({
  browser,
}) => {
  // A starts in Plaza copy 2, so a plain join (the least-full copy, 1)
  // would put B somewhere else
  const open = async (url: string) => {
    const context = await browser.newContext({
      viewport: { width: 900, height: 600 },
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await context.addInitScript(ONBOARDED);
    const page = await context.newPage();
    await page.goto(url);
    await expect(page.locator("canvas")).toHaveAttribute("data-frames", "10", {
      timeout: 480_000,
    });
    return page;
  };
  const a = await open("/?join=plaza.2&quality=low");
  await (await fromMenu(a, "Copy invite link", 120_000)).click();
  const note = a.getByRole("status").filter({ hasText: "invite link" });
  await expect(note).toContainText("/?join=plaza.2");
  const link = /https?:\/\/\S+/.exec((await note.textContent()) ?? "")?.[0];
  expect(link).toBeTruthy();
  const b = await open(`${link}&quality=low`);
  // each sees the other: the same copy
  await expect(a.locator(".peer-tag .nametag")).toHaveCount(1, {
    timeout: 120_000,
  });
  await expect(b.locator(".peer-tag .nametag")).toHaveCount(1, {
    timeout: 120_000,
  });
  await (await fromMenu(b, "Copy invite link")).click();
  await expect(
    b.getByRole("status").filter({ hasText: "invite link" }),
  ).toContainText("/?join=plaza.2");
});
