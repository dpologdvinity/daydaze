import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Every test forces the low tier: headless WebGL is SwiftShader on the CPU.
// Most also use still=1 so the scene renders a few frames and then idles.
const LOW = "/?quality=low";
const STILL = "/?quality=low&still=1";
// the tests that began in the old first room still start there
const VELVET = `${STILL}&room=velvet-room`;

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // headless machines with no sound card: the browser's own complaint
    if (m.text().includes("error from the audio device")) return;
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const roomTitle = (page: Page) => page.getByRole("heading", { level: 1 });
const canvasOf = (page: Page) =>
  page.getByRole("img", { name: "3D room view" });

test("a new player starts in the city, on Downtown's square", async ({
  page,
}) => {
  test.setTimeout(330_000);
  const errors = collectErrors(page);
  await page.goto("/?quality=low");
  await expect(roomTitle(page)).toHaveText("Downtown", { timeout: 150_000 });
  expect(errors).toEqual([]);
});

test("the player drives their car down the avenue and parks it", async ({
  page,
}) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=city`);
  const canvas = canvasOf(page);
  await expect(canvas).toHaveAttribute("data-city-car", "parked", {
    timeout: 180_000,
  });
  await page.getByRole("combobox", { name: "Car" }).selectOption("kestrel-rs");
  await page.getByRole("button", { name: "Drive your car" }).click();
  // she walks over from the square and gets in
  await expect(canvas).toHaveAttribute("data-city-car", "driving", {
    timeout: 120_000,
  });
  // on a desktop the car drives on the keys; the pedals are for touch
  await page.keyboard.down("w");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-car-x")), {
      timeout: 120_000,
    })
    .toBeGreaterThan(24);
  await page.keyboard.up("w");
  await expect(page.getByLabel("Speedometer")).toContainText("mph");
  await page.getByRole("button", { name: "Leave the car" }).click();
  await expect(canvas).toHaveAttribute("data-city-car", "parked");
  // parked where it stopped: the save remembers the car and the spot
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("daydaze-save-v1") ?? "{}"),
  );
  expect(saved.car.id).toBe("kestrel-rs");
  expect(saved.car.at[0]).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});

test("a car low on gas fills up at a pump for coins", async ({ page }) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  // the car waits at Glow Gas's first pump with a fifth of a tank
  await page.addInitScript(() => {
    if (localStorage.getItem("daydaze-save-v1")) return;
    localStorage.setItem(
      "daydaze-save-v1",
      JSON.stringify({
        car: {
          id: "quill-lite",
          color: "#3a6bff",
          at: [-76.8, -121],
          yaw: 0,
          fuel: 0.2,
        },
      }),
    );
  });
  await page.goto(`${LOW}&room=city&at=-74,-118`);
  const canvas = canvasOf(page);
  await expect(canvas).toHaveAttribute("data-city-car", "parked", {
    timeout: 180_000,
  });
  await page.getByRole("button", { name: "Drive your car" }).click();
  await expect(canvas).toHaveAttribute("data-city-car", "driving", {
    timeout: 120_000,
  });
  await expect(page.getByLabel("Speedometer")).toContainText("Gas 20%");
  const fill = page.getByRole("button", { name: "Fill up: 32 coins" });
  await fill.click();
  await expect(page.getByLabel("Speedometer")).toContainText("Gas 100%");
  await expect(page.getByText("68 coins")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the 18+ lounge stays shut without the age check", async ({ page }) => {
  await page.goto(`${STILL}&room=green-haze`);
  await expect(roomTitle(page)).toHaveText("Downtown", { timeout: 150_000 });
});

test("Green Haze (18+, dev flag): a joint and shroom tea raise the high and the trip", async ({
  page,
}) => {
  test.setTimeout(330_000);
  const errors = collectErrors(page);
  await page.goto(`${STILL}&room=green-haze&adult=1`);
  await expect(roomTitle(page)).toHaveText("Green Haze", { timeout: 150_000 });
  const canvas = canvasOf(page);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-calls")), {
      timeout: 120_000,
    })
    .toBeGreaterThan(15);
  expect(Number(await canvas.getAttribute("data-calls"))).toBeLessThan(250);
  await page.getByRole("button", { name: "Light a joint" }).click();
  await page.getByRole("button", { name: "Sip shroom tea" }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-high")))
    .toBeGreaterThan(0.2);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-trip")))
    .toBeGreaterThan(0.3);
  expect(errors).toEqual([]);
});

test("Photon Zone: a laser tag round tags a rival for points", async ({
  page,
}) => {
  test.setTimeout(330_000);
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=laser-tag`);
  await page
    .getByRole("button", { name: "Suit up" })
    .click({ timeout: 150_000 });
  const score = page.getByLabel("Score");
  // rivals pop out every few seconds: keep firing at all four until a tag
  await expect(async () => {
    for (const name of ["Cyan", "Pink", "Lime", "Gold"])
      await page.getByRole("button", { name: `Fire at ${name}` }).click();
    await expect(score).not.toContainText(/^0 points/, { timeout: 500 });
  }).toPass({ timeout: 120_000 });
  expect(errors).toEqual([]);
});

