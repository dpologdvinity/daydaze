import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Every test forces the low tier: headless WebGL is SwiftShader on the CPU.
// Most also use still=1 so the scene renders a few frames and then idles.
const LOW = "/?quality=low";
const STILL = "/?quality=low&still=1";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const roomTitle = (page: Page) => page.getByRole("heading", { level: 1 });
const canvasOf = (page: Page) =>
  page.getByRole("img", { name: "3D room view" });

test("loads the Velvet Room with no errors and mounts the canvas", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(LOW);
  await expect(page.getByRole("img", { name: "3D room view" })).toBeVisible();
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  // shaders compile on the first frames; wait until the frame counter caps out
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", "10");
  expect(errors).toEqual([]);
});

test("a hair style picked in the closet survives a reload", async ({
  page,
}) => {
  await page.goto(STILL);
  await page.getByRole("button", { name: "Dressing room" }).click();
  const hair = page.getByRole("radiogroup", { name: "Hair style" });
  const buns = hair.getByRole("radio", { name: "Space buns" });
  await expect(buns).toHaveAttribute("aria-checked", "false");
  await buns.click();
  await expect(buns).toHaveAttribute("aria-checked", "true");
  const saved = await page.evaluate(() =>
    localStorage.getItem("daydaze-save-v1"),
  );
  expect(saved).toContain('"hairStyle":"buns"');
  await page.reload();
  await expect(
    page
      .getByRole("radiogroup", { name: "Hair style" })
      .getByRole("radio", { name: "Space buns" }),
  ).toHaveAttribute("aria-checked", "true");
});

test("the debug buttons move the player between rooms", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&debug=1`);
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  await page.getByRole("button", { name: "Go to Plaza" }).click();
  await expect(roomTitle(page)).toHaveText("Daydaze Plaza");
  await page.getByRole("button", { name: "Go to Velvet Room" }).click();
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  expect(errors).toEqual([]);
});

test("the Water Park loads with the swimsuit on", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&debug=1`);
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  const view = page.getByRole("img", { name: "3D room view" });
  await expect(view).toHaveAttribute("data-wearing", "outfit");
  await page.getByRole("button", { name: "Go to Water Park" }).click();
  await expect(roomTitle(page)).toHaveText("The Water Park");
  await expect(view).toHaveAttribute("data-wearing", "bikini");
  expect(errors).toEqual([]);
});

