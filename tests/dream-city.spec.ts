// The architectural replacement must actually load and render in every
// region, without shader errors or losing the existing venue entrances.
import { expect, test } from "@playwright/test";
import { recordTestMap } from "./test-map.ts";

// on main, record which files each test loads (scripts/select-tests.ts)
recordTestMap(test);

test("dream city: architecture loads across distinct streets and keeps venue doors", async ({
  page,
}) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  const copperMaps = new Set<string>();
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith("/textures/city_copper/") && response.ok())
      copperMaps.add(path.split("/").at(-1) ?? "");
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("error from the audio device")
    )
      errors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "daydaze-save-v1",
      JSON.stringify({ onboarded: true }),
    );
  });
  const canvas = page.getByRole("img", { name: "3D room view" });
  const views = [
    { at: "8,12", time: "12:00", cam: "-16,14,43,16,10,-25" },
    { at: "31,38", time: "15:00", cam: "-10,10,30,32,18,72" },
    { at: "-300,-8", time: "12:00", cam: "-309,8,-7,-275,10,-25" },
    { at: "280,9", time: "22:00", cam: "263,9,5,306,13,-22" },
    { at: "-12,263", time: "16:00", cam: "-45,9,262,20,11,240" },
  ];
  const signatures = new Set<string>();
  for (const { at, time, cam } of views) {
    await page.goto(
      `/?room=city&view=room&quality=low&still=1&at=${at}&time=${time}&cam=${cam}`,
    );
    await expect(canvas).toHaveAttribute("data-architecture", "ready");
    await expect(canvas).toHaveAttribute("data-architecture-metal", "ready");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-frames")))
      .toBeGreaterThanOrEqual(10);
    const landmarks = (
      (await canvas.getAttribute("data-landmark-expected")) ?? ""
    )
      .split(",")
      .filter(Boolean);
    if (at === "8,12") {
      expect(landmarks).toContain("manor");
      expect(landmarks).toContain("clocktower");
    }
    if (at === "31,38") expect(landmarks).toContain("palace");
    for (const landmark of landmarks)
      await expect(canvas).toHaveAttribute(
        `data-landmark-${landmark}`,
        "ready",
      );
    signatures.add(
      (await canvas.getAttribute("data-architecture-families")) ?? "",
    );
    expect(Number(await canvas.getAttribute("data-calls"))).toBeLessThan(250);
    expect(Number(await canvas.getAttribute("data-triangles"))).toBeLessThan(
      300_000,
    );
  }
  expect(signatures.size).toBeGreaterThan(1);
  expect([...copperMaps].sort()).toEqual([
    "diff.webp",
    "nor.webp",
    "surface.webp",
  ]);
  // The new facade still leads into the existing playable club.
  await page.goto("/?room=city&view=full&quality=low&at=113,9&time=12:00");
  await expect(canvas).toHaveAttribute("data-architecture", "ready");
  // Walking into the doorway triggers its portal; it is not a dock action.
  await page.keyboard.down("KeyS");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pulse");
  await page.keyboard.up("KeyS");
  expect(errors).toEqual([]);
});

test("dream city: Realistic loads scanned occlusion and daytime glass reflections", async ({
  page,
}) => {
  const errors: string[] = [];
  const detail = new Set<string>();
  const paths = ["/textures/asphalt_02/ao.jpg", "/hdri/wide_street_01.hdr"];
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (response.ok() && paths.includes(path)) detail.add(path);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.text().includes("THREE.WebGLProgram"))
      errors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "daydaze-save-v1",
      JSON.stringify({ onboarded: true }),
    );
  });
  const canvas = page.getByRole("img", { name: "3D room view" });
  const city = "/?room=city&still=1&at=8,12&time=12:00";
  await page.goto(`${city}&quality=low`);
  await expect(canvas).toHaveAttribute("data-frames", "10");
  expect(detail.size).toBe(0);
  expect(Number(await canvas.getAttribute("data-calls"))).toBeLessThan(250);
  expect(Number(await canvas.getAttribute("data-triangles"))).toBeLessThan(
    300_000,
  );

  await page.goto(`${city}&quality=ultra`);
  await expect.poll(() => [...detail].sort()).toEqual([...paths].sort());
  await expect(canvas).toHaveAttribute("data-frames", "10");
  expect(errors).toEqual([]);
});
