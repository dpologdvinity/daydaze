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
  await expect(page.locator("#mirror")).toBeHidden();
  await toggle.click();
  await expect(page.locator("#mirror")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close mirror" }),
  ).toHaveAttribute("aria-expanded", "true");
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
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-frames",
    /[3-9]|10/,
    { timeout: 120_000 },
  );
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