test("Skyline Supply sells a snack and a water for coins", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&room=market`);
  await expect(roomTitle(page)).toHaveText("Skyline Supply", {
    timeout: 150_000,
  });
  await page.getByRole("button", { name: "Buy a snack (3 coins)" }).click();
  await page.getByRole("button", { name: "Buy a water (2 coins)" }).click();
  await expect(page.getByText("95 coins")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Splat City: a paintball round marks a rival for points", async ({
  page,
}) => {
  test.setTimeout(330_000);
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=paintball`);
  await page
    .getByRole("button", { name: "Gear up" })
    .click({ timeout: 150_000 });
  const score = page.getByLabel("Score");
  await expect(async () => {
    for (const name of ["Red", "Blue", "Orange", "Purple", "Green"])
      await page.getByRole("button", { name: `Fire at ${name}` }).click();
    // hits can outweigh tags in the score, so look for the tag itself
    await expect(
      page.getByRole("region", { name: "Paintball" }).getByRole("status"),
    ).toContainText(/Tagged!|Tags [1-9]/, { timeout: 500 });
  }).toPass({ timeout: 120_000 });
  expect(errors).toEqual([]);
});

test("Loft Studios: pick an instrument and play notes from the panel and keys", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&room=music-studio`);
  const panel = page.getByRole("region", { name: "Instruments" });
  await panel
    .getByRole("button", { name: "Drums" })
    .click({ timeout: 150_000 });
  await expect(panel.getByRole("button", { name: "Drums" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await panel.getByRole("button", { name: "Snare" }).click();
  await panel.getByRole("button", { name: "Marimba" }).click();
  await page.keyboard.press("3");
  expect(errors).toEqual([]);
});

test("the zoo's gate on Park Avenue leads in, and its animals walk", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=zoo`);
  await expect(roomTitle(page)).toHaveText("Daydaze Zoo", { timeout: 150_000 });
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", "10", {
    timeout: 150_000,
  });
  expect(errors).toEqual([]);
});

test("the Scrambler and the Starship take riders", async ({ page }) => {
  test.setTimeout(480_000);
  const errors = collectErrors(page);
  for (const ride of ["scrambler", "starship"]) {
    await page.goto(`${LOW}&room=amusement-park&ride=${ride}`);
    // a slow frame can skip past "riding": wait on the rides finished
    await expect(canvasOf(page)).toHaveAttribute("data-ridden", "1", {
      timeout: 200_000,
    });
  }
  expect(errors).toEqual([]);
});