test("the debug panel is hidden without the flag", async ({ page }) => {
  await page.goto(STILL);
  await expect(roomTitle(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to Plaza" })).toHaveCount(
    0,
  );
});

test("chat shows what you said above your doll", async ({ page }) => {
  await page.goto(STILL);
  const input = page.getByRole("textbox", { name: "Chat message" });
  await input.fill("velvet hour anyone?");
  await input.press("Enter");
  await expect(page.getByRole("status")).toHaveText("velvet hour anyone?");
  await expect(input).toHaveValue("");
});

test("the overlay passes an axe scan", async ({ page }) => {
  await page.goto(`${STILL}&debug=1`);
  await expect(roomTitle(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
  expect(results.violations).toEqual([]);
});

test("on a phone the dressing room opens from its toggle", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(STILL);
  const toggle = page.getByRole("button", { name: "Dressing room" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#dressing")).toBeHidden();
  await toggle.click();
  await expect(page.locator("#dressing")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("heading", { name: "Get the look" }),
  ).toBeFocused();
});

test("the dressing room starts closed, closes on Esc and keeps its state", async ({
  page,
}) => {
  await page.goto(STILL);
  const toggle = page.getByRole("button", { name: "Dressing room" });
  await expect(page.locator("#dressing")).toBeHidden();
  await toggle.click();
  await expect(page.locator("#dressing")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#dressing")).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.reload();
  await expect(page.locator("#dressing")).toBeVisible();
  await page.getByRole("button", { name: "Close dressing room" }).click();
  await expect(page.locator("#dressing")).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("the Amusement Park opens from the debug panel and renders its rides", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&debug=1`);
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  await page.getByRole("button", { name: "Go to Amusement Park" }).click();
  await expect(roomTitle(page)).toHaveText("Amusement Park");
  await expect(page.getByRole("img", { name: "3D room view" })).toBeVisible();
  // the scene draws its frames, so the rides and midway have rendered
  await expect(canvasOf(page)).toHaveAttribute("data-frames", /[3-9]|10/, {
    timeout: 120_000,
  });
  expect(errors).toEqual([]);
});

test("a coaster ride seats the doll, runs the loop and steps it back off", async ({
  page,
}) => {
  const errors = collectErrors(page);
  // ?ride=coaster boards at once; the frame loop stays live so the ride can run
  await page.goto(`${LOW}&room=amusement-park&ride=coaster`);
  await expect(canvasOf(page)).toHaveAttribute("data-ride-state", "riding");
  // a coaster lap takes 22 s of scene time; allow for slow SwiftShader frames
  await expect(canvasOf(page)).toHaveAttribute("data-ride-state", "idle", {
    timeout: 150_000,
  });
  expect(errors).toEqual([]);
});

test("walking into the Plaza's glowing door enters the Velvet Room", async ({
  page,
}) => {
  await page.goto(`${LOW}&room=plaza`);
  await expect(roomTitle(page)).toHaveText("Daydaze Plaza");
  // clicks need the camera rig's first frame, which can take seconds here
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-frames",
    /[3-9]|10/,
  );
  // The spawn shot is fixed at 1280x800: this pixel is the floor at the
  // door's centre (0, -6.3), inside the portal's 0.7 m radius.
  await page.mouse.click(613, 488);
  await expect(roomTitle(page)).toHaveText("The Velvet Room", {
    timeout: 120_000,
  });
});

test("the city loads, the player walks with the keys, and the scene renders", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=city`);
  await expect(roomTitle(page)).toHaveText("Downtown and Nightlife Row");
  const view = page.getByRole("img", { name: "3D room view" });
  await expect(view).toHaveAttribute("data-frames", "10");
  // the lazy city writes its position from its first frame; wait for it
  await expect(view).toHaveAttribute("data-player-x", /-?\d/);
  const at = async () => ({
    x: Number(await view.getAttribute("data-player-x")),
    z: Number(await view.getAttribute("data-player-z")),
  });
  const start = await at();
  await page.keyboard.down("KeyD");
  await expect
    .poll(async () => {
      const now = await at();
      return Math.hypot(now.x - start.x, now.z - start.z);
    })
    .toBeGreaterThan(0.5);
  await page.keyboard.up("KeyD");
  expect(errors).toEqual([]);
});

test("Speedway: race starts, car moves, HUD shows lap 1", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=speedway`);
  await expect(roomTitle(page)).toHaveText("The Speedway");
  const canvas = canvasOf(page);
  await expect(canvas).toHaveAttribute("data-race-phase", "walk");
  await page.getByRole("button", { name: "Race the Neon Oval" }).click();
  await expect(canvas).toHaveAttribute("data-race-phase", "racing");
  await expect(page.getByText("Lap 1 of 3")).toBeVisible();
  const start = await canvas.getAttribute("data-car-x");
  await page.keyboard.down("KeyW");
  await expect.poll(() => canvas.getAttribute("data-car-x")).not.toBe(start);
  await expect(page.getByRole("timer", { name: "Lap time" })).not.toHaveText(
    "0:00.00",
  );
  await page.keyboard.up("KeyW");
  const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
  expect(results.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("Speedway on a phone: on-screen pedals drive the car", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(`${LOW}&room=speedway`);
  const canvas = canvasOf(page);
  await expect(canvas).toHaveAttribute("data-race-phase", "walk");
  await page.getByRole("button", { name: "Race the Boardwalk Loop" }).click();
  await expect(canvas).toHaveAttribute("data-race-phase", "racing");
  const gas = page.getByRole("button", { name: "Gas" });
  await expect(gas).toBeInViewport();
  const start = await canvas.getAttribute("data-car-x");
  const box = await gas.boundingBox();
  if (!box) throw new Error("the throttle pedal has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(() => canvas.getAttribute("data-car-x")).not.toBe(start);
  await page.mouse.up();
  await context.close();
});

test("the Dance mood opens a move picker, and the picked move plays", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(STILL);
  const canvas = canvasOf(page);
  await expect(canvas).toHaveAttribute("data-dance", "none");
  await page.getByRole("radio", { name: "Dance", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-dance", "two-step");
  const picker = page.getByRole("radiogroup", { name: "Dance move" });
  await picker.getByRole("radio", { name: "Body roll" }).click();
  await expect(canvas).toHaveAttribute("data-dance", "body-roll");
  expect(errors).toEqual([]);
});

test("a drink in the Velvet Room raises the buzz and sways the view", async ({
  page,
}) => {
  await page.goto(STILL);
  const canvas = canvasOf(page);
  await expect(canvas).toHaveAttribute("data-buzz", "0.00");
  await page.getByRole("button", { name: "Have a drink" }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-buzz")))
    .toBeGreaterThan(0);
  // full effects are the default, so the sway is on without reduced motion
  await expect(canvas).not.toHaveAttribute("data-sway", "0");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the drunk sway is off, but the buzz still shows", async ({ page }) => {
    await page.goto(STILL);
    const canvas = canvasOf(page);
    await page.getByRole("button", { name: "Have a drink" }).click();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-buzz")))
      .toBeGreaterThan(0);
    await expect(canvas).toHaveAttribute("data-sway", "0");
  });
});

test("the debug buttons take the player into Pulse", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&debug=1`);
  await page.getByRole("button", { name: "Go to Pulse" }).click();
  await expect(roomTitle(page)).toHaveText("Pulse");
  expect(errors).toEqual([]);
});

test("the debug buttons take the player into The Violet Hour", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&debug=1`);
  await page.getByRole("button", { name: "Go to Violet Hour" }).click();
  await expect(roomTitle(page)).toHaveText("The Violet Hour");
  expect(errors).toEqual([]);
});

test("Pulse renders within the low-tier draw call budget", async ({ page }) => {
  await page.goto(`${STILL}&room=pulse`);
  const canvas = canvasOf(page);
  // Pulse loads lazily, and the frame counter stops after ten frames, so wait
  // for the club's frame: the player's doll alone draws well under 100 calls.
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-calls")))
    .toBeGreaterThan(100);
  const calls = Number(await canvas.getAttribute("data-calls"));
  expect(calls).toBeLessThan(250);
});

test("Bassline opens from the Pulse DJ booth and closes back to the world", async ({
  page,
}) => {
  await page.goto(`${STILL}&room=pulse`);
  await page
    .getByRole("button", { name: "Play Bassline at the DJ booth" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Bassline" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Bassline" }).click();
  await expect(dialog).toBeHidden();
  await expect(roomTitle(page)).toHaveText("Pulse");
});

test("Last Call opens from the Velvet Room bar and closes back to the world", async ({
  page,
}) => {
  await page.goto(STILL);
  await page.getByRole("button", { name: "Play Last Call at the bar" }).click();
  const dialog = page.getByRole("dialog", { name: "Last Call" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Last Call" }).click();
  await expect(dialog).toBeHidden();
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
});

test("apartment: place, rotate and remove furniture, lock the door, and it persists", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&debug=1`);
  await page.getByRole("button", { name: "Go to Apartment" }).click();
  await expect(roomTitle(page)).toHaveText("Your apartment");
  const lock = page.getByRole("button", { name: /^Door:/ });
  await expect(lock).toHaveText("Door: locked");
  await lock.click();
  await expect(lock).toHaveText("Door: unlocked");
  await page.getByRole("button", { name: "Velvet sofa" }).click();
  await page.getByRole("button", { name: "Empty cell 1, 1" }).click();
  await expect(page.getByRole("status").last()).toHaveText(
    "Placed Velvet sofa.",
  );
  await page.getByRole("button", { name: /^Velvet sofa at 1, 1/ }).click();
  await page.getByRole("button", { name: "Rotate" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Go to Apartment" }).click();
  await expect(
    page.getByRole("button", { name: /^Velvet sofa at 1, 1/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Velvet sofa at 1, 1/ }).click();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(
    page.getByRole("button", { name: "Empty cell 1, 1" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("jail: the sentence counts down, cards shorten it, and bail needs coins", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("daydaze-save-v1")) return;
    localStorage.setItem(
      "daydaze-save-v1",
      JSON.stringify({ jail: { endsAt: Date.now() + 120_000 }, coins: 0 }),
    );
  });
  await page.goto(`${STILL}&debug=1`);
  await page.getByRole("button", { name: "Go to Jail" }).click();
  await expect(roomTitle(page)).toHaveText("City Jail, Block C");
  const clock = page.getByRole("timer");
  await expect(clock).toContainText("Time left: 1:");
  await page.getByRole("button", { name: /Play cards/ }).click();
  await expect(clock).toContainText(/Time left: 1:[0-3]\d/);
  await page.getByRole("button", { name: /Pay bail/ }).click();
  await expect(page.getByText(/you have 0/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("timer")).toContainText("Time left");
});

test("shoplifting: the suspicion meter fills and a caught player is penalised", async ({
  page,
}) => {
  await page.goto(`${STILL}&debug=1`);
  await page.getByRole("button", { name: "Go to Apartment" }).click();
  await page.getByRole("button", { name: "Try the test shelf" }).click();
  await page.getByRole("button", { name: /Corner Bodega/ }).click();
  await expect(page.getByRole("meter", { name: "Suspicion" })).toBeVisible();
  // running draws attention every beat, so the meter fills and the officer comes
  for (let i = 0; i < 12; i++) {
    const run = page.getByRole("button", { name: "Run" });
    if ((await run.count()) === 0) break;
    await run.click();
  }
  await expect(page.getByRole("alert", { name: "Arrest" })).toBeVisible();
  await expect(page.getByText(/a warning, and a day's ban/)).toBeVisible({
    timeout: 20_000,
  });
});

test("Plate Rush orders a dish and the courier drops it in hand", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.goto(STILL);
  await page.getByRole("button", { name: "Plate Rush" }).click();
  const app = page.getByRole("dialog", { name: "Plate Rush" });
  await app.getByRole("button", { name: /Point and Eat Kitchen/ }).click();
  await app
    .getByRole("button", {
      name: "Order Adobo rice bowl from Point and Eat Kitchen",
    })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("status")).toContainText(
    "The courier dropped off Adobo rice bowl.",
    { timeout: 45_000 },
  );
  const held = page.getByRole("region", { name: "Held food" });
  await expect(held).toContainText("Adobo rice bowl");
  await held.getByRole("button", { name: "Eat it" }).click();
  await expect(held).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("the food rooms open from a query and show their counter staff", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/?quality=low&still=1&room=ube-bakery");
  await expect(roomTitle(page)).toHaveText("Purple Pandesal Bakery");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-frames",
    /[4-9]|10/,
  );
  expect(errors).toEqual([]);
});