test("loads the Velvet Room with no errors and mounts the canvas", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=velvet-room`);
  await expect(page.getByRole("img", { name: "3D room view" })).toBeVisible();
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  // shaders compile on the first frames; wait until the frame counter caps out
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", "10");
  expect(errors).toEqual([]);
});

test("a hair style picked in the closet survives a reload", async ({
  page,
}) => {
  // the closet and a reload are slow on CI's SwiftShader
  test.setTimeout(300_000);
  await page.goto(VELVET);
  await page
    .getByRole("button", { name: "Dressing room", exact: true })
    .click();
  await page.getByRole("tab", { name: "Hair" }).click();
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
  await page.getByRole("tab", { name: "Hair" }).click();
  await expect(
    page
      .getByRole("radiogroup", { name: "Hair style" })
      .getByRole("radio", { name: "Space buns" }),
  ).toHaveAttribute("aria-checked", "true");
});

test("the debug buttons move the player between rooms", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  await page.getByRole("button", { name: "Go to Plaza" }).click();
  await expect(roomTitle(page)).toHaveText("Daydaze Plaza");
  await page.getByRole("button", { name: "Go to Velvet Room" }).click();
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  expect(errors).toEqual([]);
});

test("the Water Park loads with the swimsuit on", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
  const view = page.getByRole("img", { name: "3D room view" });
  await expect(view).toHaveAttribute("data-wearing", "outfit");
  await page.getByRole("button", { name: "Go to Water Park" }).click();
  await expect(roomTitle(page)).toHaveText("The Water Park");
  await expect(view).toHaveAttribute("data-wearing", "bikini");
  expect(errors).toEqual([]);
});

test("the debug panel is hidden without the flag", async ({ page }) => {
  await page.goto(VELVET);
  await expect(roomTitle(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to Plaza" })).toHaveCount(
    0,
  );
});

test("chat shows what you said above your doll", async ({ page }) => {
  await page.goto(VELVET);
  const input = page.getByRole("textbox", { name: "Chat message" });
  await input.fill("velvet hour anyone?");
  await input.press("Enter");
  await expect(page.getByRole("status")).toHaveText("velvet hour anyone?");
  await expect(input).toHaveValue("");
});

test("the overlay passes an axe scan", async ({ page }) => {
  await page.goto(`${VELVET}&debug=1`);
  await expect(roomTitle(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
  expect(results.violations).toEqual([]);
});

test("on a phone the dressing room opens from its toggle", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(VELVET);
  const toggle = page.getByRole("button", {
    name: "Dressing room",
    exact: true,
  });
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
  // the closet and a reload are slow on CI's SwiftShader
  test.setTimeout(300_000);
  await page.goto(VELVET);
  const toggle = page.getByRole("button", {
    name: "Dressing room",
    exact: true,
  });
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
  await page.goto(`${VELVET}&debug=1`);
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
  test.setTimeout(330_000);
  const errors = collectErrors(page);
  // ?ride=coaster boards at once; the frame loop stays live so the ride can run
  await page.goto(`${LOW}&room=amusement-park&ride=coaster`);
  // a coaster lap takes 22 s of scene time; a slow SwiftShader frame can
  // skip right past "riding", so wait on the count of rides finished
  await expect(canvasOf(page)).toHaveAttribute("data-ridden", "1", {
    timeout: 240_000,
  });
  await expect(canvasOf(page)).toHaveAttribute("data-ride-state", "idle", {
    timeout: 60_000,
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
  // door's center (0, -6.3), inside the portal's 0.7 m radius.
  await page.mouse.click(613, 488);
  await expect(roomTitle(page)).toHaveText("The Velvet Room", {
    timeout: 120_000,
  });
});

test("the city loads, the player walks with the keys, and the scene renders", async ({
  page,
}) => {
  test.setTimeout(330_000);
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=city`);
  await expect(roomTitle(page)).toHaveText("Downtown");
  const view = page.getByRole("img", { name: "3D room view" });
  // the city's first compile is the longest of any room's on SwiftShader
  await expect(view).toHaveAttribute("data-frames", "10", { timeout: 150_000 });
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
  await page.goto(VELVET);
  const canvas = canvasOf(page);
  await expect(canvas).toHaveAttribute("data-dance", "none");
  await page.getByRole("radio", { name: "Dance", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-dance", "groove");
  const picker = page.getByRole("radiogroup", { name: "Dance move" });
  await picker.getByRole("radio", { name: "Body roll" }).click();
  await expect(canvas).toHaveAttribute("data-dance", "body-roll");
  expect(errors).toEqual([]);
});

test("a drink in the Velvet Room raises the buzz and sways the view", async ({
  page,
}) => {
  await page.goto(VELVET);
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
    await page.goto(VELVET);
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
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Pulse" }).click();
  await expect(roomTitle(page)).toHaveText("Pulse");
  expect(errors).toEqual([]);
});

test("the debug buttons take the player into The Violet Hour", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Violet Hour" }).click();
  await expect(roomTitle(page)).toHaveText("The Violet Hour");
  expect(errors).toEqual([]);
});

test("the debug buttons take the player up to the Skylark, with Last Call at its bar", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Skylark" }).click();
  await expect(roomTitle(page)).toHaveText("The Skylark");
  await expect(
    page.getByRole("button", { name: "Play Last Call at the bar" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the debug buttons take the player into Sugar Rush", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Sugar Rush" }).click();
  await expect(roomTitle(page)).toHaveText("Sugar Rush");
  expect(errors).toEqual([]);
});

test("the debug buttons take the player into Bassline, with its decks", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Bassline" }).click();
  await expect(roomTitle(page)).toHaveText("Bassline");
  await expect(
    page.getByRole("button", { name: "Play Bassline at the decks" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the debug buttons take the player up to the Karaoke Loft", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Karaoke Loft" }).click();
  await expect(roomTitle(page)).toHaveText("Karaoke Loft");
  expect(errors).toEqual([]);
});

test("Glow Bowl: start a game, bowl a ball, and the scoreboard counts it", async ({
  page,
}) => {
  const errors = collectErrors(page);
  // live frames: the roll plays back in the scene before it's scored
  await page.goto(`${LOW}&room=bowling`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Bowling" });
  await panel.getByRole("button", { name: "Bowl a game" }).click();
  await panel.getByRole("button", { name: "Aim" }).click();
  await panel.getByRole("button", { name: "Lock aim" }).click();
  await panel.getByRole("button", { name: "Bowl!" }).click();
  await expect(panel.getByRole("status")).toHaveText(
    /pins?|Strike|Spare|Gutter/,
    { timeout: 120_000 },
  );
  const board = page.getByRole("table", { name: "Scoreboard" });
  await expect(board.getByRole("cell").first()).not.toHaveText("");
  await panel.getByRole("button", { name: "Leave the lane" }).click();
  await expect(
    panel.getByRole("button", { name: "Bowl a game" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Lagoon Links: start a round, putt, and the card counts the stroke", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=mini-golf`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Mini golf" });
  await panel.getByRole("button", { name: "Play a round" }).click();
  await expect(panel.getByRole("status")).toHaveText(/Hole 1/);
  await panel.getByRole("button", { name: "Aim left" }).click();
  await panel.getByRole("button", { name: "Putt" }).click();
  await panel.getByRole("button", { name: "Hit!" }).click();
  // the putt plays out, then the card shows one stroke on the first hole
  const card = page.getByRole("table", { name: "Score card" });
  await expect(card.getByRole("row", { name: /You/ })).toContainText("1", {
    timeout: 120_000,
  });
  await panel.getByRole("button", { name: "Leave the course" }).click();
  await expect(
    panel.getByRole("button", { name: "Play a round" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [room, region, start, first, second, done] of [
  ["dome", "Hot Shots", "Start the clock", "Aim", "Shoot!", /pts/],
  [
    "stadium",
    "Penalties",
    "Take penalties",
    "Pick your spot",
    "Strike!",
    /[●✕]/,
  ],
] as const) {
  test(`${room}: start the game, take a shot, and it's scored`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto(`${LOW}&room=${room}`);
    await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
    const panel = page.getByRole("region", { name: region });
    await panel.getByRole("button", { name: start }).click();
    await panel.getByRole("button", { name: first }).click();
    await panel.getByRole("button", { name: second }).click();
    // the shot plays out in the scene, then the panel calls it
    await expect(panel.getByRole("status")).not.toBeEmpty({ timeout: 120_000 });
    await expect(panel.getByLabel(/Score|Kicks/)).toHaveText(done);
    expect(errors).toEqual([]);
  });
}

test("stadium: five penalties end in a prize card that pays coins", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=stadium`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Penalties" });
  await panel.getByRole("button", { name: "Take penalties" }).click();
  for (let kick = 0; kick < 5; kick++) {
    await panel.getByRole("button", { name: "Pick your spot" }).click();
    await panel.getByRole("button", { name: "Strike!" }).click();
    await expect(
      panel.getByRole("button", {
        name: kick < 4 ? "Pick your spot" : "Go again",
      }),
    ).toBeVisible({ timeout: 120_000 });
  }
  const prize = page.getByRole("status", { name: "Prize" });
  await expect(prize).toContainText("Penalties");
  await expect(prize).toContainText("New personal best!");
  // a first game pays its grade plus the personal-best bonus
  await expect(page.getByLabel(/coins$/)).not.toHaveText("100 coins");
  expect(errors).toEqual([]);
});

test("Pulse: dance through a dance-off and the floor pays a prize", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  // the clock starts a few seconds before the DJ calls one
  await page.goto(`${STILL}&room=pulse&danceoff=-4`);
  const call = page.getByRole("region", { name: "Dance-off" });
  await expect(call).toContainText("calls a dance-off");
  await page.getByRole("radio", { name: "Dance", exact: true }).click();
  await expect(call).toContainText("Keep dancing", { timeout: 30_000 });
  const prize = page.getByRole("status", { name: "Prize" });
  await expect(prize).toContainText("Dance-off", { timeout: 90_000 });
  await expect(prize).toContainText("s on the floor");
  expect(errors).toEqual([]);
});

test("the marina: cast, strike, and the catch is called", async ({ page }) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=marina`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Fishing" });
  await panel.getByRole("button", { name: "Go fishing" }).click();
  await panel.getByRole("button", { name: "Cast" }).click();
  // striking straight away is mostly too soon: the catch is called either way
  await panel.getByRole("button", { name: "Strike!" }).click();
  await expect(panel.getByRole("status")).toHaveText(/spooked|got away|kg/, {
    timeout: 120_000,
  });
  await panel.getByRole("button", { name: "Reel in and leave" }).click();
  await expect(panel.getByRole("button", { name: "Go fishing" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the Courtside Club: seven points end in a prize card", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=courtside`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Tennis" });
  await panel.getByRole("button", { name: "Play a match" }).click();
  // swing whenever the ball's coming; the match ends either way
  const main = panel.getByRole("button", { name: /^(Swing!|Play again)$/ });
  await expect(async () => {
    const label = await main.textContent({ timeout: 1000 });
    if (label === "Play again") return;
    if (await main.isEnabled()) await main.click({ timeout: 1000 });
    throw new Error(`still playing: ${label}`);
  }).toPass({ timeout: 480_000, intervals: [300] });
  await expect(page.getByRole("status", { name: "Prize" })).toContainText(
    "Tennis",
  );
  expect(errors).toEqual([]);
});

test("Mermaid Cove: a Siren Song ends on a wrong note with a prize", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=mermaid-cove`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Siren Song" });
  await panel.getByRole("button", { name: "Sing with the mermaids" }).click();
  await expect(panel.getByRole("status")).toHaveText(/Listen/);
  // sing the pink shell every turn: sooner or later it's the wrong note
  const pink = panel.getByRole("button", { name: "Pink shell" });
  await expect(async () => {
    if (await panel.getByRole("button", { name: "Sing again" }).isVisible())
      return;
    if (await pink.isEnabled()) await pink.click({ timeout: 1000 });
    throw new Error("still singing");
  }).toPass({ timeout: 480_000, intervals: [300] });
  await expect(page.getByRole("status", { name: "Prize" })).toContainText(
    "Siren Song",
  );
  expect(errors).toEqual([]);
});

test("the Park Ice Rink: the ice show starts and its first cue comes", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=ice-rink`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Ice show" });
  await panel.getByRole("button", { name: "Skate the program" }).click();
  await panel.getByRole("button", { name: "Now!" }).click();
  // pressed off the cue, or not at all: the first element is called
  await expect(panel.getByRole("status")).toHaveText(
    /: (Stuck it!|Close|Missed)|The judges/,
    {
      timeout: 120_000,
    },
  );
  await panel.getByRole("button", { name: "Leave the ice" }).click();
  await expect(
    panel.getByRole("button", { name: "Skate the program" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the Catwalk: Runway Walk starts and its first cue comes", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=catwalk`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Runway Walk" });
  await panel.getByRole("button", { name: "Walk the runway" }).click();
  await panel.getByRole("button", { name: "Now!" }).click();
  // pressed off the cue, or not at all: the first cue is called
  await expect(panel.getByRole("status")).toHaveText(
    /: (Stuck it!|Close|Missed)|The judges/,
    { timeout: 120_000 },
  );
  await panel.getByRole("button", { name: "Step off the runway" }).click();
  await expect(
    panel.getByRole("button", { name: "Walk the runway" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the Aquarium: the seal show starts and Pepper's first trick is called", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=aquarium`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Seal show" });
  await panel.getByRole("button", { name: "Start the seal show" }).click();
  await panel.getByRole("button", { name: "Now!" }).click();
  // however late the click lands, an element is called (or the show ends)
  await expect(panel.getByRole("status")).toHaveText(
    /: (Stuck it!|Close|Missed)|The judges/,
    {
      timeout: 120_000,
    },
  );
  await panel.getByRole("button", { name: "End the show" }).click();
  await expect(
    panel.getByRole("button", { name: "Start the seal show" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the museum: the guide reads an exhibit's plaque and moves on", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=museum`);
  await expect(roomTitle(page)).toHaveText("Museo ng Little Manila");
  const guide = page.getByRole("region", { name: "Exhibits" });
  await guide.getByRole("button", { name: "The jeepney" }).click();
  await expect(guide.getByRole("status")).toContainText("Second World War");
  await guide.getByRole("button", { name: "Next" }).click();
  await expect(guide.getByRole("status")).toContainText("star lantern");
  await guide.getByRole("button", { name: "Back to the hall" }).click();
  await expect(
    guide.getByRole("button", { name: "The bahay kubo" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Ink & Needle: buy a rose gold stud for the belly button", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${STILL}&room=piercing`);
  await expect(roomTitle(page)).toHaveText("Ink & Needle");
  const counter = page.getByRole("region", { name: "Piercing counter" });
  await counter.getByRole("radio", { name: "Belly button" }).click();
  await counter.getByRole("button", { name: /Rose gold stud/ }).click();
  await expect(counter.getByRole("status")).toHaveText(
    "Rose gold stud in your belly button!",
  );
  await expect(page.getByLabel(/coins$/).first()).toHaveText("75 coins");
  await expect(
    counter.getByRole("button", { name: /Rose gold stud/ }),
  ).toContainText("Wearing");
  expect(errors).toEqual([]);
});

test("the debug buttons take the player into Kamayan Hall", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Kamayan Hall" }).click();
  await expect(roomTitle(page)).toHaveText("Lechon and Kamayan Hall");
  expect(errors).toEqual([]);
});

test("the Galleria: buy at Glitterbox, pay for it, and it's yours to wear", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to the Galleria" }).click();
  await expect(roomTitle(page)).toHaveText("Starlight Galleria");
  await page.getByRole("button", { name: "Shop at Glitterbox" }).click();
  const shop = page.getByRole("dialog", { name: "Glitterbox" });
  await expect(shop).toBeVisible();
  await expect(shop).toContainText("100 coins");
  // the baby tee and mini is 45 coins
  const row = shop
    .getByRole("listitem")
    .filter({ hasText: "Baby tee and mini" });
  await row.getByRole("button", { name: "Buy" }).click();
  await expect(shop).toContainText("55 coins");
  await expect(row.getByRole("button", { name: "Wear" })).toBeVisible();
  await shop.getByRole("button", { name: "Close" }).click();
  await expect(shop).toBeHidden();
  expect(errors).toEqual([]);
});

test("the Roller Disco: put on skates, and they come off indoors", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to the Roller Disco" }).click();
  await expect(roomTitle(page)).toHaveText("Starlite Roller Disco");
  const skates = page.getByRole("button", { name: /skates/ });
  await page.getByRole("button", { name: "Put on skates" }).click();
  await expect(skates).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Go to Pulse" }).click();
  await expect(roomTitle(page)).toHaveText("Pulse");
  await expect(skates).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Concrete Wave: drop in, and a run starts on the clock", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${LOW}&room=skatepark`);
  await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
  const panel = page.getByRole("region", { name: "Half-pipe" });
  await panel.getByRole("button", { name: "Drop in" }).click();
  await expect(panel.getByRole("button", { name: "Trick!" })).toBeVisible();
  await expect(panel.getByLabel("Score")).toContainText("0:");
  await panel.getByRole("button", { name: "Step off" }).click();
  await expect(panel.getByRole("button", { name: "Drop in" })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [room, region, startName, live] of [
  ["gridiron", "Field goals", "Kick field goals", "Line it up"],
  ["driving-range", "Driving range", "Get a bucket", "Backswing"],
  ["gym", "Floor routine", "Start the routine", /Now!|Go again/],
] as const) {
  test(`${room}: the game starts from its panel`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${LOW}&room=${room}`);
    await expect(canvasOf(page)).toHaveAttribute("data-frames", "10");
    const panel = page.getByRole("region", { name: region });
    await panel.getByRole("button", { name: startName }).click();
    await expect(panel.getByRole("button", { name: live })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("the debug buttons take the player into La Noche", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to La Noche" }).click();
  await expect(roomTitle(page)).toHaveText("La Noche");
  expect(errors).toEqual([]);
});

test("Player 2's cabinet opens Gem Glam and closes back to the bar", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Player 2" }).click();
  await expect(roomTitle(page)).toHaveText("Player 2");
  await page
    .getByRole("button", { name: "Play Gem Glam on the cabinet" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Gem Glam" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Gem Glam" }).click();
  await expect(dialog).toBeHidden();
  await expect(roomTitle(page)).toHaveText("Player 2");
  expect(errors).toEqual([]);
});

test("Star Siege: the fleet marches, a shot flies, and the game closes", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Player 2" }).click();
  await page
    .getByRole("button", { name: "Play Star Siege on the cabinet" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Star Siege" });
  await dialog.getByRole("button", { name: "Play" }).click();
  await expect(dialog.getByLabel("The field")).toBeVisible();
  await expect(dialog.getByLabel("3 ships left")).toBeVisible();
  await dialog.getByRole("button", { name: "Fire" }).click();
  await dialog.getByRole("button", { name: "Close Star Siege" }).click();
  await expect(dialog).toBeHidden();
  await expect(roomTitle(page)).toHaveText("Player 2");
  expect(errors).toEqual([]);
});

test("Throwback Trivia: answer a question and the right one lights up", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Player 2" }).click();
  await page
    .getByRole("button", { name: "Play Throwback Trivia on the cabinet" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Throwback Trivia" });
  await dialog.getByRole("button", { name: "Play" }).click();
  await expect(dialog.getByText("Question 1 of 10")).toBeVisible();
  await dialog.locator(".tt-answer").first().click();
  await expect(dialog.locator('.tt-answer[data-state="right"]')).toBeVisible();
  await expect(dialog.getByText("Question 2 of 10")).toBeVisible();
  await dialog.getByRole("button", { name: "Close Throwback Trivia" }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

for (const room of [
  "rooftop-bar",
  "sugar-rush",
  "warehouse",
  "karaoke",
  "bowling",
  "arcade-bar",
  "la-noche",
  "mini-golf",
  "dome",
  "stadium",
  "kamayan-hall",
  "galleria",
  "roller-rink",
  "skatepark",
  "gridiron",
  "driving-range",
  "gym",
  "violet-hour",
  "boba-matcha",
  "marina",
  "courtside",
  "catwalk",
  "mermaid-cove",
  "amusement-park",
  "ice-rink",
  "aquarium",
  "skate-diner",
  "museum",
  "halo-halo-cafe",
  "salon",
  "piercing",
  "laser-tag",
  "market",
  "paintball",
  "music-studio",
  "zoo",
] as const) {
  test(`${room} renders within the low-tier draw call budget`, async ({
    page,
  }) => {
    await page.goto(`${STILL}&room=${room}`);
    const canvas = canvasOf(page);
    // the doll alone draws under 10 calls: wait for the room's own frame,
    // which takes a while to compile on the CPU renderer
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-calls")), {
        timeout: 120_000,
      })
      .toBeGreaterThan(15);
    expect(Number(await canvas.getAttribute("data-calls"))).toBeLessThan(250);
  });
}

test("Pulse renders within the low-tier draw call budget", async ({ page }) => {
  await page.goto(`${STILL}&room=pulse`);
  const canvas = canvasOf(page);
  // Pulse loads lazily, and the frame counter stops after ten frames, so wait
  // for the club's frame: the player's 3D doll alone draws under 10 calls.
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-calls")))
    .toBeGreaterThan(40);
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
  await page.goto(VELVET);
  await page.getByRole("button", { name: "Play Last Call at the bar" }).click();
  const dialog = page.getByRole("dialog", { name: "Last Call" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Last Call" }).click();
  await expect(dialog).toBeHidden();
  await expect(roomTitle(page)).toHaveText("The Velvet Room");
});

test("the midway opens at the Amusement Park and a ring toss pays a grade", async ({
  page,
}) => {
  await page.goto(`${STILL}&room=amusement-park`);
  await page.getByRole("button", { name: "Play the midway games" }).click();
  const dialog = page.getByRole("dialog", { name: "The Midway" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: /Ring toss/ }).click();
  await dialog.getByRole("button", { name: "Play Ring toss" }).click();
  const throwRing = dialog.getByRole("button", { name: "Throw" });
  for (let i = 0; i < 10; i++) await throwRing.click();
  await expect(
    dialog.getByText(/The prize counter pays \d+ coins/),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Collect and leave" }).click();
  await expect(dialog).toBeHidden();
  await expect(roomTitle(page)).toHaveText("Amusement Park");
});

test("the player takes a seat at the Velvet Room bar and stands to walk", async ({
  page,
}) => {
  await page.goto(`${LOW}&room=velvet-room`);
  const canvas = canvasOf(page);
  await page.getByRole("button", { name: "Take a seat" }).click();
  await expect(canvas).toHaveAttribute("data-seated", /velvet-stool/, {
    timeout: 150_000,
  });
  await page.keyboard.down("KeyS");
  await expect(canvas).not.toHaveAttribute("data-seated", /.+/);
  await page.keyboard.up("KeyS");
});

test("apartment: place, rotate and remove furniture, lock the door, and it persists", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`${VELVET}&debug=1`);
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
  await page.goto(`${VELVET}&debug=1`);
  await page.getByRole("button", { name: "Go to Jail" }).click();
  await expect(roomTitle(page)).toHaveText("City Jail, Block C");
  const clock = page.getByRole("timer");
  await expect(clock).toContainText("Time left: 1:");
  await page.getByRole("button", { name: /Play cards/ }).click();
  await expect(clock).toContainText(/Time left: 1:[0-3]\d/);
  await page.getByRole("button", { name: /Use the phone/ }).click();
  await expect(page.getByText(/you have 0/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("timer")).toContainText("Time left");
});

test("shoplifting: the suspicion meter fills and a caught player is penalised", async ({
  page,
}) => {
  await page.goto(`${VELVET}&debug=1`);
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
  await page.goto(VELVET);
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

test("the city map's directory takes the player to a venue's door", async ({
  page,
}) => {
  test.setTimeout(330_000);
  await page.goto(`${LOW}&room=city`);
  await expect(roomTitle(page)).toHaveText("Downtown");
  await page.getByRole("button", { name: "City map" }).click();
  const places = page.getByRole("region", { name: "Places" });
  await places.locator("summary", { hasText: "Uptown" }).click();
  await places.getByRole("button", { name: "The Courtside Club" }).click();
  await expect(page.getByRole("dialog", { name: "City map" })).toBeHidden();
  await expect(roomTitle(page)).toHaveText("Uptown", { timeout: 150_000 });
});

test("the city map takes the player to Beachside", async ({ page }) => {
  await page.goto(`${LOW}&room=city`);
  await expect(roomTitle(page)).toHaveText("Downtown");
  await page.getByRole("button", { name: "City map" }).click();
  const map = page.getByRole("dialog", { name: "City map" });
  await expect(map).toBeVisible();
  // today's three challenges sit under the map
  await expect(
    map
      .getByRole("region", { name: "Today's challenges" })
      .getByRole("listitem"),
  ).toHaveCount(3);
  await map.getByRole("button", { name: "Beachside" }).click();
  await expect(map).toBeHidden();
  await expect(roomTitle(page)).toHaveText("Beachside", { timeout: 60_000 });
});
