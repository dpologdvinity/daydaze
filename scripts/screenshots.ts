// Captures review screenshots of each room into docs/screenshots/.
// Needs a dev server: `npm run dev -- --port 5195 --strictPort`, then
// `node --experimental-strip-types scripts/screenshots.ts [name...]`.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { chromium, expect, type Page } from "@playwright/test";
import { DEFAULT_LOOK } from "../src/game/look.ts";
import { SEATS, homeSeats } from "../src/game/seats.ts";
import { yawTowards } from "../src/game/walk.ts";
import {
  FURNITURE_CATALOG,
  FURNITURE_IDS,
  placeFurniture,
  type Furniture,
} from "../src/game/home/decor.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:5195";
/** Waits for the street furniture models and street pieces (CityFurniture sets data-furniture, StreetPieces data-street). */
const furnitureReady = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector("canvas");
      return (
        canvas?.dataset.furniture === "ready" &&
        canvas.dataset.street === "ready" &&
        Number(canvas.dataset.frames) >= 6
      );
    },
    null,
    { timeout: 300_000 },
  );
};
/** Waits for the offshore fleet's models (Fleet sets data-fleet) and the first frames. */
const fleetReady = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector("canvas");
      return (
        Number(canvas?.dataset.fleet) > 0 && Number(canvas?.dataset.frames) >= 6
      );
    },
    null,
    { timeout: 300_000 },
  );
};
/** Waits for the New York bays and the furniture (NycFacades sets data-bays). */
const cityReady = async (page: Page) => {
  await furnitureReady(page);
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.bays === "ready",
    null,
    { timeout: 300_000 },
  );
};
/** Waits for the street pieces: crosswalks, corners, manholes (StreetPieces sets data-street). */
const streetReady = async (page: Page) => {
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.street === "ready",
    null,
    { timeout: 300_000 },
  );
};
/** Waits for either the New York bays, the district lots or Suburbia's houses (a shot may see only one). */
const blocksReady = async (page: Page) => {
  await streetReady(page);
  await page.waitForFunction(
    () => {
      const d = document.querySelector("canvas")?.dataset;
      return (
        d?.bays === "ready" || d?.houses === "ready" || d?.lots === "ready"
      );
    },
    null,
    { timeout: 300_000 },
  );
};
/** A shot with a saved pet: seeds the save, reloads and waits for the pet. */
function petShot(
  name: string,
  query: string,
  kind: string,
  petName: string,
): (typeof SHOTS)[number] {
  return {
    name,
    query,
    live: true,
    act: async (page) => {
      await page.evaluate(
        ([k, n]) => {
          localStorage.setItem(
            "daydaze-save-v1",
            JSON.stringify({
              pet: { kind: k, name: n, adoptedAt: 1, fedAt: Date.now() },
            }),
          );
        },
        [kind, petName],
      );
      await page.reload();
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.frames) >= 6,
        undefined,
        { timeout: 150_000 },
      );
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.petClip !== undefined,
        undefined,
        { timeout: 150_000 },
      );
    },
  };
}

/** Every floor piece packed greedily onto the grid, front to the camera; the
 * pieces that no longer fit go to the next page. Used to check each model. */
function catalogPages(): Furniture[][] {
  let rest = FURNITURE_IDS.filter((id) => !FURNITURE_CATALOG[id].wall);
  const pages: Furniture[][] = [];
  while (rest.length > 0) {
    let items: Furniture[] = [];
    const left: typeof rest = [];
    for (const id of rest) {
      let placed = false;
      for (let r = 0; r < 6 && !placed; r++)
        for (let c = 0; c < 8 && !placed; c++) {
          const next = placeFurniture(items, id, [c, r], 0);
          if (next) {
            items = next;
            placed = true;
          }
        }
      if (!placed) left.push(id);
    }
    pages.push(items);
    rest = left;
  }
  return pages;
}

const at = (
  id: Furniture["id"],
  c: number,
  r: number,
  variant = 0,
  rotation: Furniture["rotation"] = 0,
): Furniture =>
  variant > 0
    ? { id, cell: [c, r], rotation, variant }
    : { id, cell: [c, r], rotation };

/** A shot of the apartment with this furniture already saved. */
function homeShot(name: string, furniture: readonly Furniture[], cam?: string) {
  return {
    name,
    query: `room=apartment${cam ? `&cam=${cam}` : ""}`,
    act: async (page: Page) => {
      await page.evaluate((f) => {
        localStorage.setItem(
          "daydaze-save-v1",
          JSON.stringify({ home: { locked: true, furniture: f } }),
        );
      }, furniture);
      await page.reload();
      // fold the furniture lists so the panel leaves the room in view
      await page.evaluate(() => {
        for (const d of document.querySelectorAll(".home-panel details"))
          d.removeAttribute("open");
      });
    },
  };
}

/**
 * A frame strip of the player walking in a style on the full-body camera:
 * a click on the street beside her is a short trip, a held key a long one
 * (past a second she hurries). Saves the first rendered frames as
 * docs/screenshots/<name>-<nn>.png, logging the pace (data-pace, m/s) and the
 * ground covered by each frame, so a stroll, the jog and planted feet can be
 * judged by eye.
 */
const FRAMES = 48;
function walkStrip(
  name: string,
  gait: string,
  trip: "click" | "hold" | "jump",
  opts: {
    /** Where the click lands (the street beside her by default). */
    at?: readonly [number, number];
    /** Seconds recorded after the click or key. */
    seconds?: number;
    /** Game time as a fraction of real time (?timescale), for short moves. */
    timescale?: number;
    men?: boolean;
    /** Keep the first frames after the click, or (to catch an arrival) the
     * last ones, once she has stood still for `seconds`. */
    keep?: "first" | "last";
  } = {},
): (typeof SHOTS)[number] {
  const {
    at = [960, 500],
    seconds = 6,
    timescale,
    men = false,
    keep = "first",
  } = opts;
  return {
    name,
    query: `room=city&view=full${timescale ? `&timescale=${timescale}` : ""}`,
    live: true,
    act: async (page) => {
      await page.evaluate(
        ([g, look]) => {
          const key = "daydaze-save-v1";
          const save = JSON.parse(localStorage.getItem(key) ?? "{}");
          localStorage.setItem(
            key,
            JSON.stringify({ ...save, look: { ...JSON.parse(look), gait: g } }),
          );
        },
        [
          gait,
          JSON.stringify(
            men ? { ...DEFAULT_LOOK, body: "masculine" } : DEFAULT_LOOK,
          ),
        ],
      );
      await page.reload();
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      // the set-off, arrival and turn clips load a while after the scene
      if (timescale) await page.waitForTimeout(30_000);
      // a CDP screencast delivers every frame the browser renders (a plain
      // screenshot takes seconds on SwiftShader, too slow to see a stride)
      const cdp = await page.context().newCDPSession(page);
      const frames: Buffer[] = [];
      cdp.on("Page.screencastFrame", (f) => {
        // the first frames, or a ring of the latest
        if (keep === "last" && frames.length >= FRAMES) frames.shift();
        if (keep === "last" || frames.length < FRAMES)
          frames.push(Buffer.from(f.data, "base64"));
        void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId });
      });
      await cdp.send("Page.startScreencast", { format: "png" });
      if (trip === "click") await page.mouse.click(at[0], at[1]);
      else if (trip === "jump") await page.keyboard.press("Space");
      else await page.keyboard.down("d");
      // "first" records for `seconds`; "last" until she has stood still for
      // `seconds` (the first frames after a click are all she needs to set off)
      let steady = 0;
      let lastAt = "";
      for (let n = 0; n < (keep === "last" ? 300 : seconds); n++) {
        await page.waitForTimeout(1000);
        const here = await page.evaluate(() => {
          const d = document.querySelector("canvas")?.dataset;
          return `pace ${d?.pace} at ${d?.playerX},${d?.playerZ}`;
        });
        console.log(`${name} ${n + 1}s: ${here}`);
        steady = here === lastAt ? steady + 1 : 0;
        lastAt = here;
        if (keep === "last" && steady >= seconds) break;
      }
      await cdp.send("Page.stopScreencast");
      frames.forEach((png, n) =>
        writeFileSync(
          `docs/screenshots/${name}-${String(n).padStart(2, "0")}.png`,
          png,
        ),
      );
      console.log(`${name}: ${frames.length} screencast frames`);
    },
  };
}

/**
 * A frame strip of a room action (the ladder climb, the overhand throw): runs
 * `setup` (open the game), then records a CDP screencast while `go` fires the
 * move, saving docs/screenshots/<name>-<nn>.png.
 */
function actionStrip(
  name: string,
  query: string,
  setup: (page: Page) => Promise<void>,
  go: (page: Page) => Promise<void>,
  seconds = 20,
  /** How many frames to keep (the first ones). */
  keep = FRAMES,
): (typeof SHOTS)[number] {
  return {
    name,
    query,
    live: true,
    act: async (page) => {
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await setup(page);
      const cdp = await page.context().newCDPSession(page);
      const frames: Buffer[] = [];
      cdp.on("Page.screencastFrame", (f) => {
        if (frames.length < keep) frames.push(Buffer.from(f.data, "base64"));
        void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId });
      });
      await cdp.send("Page.startScreencast", { format: "png" });
      await go(page);
      await page.waitForTimeout(seconds * 1000);
      await cdp.send("Page.stopScreencast");
      frames.forEach((png, n) =>
        writeFileSync(
          `docs/screenshots/${name}-${String(n).padStart(2, "0")}.png`,
          png,
        ),
      );
      console.log(`${name}: ${frames.length} screencast frames`);
    },
  };
}

/** An actionStrip of a tag game's round: `start` is its panel's button. */
function firefightStrip(
  name: string,
  query: string,
  start: string,
): (typeof SHOTS)[number] {
  return actionStrip(
    name,
    query,
    async (page) => {
      await page
        .getByRole("button", { name: start })
        .click({ timeout: 150_000 });
    },
    async (page) => {
      await page.evaluate(() => {
        let n = 0;
        window.setInterval(() => {
          const rivals = document.querySelectorAll<HTMLButtonElement>(
            '[aria-label="Fire at"] button',
          );
          rivals[n++ % rivals.length]?.click();
        }, 330);
      });
    },
    25,
  );
}

/**
 * A frame strip of sitting down, standing up or a seated action on a seat,
 * on the full-body camera at a tenth of real time (?timescale), so each frame
 * of the 1-second sit-down or stand-up is caught. She spawns on the seat's
 * approach point, facing the seat. "sit" records the sit-down, "stand" the
 * stand-up (she sits first, waits to settle, then a key press stands her),
 * "emote" a seated clap, "type" typing at the apartment desk.
 */
function seatStrip(
  name: string,
  seatId: string,
  what: "sit" | "stand" | "emote" | "type",
  /** Which side of her the camera stands (1 or -1), clear of the neighbors. */
  side: 1 | -1,
  /** How far out and how high the camera stands (a room with a panel in the way wants more). */
  frame: { dist: number; height: number } = { dist: 3, height: 0.9 },
): (typeof SHOTS)[number] {
  // the apartment desk and chair, saved before the page loads
  const desk = [at("desk", 1, 0), at("office-chair", 1, 1)];
  const seat =
    seatId === "home-chair-1"
      ? homeSeats(desk).find((x) => x.hold === "seat-typing")
      : SEATS.find((x) => x.id === seatId);
  if (!seat) throw new Error(`no seat ${seatId}`);
  // she faces the seat as she arrives
  const yaw = yawTowards(seat.approach, seat.at);
  const room = seatId === "home-chair-1" ? "apartment" : seat.room;
  // a side-on camera three meters out at about her hip height, pinned (?cam=)
  // on the spot she sits, so the bench or chair under her is in the frame
  const mid = [
    (seat.approach[0] + seat.at[0]) / 2,
    (seat.approach[1] + seat.at[1]) / 2,
  ];
  const eye = [
    mid[0] + Math.cos(seat.yaw) * frame.dist * side,
    mid[1] - Math.sin(seat.yaw) * frame.dist * side,
  ];
  const cam = `${eye[0].toFixed(2)},${frame.height},${eye[1].toFixed(2)},${mid[0].toFixed(2)},0.8,${mid[1].toFixed(2)}`;
  // dispatched, not clicked: the apartment's panel sits over the dock
  const takeSeat = async (page: Page) => {
    await page
      .getByRole("button", { name: "Take a seat" })
      .dispatchEvent("click");
  };
  const seated = async (page: Page) => {
    await takeSeat(page);
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.seated !== undefined,
      null,
      { timeout: 300_000 },
    );
    // the sit-down runs a second of game time, 33 of real time
    await page.waitForTimeout(45_000);
  };
  return actionStrip(
    name,
    // low quality and a small window: SwiftShader renders every few seconds, so
    // game time runs at 3% for a frame to span a few hundredths of a second
    `room=${room}&quality=low&timescale=0.03&cam=${cam}&at=${seat.approach[0]},${seat.approach[1]}&yaw=${yaw}`,
    async (page) => {
      // the emote panel covers a small window's doll: a wide one clears it
      await page.setViewportSize(
        what === "emote"
          ? { width: 1280, height: 720 }
          : { width: 800, height: 500 },
      );
      if (room === "apartment") {
        await page.evaluate((f) => {
          localStorage.setItem(
            "daydaze-save-v1",
            JSON.stringify({ home: { locked: true, furniture: f } }),
          );
        }, desk);
        await page.reload();
        await page.waitForFunction(
          () => document.querySelector("canvas")?.dataset.frames === "10",
          null,
          { timeout: 300_000 },
        );
      }
      // the seated clip pack loads a while after the scene
      await page.waitForTimeout(40_000);
      if (what === "stand" || what === "emote") await seated(page);
    },
    async (page) => {
      if (what === "stand") await page.keyboard.down("d");
      else if (what === "emote") {
        await page.getByRole("radio", { name: "Dance", exact: true }).click();
        await page
          .getByRole("radiogroup", { name: "Emote" })
          .getByRole("radio", { name: "Clapping" })
          .click();
      } else await takeSeat(page);
    },
    what === "type" ? 60 : what === "stand" ? 75 : 45,
    90,
  );
}

/**
 * Tiles PNG frames into one sheet in the page (no image library needed): each
 * frame cropped to `crop` (a rectangle of the full frame), `columns` to a row.
 */
async function tileFrames(
  page: Page,
  frames: Buffer[],
  crop: { x: number; y: number; width: number; height: number },
  columns: number,
): Promise<Buffer> {
  const data = await page.evaluate(
    async ([urls, box, cols]) => {
      const images = await Promise.all(
        urls.map(
          (url) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = url;
            }),
        ),
      );
      const rows = Math.ceil(images.length / cols);
      const sheet = document.createElement("canvas");
      sheet.width = box.width * cols;
      sheet.height = box.height * rows;
      const ctx = sheet.getContext("2d");
      images.forEach((img, i) =>
        ctx?.drawImage(
          img,
          box.x,
          box.y,
          box.width,
          box.height,
          (i % cols) * box.width,
          Math.floor(i / cols) * box.height,
          box.width,
          box.height,
        ),
      );
      return sheet.toDataURL("image/png");
    },
    [
      frames.map((f) => `data:image/png;base64,${f.toString("base64")}`),
      crop,
      columns,
    ] as const,
  );
  return Buffer.from(data.split(",")[1] ?? "", "base64");
}

/**
 * Proof that the player's wheels turn and steer: the car is driven on a
 * paused fake clock that is stepped by hand, so each frame is an exact time
 * after the throttle goes down. Two sheets in docs/screenshots: sheet 00
 * (frames 50 ms apart while pulling away from rest, the car rolling only a few
 * centimeters a frame so the hub's spokes shift a few degrees each) and
 * sheet 01 (straight, then the wheel turned, then turned more), cropped round the car.
 */
function wheelSheet(name: string): (typeof SHOTS)[number] {
  const size = { width: 2400, height: 1500 };
  // the side view keeps the car in the middle of the frame, 10 m off at about
  // 150 px a meter here, nose to the right (the car faces -x): a strip along its wheels
  const crop = { x: 840, y: 620, width: 720, height: 360 };
  return {
    name,
    query: "room=city&time=12:00&at=-58,1.5",
    live: true,
    viewport: size,
    act: async (page) => {
      // the car parked mid-avenue in the far lane facing -x, so its right side
      // (where the side view stands) looks over open road, not a wall
      await page.evaluate(() => {
        const key = "daydaze-save-v1";
        const save = JSON.parse(localStorage.getItem(key) ?? "{}");
        const car = {
          id: "quill-lite",
          color: "#d8d8e4",
          at: [-60, 3],
          yaw: -Math.PI / 2,
          fuel: 1,
        };
        localStorage.setItem(key, JSON.stringify({ ...save, car }));
      });
      await page.reload();
      const canvas = page.getByRole("img", { name: "3D room view" });
      await expect(canvas).toHaveAttribute("data-city-car", "parked", {
        timeout: 300_000,
      });
      await page.getByRole("button", { name: "Drive your car" }).click();
      await expect(canvas).toHaveAttribute("data-city-car", "driving", {
        timeout: 120_000,
      });
      // the car's right-hand side, close enough to see the spokes; the camera
      // eases round to it in real time before the clock is paused
      await page.getByRole("button", { name: "Side view" }).click();
      await page.waitForTimeout(8000);
      const shoot = async (ms: number) => {
        await page.clock.runFor(ms);
        // real time: lets the software renderer finish the stepped frames
        await page.waitForTimeout(1500);
        return page.screenshot({ timeout: 180_000 });
      };
      // the fake clock starts at 0 and jumps (firing each due timer once) to
      // 30 s, where it waits for runFor: install to pause takes well under that
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(30_000);
      const spin: Buffer[] = [];
      await page.keyboard.down("w");
      for (const ms of [150, 50, 50, 50]) spin.push(await shoot(ms));
      // still rolling slowly (the steering angle the wheels show does not
      // depend on speed): straight, then the wheel turned, then turned more
      const turn: Buffer[] = [spin[3]];
      await page.keyboard.down("a");
      turn.push(await shoot(300));
      turn.push(await shoot(300));
      await page.keyboard.up("a");
      await page.keyboard.up("w");
      // the runner collects `<name>.png` and `<name>-NN.png`: the sheets are 00
      // (spin) and 01 (turn), the raw frames 10-19 (spin) and 20-29 (turn)
      for (const [sheetNo, frames] of [
        [0, spin],
        [1, turn],
      ] as const) {
        const sheet = await tileFrames(page, frames, crop, 2);
        writeFileSync(`docs/screenshots/${name}-0${sheetNo}.png`, sheet);
        frames.forEach((png, n) =>
          writeFileSync(
            `docs/screenshots/${name}-${10 * (sheetNo + 1) + n}.png`,
            png,
          ),
        );
      }
      console.log(
        `${name}: ${spin.length} spin frames, ${turn.length} turn frames`,
      );
    },
  };
}

/**
 * A lane car caught close at night, by day or at night: the camera stands on
 * the avenue's center line looking west, the clock is paused and stepped (a
 * small window and 100 ms jumps, so it is quick) until the traffic probe
 * (`?debug=1`, Traffic.tsx) shows a car in the open between 8 and 15 m away,
 * then the window grows to full size and the frame is taken. `<name>-00` has
 * a car coming toward the camera (headlights), `<name>-01` one going away
 * (tail lamps).
 */
function trafficClose(name: string, hour: number): (typeof SHOTS)[number] {
  const camera = { x: -110, z: 0.5 };
  const full = { width: 1280, height: 800 };
  return {
    name,
    query: `room=city&view=room&time=${hour}:00&debug=1&at=-110,8&cam=${camera.x},1.5,${camera.z},-150,1.2,${camera.z}`,
    live: true,
    act: async (page) => {
      const canvas = page.getByRole("img", { name: "3D room view" });
      await furnitureReady(page);
      await page.setViewportSize({ width: 480, height: 300 });
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(30_000);
      /** Steps until a car moving along the avenue is 8 to 15 m west of the camera. */
      const find = async (toward: boolean) => {
        for (let step = 0; step < 900; step++) {
          await page.clock.fastForward(100);
          await page.waitForTimeout(40);
          const probe = (await canvas.getAttribute("data-traffic-probe")) ?? "";
          for (const entry of probe.split(";")) {
            const [x, z, yaw, speed] = entry.split(",").map(Number);
            if (!(speed > 1)) continue;
            const behind = camera.x - x;
            // west of the camera, in its lanes, running along the avenue
            if (behind < 8 || behind > 15 || Math.abs(z - camera.z) > 4)
              continue;
            const along = Math.cos(yaw);
            if (Math.abs(along) < 0.95 || along > 0 !== toward) continue;
            console.log(`${name}: step ${step}, car at ${x},${z} yaw ${yaw}`);
            return;
          }
        }
        console.log(`${name}: no car found, shooting anyway`);
      };
      for (const [n, toward] of [
        [0, true],
        [1, false],
      ] as const) {
        await find(toward);
        await page.setViewportSize(full);
        // the resize lands on a timer and the canvas repaints a frame later
        await page.clock.runFor(100);
        await page.waitForTimeout(1500);
        await page.clock.runFor(100);
        await page.waitForTimeout(2500);
        writeFileSync(
          `docs/screenshots/${name}-0${n}.png`,
          await page.screenshot({ timeout: 180_000 }),
        );
        await page.setViewportSize({ width: 480, height: 300 });
      }
      await page.setViewportSize(full);
      await page.clock.runFor(50);
    },
  };
}

/**
 * A jeepney rolling past, four frames 60 ms apart (`<name>-00` to `-03`): the
 * camera stands on the pavement looking across the near lane, the clock is
 * paused and stepped (a small window, so it is quick) until the traffic probe
 * (`?debug=1`, Traffic.tsx; its fifth field is `j` for a jeepney) shows one
 * moving along the avenue right in front of it. Between frames the wheels have
 * turned by the road rolled, so the spokes are at a new angle in each.
 */
function jeepneyRoll(name: string): (typeof SHOTS)[number] {
  const camera = { x: -110, z: 12.5 };
  const full = { width: 1280, height: 800 };
  return {
    name,
    query: `room=city&view=room&quality=low&time=12:00&debug=1&at=${camera.x + 9},10&cam=${camera.x},1.5,${camera.z},${camera.x},0.8,3`,
    live: true,
    act: async (page) => {
      const canvas = page.getByRole("img", { name: "3D room view" });
      await furnitureReady(page);
      await page.setViewportSize({ width: 480, height: 300 });
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(30_000);
      let found = false;
      for (let step = 0; step < 1500 && !found; step++) {
        await page.clock.fastForward(100);
        await page.waitForTimeout(40);
        const probe = (await canvas.getAttribute("data-traffic-probe")) ?? "";
        for (const entry of probe.split(";")) {
          const [x, z, yaw, speed, kind] = entry.split(",");
          if (kind !== "j" || !(Number(speed) > 2)) continue;
          // in front of the camera, in the near lane, running along the avenue
          if (Math.abs(Number(x) - camera.x) > 1.5) continue;
          if (Number(z) < 0.5 || Number(z) > 6) continue;
          if (Math.abs(Math.cos(Number(yaw))) < 0.95) continue;
          console.log(`${name}: step ${step}, jeepney at ${x},${z} yaw ${yaw}`);
          found = true;
        }
      }
      if (!found) console.log(`${name}: no jeepney found, shooting anyway`);
      await page.setViewportSize(full);
      await page.clock.runFor(100);
      await page.waitForTimeout(1500);
      for (let n = 0; n < 4; n++) {
        await page.clock.runFor(60);
        await page.waitForTimeout(1200);
        writeFileSync(
          `docs/screenshots/${name}-0${n}.png`,
          await page.screenshot({ timeout: 180_000 }),
        );
      }
    },
  };
}

const SHOTS: {
  name: string;
  query: string;
  viewport?: { width: number; height: number };
  /** Live shots keep the frame loop running, so a ride can move between frames. */
  live?: boolean;
  touch?: boolean;
  /** Drives the scene before the capture, e.g. to start a race. */
  act?: (page: Page) => Promise<void>;
}[] = [
  wheelSheet("car-wheels"),
  jeepneyRoll("jeepney-wheels"),
  trafficClose("car-traffic-close-night", 23),
  walkStrip("walk-feminine-short", "feminine", "click"),
  walkStrip("walk-feminine-long", "feminine", "hold"),
  walkStrip("walk-swagger-short", "swagger", "click"),
  // the set-off, arrival and turn clips (locomotion.ts), at a tenth of real
  // time so each half-second move spans several rendered frames
  walkStrip("move-start", "natural", "click", { timescale: 0.1, seconds: 30 }),
  walkStrip("move-stop", "natural", "click", {
    timescale: 0.1,
    seconds: 12,
    keep: "last",
  }),
  walkStrip("move-turn", "natural", "click", {
    at: [700, 650],
    timescale: 0.1,
    seconds: 30,
  }),
  walkStrip("move-jump", "natural", "jump", { timescale: 0.1, seconds: 30 }),
  // the room actions: the ladder climb and the Hot Shots throw
  actionStrip(
    "move-climb",
    "room=water-park",
    async (page) => {
      await page
        .getByRole("button", { name: "Climb the tower" })
        .click({ timeout: 150_000 });
      const panel = page.getByRole("region", { name: "Cliff dive" });
      await panel.getByRole("button", { name: /Pencil drop/ }).click();
    },
    async (page) => {
      await page
        .getByRole("region", { name: "Cliff dive" })
        .getByRole("button", { name: "Dive!" })
        .click();
    },
  ),
  actionStrip(
    "move-throw",
    "room=dome",
    async (page) => {
      const panel = page.getByRole("region", { name: "Hot Shots" });
      await panel.getByRole("button", { name: "Start the clock" }).click();
      await panel.getByRole("button", { name: "Aim" }).click();
    },
    async (page) => {
      await page
        .getByRole("region", { name: "Hot Shots" })
        .getByRole("button", { name: "Shoot!" })
        .click();
    },
    12,
  ),
  // a firefight in each tag game: start the round, then tag a rival every
  // third of a second from inside the page (a click takes whole frames on
  // SwiftShader), so the strip holds the run, aim, shot, flinch and fall
  firefightStrip("firefight-laser", "room=laser-tag&quality=low", "Suit up"),
  firefightStrip("firefight-paint", "room=paintball&quality=low", "Gear up"),
  walkStrip("move-start-man", "natural", "click", {
    men: true,
    timescale: 0.1,
    seconds: 30,
  }),
  seatStrip("seat-bench-sit", "dome-bench-0", "sit", -1),
  seatStrip("seat-bench-stand", "dome-bench-0", "stand", -1),
  seatStrip("seat-stadium-sit", "stadium-dugout-0", "sit", 1),
  seatStrip("seat-stadium-stand", "stadium-dugout-0", "stand", 1),
  seatStrip("seat-clap", "dome-bench-0", "emote", -1),
  seatStrip("seat-stool-cellar", "cellar-stool-0", "sit", 1),
  seatStrip("seat-stool-skylark", "skylark-stool-0", "sit", 1),
  seatStrip("seat-typing", "home-chair-1", "type", -1, {
    dist: 3.2,
    height: 1.4,
  }),
  // a pair talking on the sidewalk (game/city/chatGroups.ts), a few turns' worth
  // of frames from the street side, her out of the way across the road
  actionStrip(
    "chat-sidewalk",
    "room=city&quality=low&at=14,3&cam=22,1.55,7.7,22,1.2,10.36",
    async (page) => {
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.chatGroups) >= 1,
        null,
        { timeout: 300_000 },
      );
      // the social clip pack loads a while after the scene
      await page.waitForTimeout(40_000);
    },
    async () => {},
    90,
    90,
  ),
  // the player's own emotes, full body: a whisper and a laugh
  ...(["Whisper", "Laughing"] as const).map((emote) =>
    actionStrip(
      `emote-${emote === "Whisper" ? "whisper" : "laugh"}`,
      "room=city&view=full&quality=low",
      async (page) => {
        await page.waitForTimeout(40_000);
      },
      async (page) => {
        await page.getByRole("radio", { name: "Dance", exact: true }).click();
        await page
          .getByRole("radiogroup", { name: "Emote" })
          .getByRole("radio", { name: emote })
          .click();
      },
      40,
      60,
    ),
  ),
  { name: "club-pulse", query: "room=pulse" },
  {
    name: "apartment",
    query: "room=apartment",
    act: async (page) => {
      for (const [piece, cell] of [
        ["Velvet sofa", "Empty cell 2, 2"],
        ["Scalloped rug", "Empty cell 2, 4"],
        ["Floor lamp", "Empty cell 1, 1"],
      ]) {
        await page.getByRole("button", { name: piece }).click();
        await page.getByRole("button", { name: cell }).click();
      }
    },
  },
  homeShot("apartment-furnished", [
    at("plant", 0, 0),
    at("tv", 1, 0),
    at("sofa", 3, 0, 1),
    at("lamp", 6, 0),
    at("armchair", 2, 2, 3),
    at("coffee-table", 3, 1),
    at("table-small", 5, 1),
    at("rug", 3, 3, 3),
    at("bed", 6, 2, 2),
    at("nightstand", 5, 2, 2),
    at("desk", 0, 4),
    at("office-chair", 0, 5, 1),
    at("bookshelf", 1, 5, 1),
    at("fridge", 3, 5),
    at("oven", 4, 5),
    at("kitchen-sink", 5, 5),
    at("toilet", 7, 5),
    at("wall-art", 0, 0, 2),
    at("wall-neon", 4, 0, 1),
    at("wall-mirror", 6, 0),
  ]),
  ...catalogPages().map((page, i) =>
    homeShot(`apartment-catalog-${i + 1}`, page, "0,7.5,6,0,0.4,0.5"),
  ),
  homeShot(
    "apartment-tv",
    [at("tv", 3, 2), at("tv-flat", 3, 4)],
    "0,3,5,0,0.3,0.5",
  ),
  homeShot(
    "apartment-catalog-wall",
    [
      at("wall-art", 0, 0, 5),
      at("wall-art-wide", 4, 0, 4),
      at("wall-shelf", 6, 0),
    ],
    "0,3,8,0,1.6,-3",
  ),
  {
    name: "jail",
    query: "room=jail",
    act: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "daydaze-save-v1",
          JSON.stringify({ jail: { endsAt: Date.now() + 180_000 } }),
        );
      });
      await page.reload();
      await expect(page.getByRole("timer")).toContainText("Time left");
    },
  },
  { name: "jail-cells", query: "room=jail&cam=0,2.2,2.4,0,0.9,-3.2" },
  {
    name: "club-pulse-mobile",
    query: "room=pulse",
    viewport: { width: 390, height: 844 },
    touch: true,
  },
  { name: "lesbian-bar", query: "room=violet-hour" },
  {
    name: "minigame-from-world",
    query: "room=velvet-room",
    act: async (page) => {
      await page
        .getByRole("button", { name: "Play Last Call at the bar" })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 120_000 });
    },
  },
  { name: "velvet-room", query: "room=velvet-room" },
  { name: "rooftop-bar", query: "room=rooftop-bar" },
  { name: "rooftop-lounge", query: "room=rooftop-bar&cam=-1,2.4,4.5,-7,0.8,1" },
  { name: "sugar-rush", query: "room=sugar-rush" },
  { name: "warehouse", query: "room=warehouse" },
  { name: "karaoke", query: "room=karaoke" },
  { name: "bowling", query: "room=bowling" },
  { name: "bowling-concourse", query: "room=bowling&cam=0,2.4,9.8,0,0.6,5" },
  { name: "arcade-bar", query: "room=arcade-bar" },
  { name: "orbit", query: "room=orbit" },
  { name: "la-noche", query: "room=la-noche" },
  { name: "mini-golf", query: "room=mini-golf" },
  { name: "dome", query: "room=dome" },
  { name: "kamayan-hall", query: "room=kamayan-hall" },
  { name: "galleria", query: "room=galleria" },
  { name: "roller-rink", query: "room=roller-rink" },
  { name: "skatepark", query: "room=skatepark" },
  { name: "gridiron", query: "room=gridiron" },
  { name: "driving-range", query: "room=driving-range" },
  { name: "marina", query: "room=marina" },
  {
    // out past the dock end: the liner on the horizon, the tall ships beside the course
    name: "marina-fleet",
    query: "room=marina&view=room&cam=0,3.2,-8,0,5,-38",
    act: fleetReady,
  },
  { name: "yacht", query: "room=yacht" },
  { name: "courtside", query: "room=courtside" },
  { name: "catwalk", query: "room=catwalk" },
  { name: "mermaid-cove", query: "room=mermaid-cove" },
  {
    name: "mermaid-cove-rocks",
    query: "room=mermaid-cove&cam=-2,2.4,1.5,-6.5,1.1,-3.3",
  },
  { name: "open-water", query: "room=open-water" },
  { name: "open-water-whale", query: "room=open-water&cam=8,4,-40,8,-1,-64" },
  { name: "open-water-full", query: "room=open-water&view=full" },
  { name: "reef-dive", query: "room=reef-dive" },
  {
    name: "reef-dive-deep",
    query: "room=reef-dive&at=3,-14&yaw=3.14&view=full",
  },
  {
    // swimming out past the lane buoys, strokes and all, fish below
    name: "open-water-swim",
    query: "room=open-water&at=2,-9&yaw=3.14&view=full",
    live: true,
    act: async (page) => {
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.keyboard.down("w");
      await page.waitForTimeout(6_000);
    },
  },
  {
    // a diver on the reef: tank, mask, bubbles, the gauge, the log
    name: "reef-dive-swim",
    query: "room=reef-dive&at=0,-4&yaw=3.14&view=full",
    live: true,
    act: async (page) => {
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.keyboard.down("w");
      await page.waitForTimeout(6_000);
    },
  },
  { name: "skate-diner", query: "room=skate-diner" },
  { name: "museum", query: "room=museum" },
  { name: "salon", query: "room=salon" },
  { name: "laser-tag", query: "room=laser-tag" },
  { name: "market", query: "room=market" },
  { name: "paintball", query: "room=paintball" },
  { name: "music-studio", query: "room=music-studio" },
  { name: "zoo", query: "room=zoo" },
  // close on the savanna: the static giraffes and the zebras
  { name: "zoo-savanna", query: "room=zoo&cam=-8,3.2,-1,-13,1,-9" },
  // close on the elephants and the lions' rocks
  { name: "zoo-elephants", query: "room=zoo&cam=8,3.4,-1,13,1.2,-9" },
  // the big cats' rocks (lions and tigers) and the woods (bear and elk)
  { name: "zoo-bigcats", query: "room=zoo&cam=-13,3.2,-2.5,-13,1,4" },
  {
    name: "park-deer",
    query:
      "room=city&quality=high&time=14:00&at=268,-279&cam=277,26,-250,277,0,-277",
    act: furnitureReady,
  },
  { name: "zoo-woods", query: "room=zoo&cam=0,7,2,0,1,-6.2" },
  { name: "forest", query: "room=forest" },
  // the vending machines in Skyline Supply, Player 2 and the Boardwalk Arcade
  { name: "vending-market", query: "room=market&cam=6.4,1.6,-1.2,8.6,1,-2.8" },
  {
    name: "vending-arcade-bar",
    query: "room=arcade-bar&cam=-1,1.8,4.4,-5.6,1,4.4",
  },
  {
    name: "vending-boardwalk-arcade",
    query: "room=boardwalk-arcade&cam=-6,1.8,5.2,-8.6,1,3.9",
  },
  // Larkspur's meadow glade and the garden's beds, with their butterflies
  {
    name: "butterflies-meadow",
    query: "room=forest&cam=6,2.6,16,16,1,5",
  },
  { name: "butterflies-garden", query: "room=garden&cam=0,3,12,0,1,0" },
  { name: "forest-path", query: "room=forest&cam=2,3,2,-1,1.2,-10" },
  { name: "forest-top", query: "room=forest&cam=0,26,8,0,0,-4" },
  { name: "forest-creek", query: "room=forest&cam=2,7,-4,1,0,-14" },
  { name: "forest-lookout", query: "room=forest&cam=7,3.4,-34,7,1.6,-46" },
  { name: "dealership", query: "room=dealership" },
  // the two unbadged showpieces on their plinths, from the aisle
  {
    name: "dealership-saloon",
    query: "room=dealership&cam=-9.2,2.6,7.6,-10.6,0.8,1.2",
  },
  {
    name: "dealership-concept",
    query: "room=dealership&cam=11.8,3.2,6.8,10.6,0.7,0",
  },
  { name: "jazz-club", query: "room=jazz-club" },
  { name: "vinyl-vault", query: "room=vinyl-vault" },
  { name: "back-room", query: "room=back-room" },
  { name: "tiki-bar", query: "room=tiki-bar" },
  { name: "thrift-temple", query: "room=thrift-temple" },
  { name: "espresso-lab", query: "room=espresso-lab" },
  { name: "hotel-rooftop", query: "room=hotel-rooftop" },
  { name: "bookshop", query: "room=bookshop" },
  { name: "patisserie", query: "room=patisserie" },
  {
    name: "patisserie-case",
    query: "room=patisserie&cam=-2,2.0,-0.6,-1,0.95,-4",
  },
  { name: "clay-day", query: "room=pottery" },
  { name: "florist", query: "room=florist" },
  { name: "gallery", query: "room=gallery" },
  { name: "surf-shack", query: "room=surf-shack" },
  { name: "boardwalk-arcade", query: "room=boardwalk-arcade" },
  { name: "drive-in", query: "room=drive-in" },
  { name: "wine-bar", query: "room=wine-bar" },
  { name: "video-store", query: "room=video-store" },
  { name: "green-haze", query: "room=green-haze&adult=1" },
  { name: "piercing", query: "room=piercing" },
  { name: "halo-halo-cafe", query: "room=halo-halo-cafe" },
  { name: "ramen-shop", query: "room=ramen-shop" },
  { name: "sushi-bar", query: "room=sushi-bar" },
  { name: "lune", query: "room=lune" },
  { name: "bistro", query: "room=bistro" },
  { name: "gym", query: "room=gym" },
  { name: "stadium", query: "room=stadium" },
  { name: "velvet-room-full-look", query: "room=velvet-room&view=full" },
  { name: "velvet-room-detail", query: "room=velvet-room&view=detail" },
  { name: "club-pulse-detail", query: "room=pulse&view=detail" },
  { name: "lesbian-bar-detail", query: "room=violet-hour&view=detail" },
  { name: "plaza-detail", query: "room=plaza&view=detail" },
  { name: "plaza", query: "room=plaza" },
  { name: "plaza-face", query: "room=plaza&view=face" },
  {
    // the sun beds, their towels and the umbrellas, from the pool's far side
    name: "water-park-loungers",
    query: "room=water-park&cam=-3,2.6,11.5,1,0.4,5.6",
  },
  { name: "water-park-wide", query: "room=water-park" },
  { name: "water-park-swimsuit", query: "room=water-park&view=full" },
  {
    name: "water-park-slide",
    query: "room=water-park&slide=0.45",
    live: true,
  },
  {
    name: "water-park-mobile",
    query: "room=water-park",
    viewport: { width: 390, height: 844 },
  },
  { name: "amusement-park-wide", query: "room=amusement-park" },
  {
    name: "amusement-park-coaster",
    query: "room=amusement-park&ride=coaster",
    live: true,
  },
  {
    name: "amusement-park-mobile",
    query: "room=amusement-park",
    viewport: { width: 390, height: 844 },
  },
  { name: "aquarium", query: "room=aquarium" },
  { name: "ice-rink", query: "room=ice-rink" },
  { name: "haunted-house", query: "room=haunted-house" },
  // the escape's first room: the front hall dressed as a set, three doors ahead
  {
    name: "haunted-escape",
    query: "room=haunted-house",
    act: async (page) => {
      await page
        .getByRole("button", { name: "Step inside" })
        .click({ timeout: 150_000 });
      await expect(page.locator("canvas")).toHaveAttribute(
        "data-haunted-set",
        /^[a-z]+$/,
      );
      // the shot camera eases out to the hall: give it time to settle
      await page.waitForTimeout(10_000);
    },
  },
  {
    name: "haunted-escape-wide",
    query: "room=haunted-house",
    viewport: { width: 2400, height: 800 },
    act: async (page) => {
      await page
        .getByRole("button", { name: "Step inside" })
        .click({ timeout: 150_000 });
      await expect(page.locator("canvas")).toHaveAttribute(
        "data-haunted-set",
        /^[a-z]+$/,
      );
      // the shot camera eases out to the hall: give it time to settle
      await page.waitForTimeout(10_000);
    },
  },
  // your adopted pet beside you in the city, and asleep in its bed at home
  petShot("pet-city", "room=city&view=full&time=12:00", "husky", "Biscuit"),
  petShot("pet-home", "room=apartment", "shibainu", "Kiko"),
  petShot("pet-lab", "room=city&view=full&time=12:00", "labrador", "Maple"),
  { name: "city-street", query: "room=city&view=full&time=12:00&at=45,11" },
  {
    name: "transit-city-street-before",
    query: "room=city&view=full&time=12:00&at=45,11",
  },
  {
    name: "transit-bus-stop-before",
    query: "room=city&view=full&time=12:00&at=-24,13",
  },
  {
    name: "transit-bus-stop",
    query: "room=city&view=full&time=12:00&at=-24,13",
  },
  // street dressing (src/game/city/streetPieces.ts): the avenue's crossing at
  // street level by day and night, Shore Boulevard's with its SLOW word, and
  // the avenue from far down the road (low tier, the one with the budget)
  ...[
    ["street-crossing", "12:00", "-80,9", "-96,4,4,-62,0,-1"],
    ["street-crossing-night", "22:00", "-80,9", "-96,4,4,-62,0,-1"],
    ["street-shore", "12:00", "70,238", "64,4,216,64,0,252"],
    ["street-far", "12:00", "-120,9", "-135,3.5,3,-30,1,0"],
    ["street-aerial", "12:00", "-60,9", "-110,45,28,-30,0,-4"],
    ["street-shore-far", "12:00", "-100,262", "-190,22,266,-40,0,256"],
  ].map(([name, time, at, cam]) => ({
    name: String(name),
    query: `room=city&quality=low&time=${time}&at=${at}&cam=${cam}`,
    act: furnitureReady,
  })),
  // the nature pass (CityTrees, CityPark, the palms): street trees down the
  // avenue, the Uptown park's lawn, Maple Drive's lawns, Shore Boulevard's
  // palms and the dune grass, by day and night; all low tier (the one with the budget)
  ...[
    ["nature-avenue", "12:00", "-60,11", "-78,2.6,12,-10,4,9"],
    ["nature-avenue-night", "22:00", "-60,11", "-78,2.6,12,-10,4,9"],
    ["nature-park-lawn", "14:00", "228,-282", "216,2.2,-270,244,3,-300"],
    ["nature-park-lawn-night", "22:00", "228,-282", "216,2.2,-270,244,3,-300"],
    ["nature-suburbia", "12:00", "-400,-240", "-420,2.4,-244,-370,3.5,-262"],
    ["nature-shore", "12:00", "-100,262", "-130,2.6,262,-40,5,262"],
    ["nature-shore-night", "22:00", "-100,262", "-130,2.6,262,-40,5,262"],
    ["nature-park-gate", "14:00", "254,-262", "254,3,-254,254,4,-290"],
    ["nature-park-wide", "14:00", "212,-270", "206,7,-262,268,3,-300"],
    ["nature-dunes", "15:00", "-100,300", "-70,1.8,301,-150,1.2,295"],
  ].map(([name, time, at, cam]) => ({
    name: String(name),
    query: `room=city&quality=low&time=${time}&at=${at}&cam=${cam}`,
    // Maple Drive and the dunes have no furniture (data-furniture), so wait
    // on the blocks instead
    act: async (page: Page) => {
      await page.locator("canvas").waitFor();
      await blocksReady(page);
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.frames) >= 6,
        null,
        { timeout: 300_000 },
      );
    },
  })),
  // the infill and yards (infill.ts, yards.ts): a back alley between two rows
  // seen from the cross street at x 64, the rows themselves from the avenue's
  // cross street, a pocket lot and a lane; day and night, low tier. The blocks
  // around the gaps have no bays or lots, so wait on the furniture
  ...[
    ["yards-alley", "12:00", "64,-173", "60,2.2,-173,110,2,-173"],
    ["yards-alley-night", "22:00", "64,-173", "60,2.2,-173,110,2,-173"],
    ["yards-rows", "12:00", "64,-100", "58,4,-96,100,6,-140"],
    ["yards-rows-night", "22:00", "64,-100", "58,4,-96,100,6,-140"],
    ["yards-lot", "12:00", "64,-185", "58,3.5,-183,140,1.5,-170"],
  ].map(([name, time, at, cam]) => ({
    name: String(name),
    query: `room=city&quality=low&time=${time}&at=${at}&cam=${cam}`,
    act: furnitureReady,
  })),
  { name: "city-overview", query: "room=city" },
  // the city by day and at sunset (daylight.ts), pinned with ?time=
  {
    name: "city-day",
    query: "room=city&view=full&time=12:00",
    act: cityReady,
  },
  {
    name: "city-day-overview",
    query: "room=city&time=12:00",
    // the overview draws no New York bays (baysWanted in budget.ts), so
    // data-bays never reads "ready" there: wait on the furniture alone
    act: furnitureReady,
  },
  {
    name: "city-night-overview",
    query: "room=city&time=22:00",
    act: furnitureReady,
  },
  // the New York blocks from the street (src/game/city/nyc.ts), by day and at night
  ...[
    ["nyc-street", "12:00", "-30,-6", 0],
    ["nyc-night", "22:00", "-30,-6", 0],
    ["nyc-corner", "12:00", "-70,-8", Math.PI / 2],
    ["nyc-manila", "12:00", "-262,-6", 0],
    ["nyc-chinatown", "12:00", "262,-6", 0],
    ["nyc-suburbia", "12:00", "-404,-236", 0],
    // the district lots (src/game/city/districts.ts), each by day and by night
    ["lots-manila-day", "12:00", "-300,-8", 0],
    ["lots-manila-night", "22:00", "-300,-8", 0],
    ["lots-chinatown-day", "12:00", "262,-8", 0],
    ["lots-chinatown-night", "22:00", "262,-8", 0],
    ["lots-koreatown-day", "12:00", "372,-8", 0],
    ["lots-koreatown-night", "22:00", "372,-8", 0],
    ["lots-arts-day", "12:00", "-96,-256", 0],
    ["lots-arts-night", "22:00", "-96,-256", 0],
    ["lots-uptown-day", "12:00", "264,-256", 0],
    ["lots-uptown-night", "22:00", "264,-256", 0],
    ["el-station", "12:00", "10,12", 0],
    ["el-train", "12:00", "-6,14&elat=69", 0],
  ].map(([name, time, at, yaw]) => ({
    name: String(name),
    query: `room=city&view=full&time=${time}&at=${at}&yaw=${yaw}`,
    live: true,
    act: async (page: Page) => {
      await page.locator("canvas").waitFor();
      await blocksReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.mouse.move(640, 400);
      for (let i = 0; i < (String(name).startsWith("el-train") ? 24 : 12); i++)
        await page.mouse.wheel(0, 100);
    },
  })),
  // each district's facades from across the street, by day and by night
  ...[
    ["manila", "-300,-8", "-252,5,-12,-298,9,14"],
    ["chinatown", "240,-8", "205,4,-12,244,10,14"],
    ["koreatown", "372,-8", "330,4,-12,372,10,14"],
    ["arts", "-96,-256", "-130,5,-262,-96,10,-244"],
    ["uptown", "214,-256", "180,5,-262,214,10,-244"],
  ].flatMap(([name, at, cam]) =>
    [
      ["day", "12:00"],
      ["night", "22:00"],
    ].map(([when, time]) => ({
      name: `lotsw-${name}-${when}`,
      live: true,
      query: `room=city&quality=low&time=${time}&at=${at}&cam=${cam}`,
      act: async (page: Page) => {
        await blocksReady(page);
        await page.waitForFunction(
          () => document.querySelector("canvas")?.dataset.frames === "10",
          null,
          { timeout: 300_000 },
        );
      },
    })),
  ),
  // a district shop board from the pavement in front of it (2.2 m up, 10 m
  // back, a step to the side), by day and by night: legible, sized, lit
  ...(
    [
      ["manila", [-385, -3.5], [-381.5, -14]],
      ["chinatown", [241.5, 4], [239.3, 14]],
      ["koreatown", [404, 4], [401.4, 14]],
      ["arts", [-27, -254], [-23, -244]],
      ["uptown", [203, -254], [207.1, -244]],
    ] as const
  ).flatMap(([name, eye, sign]) =>
    (
      [
        ["day", "12:00"],
        ["night", "22:00"],
      ] as const
    ).map(([when, time]) => ({
      name: `shop-${name}-${when}`,
      live: true,
      // the walker stands a few meters off the camera's line, out of frame
      query: `room=city&view=room&quality=low&time=${time}&at=${eye[0] + 7},${eye[1]}&cam=${eye[0]},2.2,${eye[1]},${sign[0]},2.9,${sign[1]}`,
      act: async (page: Page) => {
        await blocksReady(page);
        await page.waitForFunction(
          () => document.querySelector("canvas")?.dataset.frames === "10",
          null,
          { timeout: 300_000 },
        );
      },
    })),
  ),
  { name: "city-sunset", query: "room=city&view=full&time=19:30" },
  {
    name: "city-night",
    query: "room=city&view=full&time=23:00",
    act: furnitureReady,
  },
  // seasonal dressing (src/client/city/SeasonalDressing.tsx), previewed with ?date=
  ...[
    // fairy lights along Nightlife Row's south facades
    [
      "season-winter",
      "2026-12-20",
      "21:00",
      "high",
      "100,10",
      "100,2.2,4,128,4,14",
    ],
    // the Plaza tree
    [
      "season-winter-tree",
      "2026-12-20",
      "21:00",
      "high",
      "24,36",
      "28,2.5,44,12,4,29",
    ],
    // jack-o'-lanterns and bats at the Pulse door, seen along the facade
    [
      "season-halloween",
      "2026-10-28",
      "19:30",
      "high",
      "118,10",
      "126,1.8,11.5,110,2.4,13.4",
    ],
    // lanterns over Chinatown's avenue, from above the traffic
    [
      "season-lunar",
      "2027-02-10",
      "20:00",
      "high",
      "226,4",
      "214,6,-1,262,5,0",
    ],
    // the same winter and Halloween views on the low tier, for the budget
    [
      "season-winter-low",
      "2026-12-20",
      "21:00",
      "low",
      "100,10",
      "100,2.2,4,128,4,14",
    ],
    [
      "season-halloween-low",
      "2026-10-28",
      "19:30",
      "low",
      "118,10",
      "126,1.8,11.5,110,2.4,13.4",
    ],
  ].map(([name, date, time, quality, at, cam]) => ({
    name: String(name),
    query: `room=city&quality=${quality}&date=${date}&time=${time}&at=${at}&cam=${cam}`,
    act: furnitureReady,
  })),
  // the string lights over Nightlife Row's avenue (garland in dressing.ts)
  {
    name: "cubes-strings",
    query: "room=city&quality=high&time=21:00&at=100,8&cam=100,2.2,8,150,7,-2",
    act: furnitureReady,
  },
  // the queue outside Pulse, Kenney people on the forecourt (QueueCrowd.tsx)
  {
    name: "crowd-queue",
    query: "room=city&quality=high&time=21:00&at=112,6&cam=96,2.4,4,113,1.6,17",
    act: furnitureReady,
  },
  // the avenue sidewalk with its street furniture (src/client/city/CityFurniture.tsx)
  {
    name: "city-sidewalk",
    query: "room=city&view=full&time=12:00&at=-36,9.5",
    act: furnitureReady,
  },
  // the parked sports car and cop car from the road, by day and at night:
  // wheels, glass and lamps of the downloaded bodies (trafficBodies.ts)
  ...(
    [
      ["sports", 12, "-40,-1", "-34,1.6,0.2,-43,0.7,-5.2"],
      ["cop", 12, "-27,-1", "-21,1.6,0.2,-30,0.7,-5.2"],
      ["sports", 23, "-40,-1", "-34,1.6,0.2,-43,0.7,-5.2"],
      ["cop", 23, "-27,-1", "-21,1.6,0.2,-30,0.7,-5.2"],
    ] as const
  ).map(([body, hour, at, cam]) => ({
    name: `car-parked-${body}-${hour === 12 ? "day" : "night"}`,
    query: `room=city&view=room&quality=low&time=${hour}:00&at=${at}&cam=${cam}`,
    act: furnitureReady,
  })),
  // your own car at its home kerb (src/game/city/drive.ts HOME_PARKING), the
  // full-detail body: nose and rear, by day and at night
  ...(
    [
      ["front", 12, "24,1.5,-0.5,14,0.7,5.4"],
      ["rear", 12, "4,1.4,-0.5,14,0.7,5.4"],
      ["front", 23, "24,1.5,-0.5,14,0.7,5.4"],
      ["rear", 23, "4,1.4,-0.5,14,0.7,5.4"],
    ] as const
  ).map(([end, hour, cam]) => ({
    name: `car-own-${end}-${hour === 12 ? "day" : "night"}`,
    query: `room=city&view=room&quality=low&time=${hour}:00&at=10,7&cam=${cam}`,
    act: furnitureReady,
  })),
  // lane traffic at a busy crossing, by day and at night
  ...(
    [
      ["day", 12],
      ["night", 23],
    ] as const
  ).map(([label, hour]) => ({
    name: `city-traffic-${label}`,
    query: `room=city&view=room&quality=low&time=${hour}:00&at=-130,8&cam=-120,2.4,9,-165,1,0`,
    act: furnitureReady,
  })),
  {
    // a signal head at a crossing, its lit bulbs cycling (Traffic.tsx)
    name: "city-signal",
    query: "room=city&view=full&time=12:00&at=-47,9.5",
    act: furnitureReady,
  },
  {
    // the palms stand on Shore Boulevard and the beach only
    name: "city-palms",
    query: "room=city&view=full&time=12:00&at=-100,262",
    act: furnitureReady,
  },
  {
    // Uptown's Park and Gardens (src/game/city/park.ts): the fountain plaza,
    // paths, pond, bandstand and picnics
    name: "city-park",
    query: "room=city&view=full&time=14:00&at=254,-280",
    act: cityReady,
  },
  // a snack vending machine on the avenue's north pavement, by day and lit at night
  {
    name: "vending-street-day",
    query:
      "room=city&view=room&time=13:00&at=103,7&cam=103.8,1.5,7.4,106.8,1,9.9",
    act: furnitureReady,
  },
  {
    name: "vending-street-night",
    query:
      "room=city&view=room&time=22:00&at=103,7&cam=103.8,1.5,7.4,106.8,1,9.9",
    act: furnitureReady,
  },
  {
    // butterflies over the park's east lawn, close
    name: "butterflies-park",
    query:
      "room=city&view=room&time=14:00&at=254,-280&cam=251,2,-285,268,1.3,-277",
    act: async (page) => {
      await cityReady(page);
      // the flock is in: it exists only while a flock is near and it is day
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.butterflies) > 0,
        undefined,
        { timeout: 120_000 },
      );
    },
  },
  {
    // the park's entrance from Park Avenue, flanked by trees
    name: "city-park-entrance",
    query: "room=city&view=full&time=14:00&at=254,-262",
    act: cityReady,
  },
  {
    // the dog yard east of the park's north-south path (src/game/city/dogPark.ts)
    name: "dog-park",
    query:
      "room=city&view=room&time=14:00&at=264,-292&cam=276,7,-292,264,0.5,-304",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.dogs !== undefined,
        null,
        { timeout: 300_000 },
      );
    },
  },
  {
    // the weekend farmers market (src/game/city/farmersMarket.ts), forced open
    name: "farmers-market",
    query:
      "room=city&view=room&time=11:00&market=1&at=252,-290&cam=253,6.5,-290,244,1.2,-302",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.market === "open",
        null,
        { timeout: 300_000 },
      );
    },
  },
  {
    // the weekend farmers market (src/game/city/farmersMarket.ts), forced open
    name: "market-bakehouse",
    query:
      "room=city&view=room&time=11:00&market=1&at=249,-292&cam=246.9,2.1,-296.2,242.2,1.2,-296.4",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.market === "open",
        null,
        { timeout: 300_000 },
      );
    },
  },
  {
    // the same stalls on a weekday: closed, bare and unmanned
    name: "farmers-market-closed",
    query:
      "room=city&view=room&time=11:00&market=0&at=252,-290&cam=253,6.5,-290,244,1.2,-302",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.market === "closed",
        null,
        { timeout: 300_000 },
      );
    },
  },
  {
    // the park band on its shell's stage mid-tune (src/game/city/bandShell.ts)
    name: "band-shell",
    // live: the band's dolls stream in after the first ten frames
    live: true,
    query:
      "room=city&view=room&time=11:00&band=40&at=222,-284&cam=230,7.5,-301,230,1.2,-276",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.band === "playing",
        null,
        { timeout: 300_000 },
      );
      // the dolls' models stream in after the shell
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.bandDolls) > 0,
        null,
        { timeout: 300_000 },
      );
      await page.waitForTimeout(8_000);
    },
  },
  {
    name: "city-park-pond",
    query: "room=city&view=full&time=14:00&at=233,-290",
    act: furnitureReady,
  },
  {
    // Beachside's boardwalk (src/game/city/boardwalk.ts)
    name: "city-boardwalk",
    query: "room=city&view=full&time=15:00&at=-34,286",
    act: furnitureReady,
  },
  {
    // a deck bench from the front quarter: bleached planks, facing the sea
    name: "bench-boardwalk",
    query:
      "room=city&view=room&time=15:00&at=-380,276&cam=-391,1.4,289.4,-394.5,0.7,288.7",
    act: furnitureReady,
  },
  {
    // a park bench from the front quarter: green slats on iron, facing the path
    name: "bench-park",
    query:
      "room=city&view=room&time=14:00&at=235,-282&cam=225,1.9,-291.2,222,0.6,-285.8",
    act: furnitureReady,
  },
  {
    // the boardwalk's fairground end: carousel and Ferris wheel
    name: "city-boardwalk-fair",
    query: "room=city&view=room&time=15:00&at=320,292&cam=290,3,289,338,12,301",
    act: furnitureReady,
  },
  ...[
    // Palm Court: the lane one block back from the boardwalk, with the motels
    // along its north side (the camera is pinned with ?cam=)
    ["beachside-motels", "-212,10,214,-130,6,194"],
    ["beachside-motels-east", "-60,9,214,40,6,194"],
    ["beachside-motels-far", "-60,30,260,-60,4,190"],
    ["beachside-motel-close", "-168,5,217,-184,3.5,194"],
    ["beachside-motel-wide", "-120,12,236,-165,4,196"],
  ].map(([name, cam]) => ({
    name: String(name),
    query: cam
      ? `room=city&view=room&time=15:00&at=-110,213&cam=${cam}`
      : "room=city&time=15:00&at=-182,214",
    live: true,
    act: async (page: Page) => {
      await page.locator("canvas").waitFor();
      await blocksReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
    },
  })),
  {
    // from the sand out to sea: the liner, two sail ships and a Viking boat
    name: "city-horizon-day",
    query:
      "room=city&view=room&time=15:00&at=-60,316&cam=-60,2.6,316,-150,24,585",
    act: fleetReady,
  },
  {
    name: "city-horizon-night",
    query:
      "room=city&view=room&time=22:00&at=-60,316&cam=-60,2.6,316,-150,24,585",
    act: fleetReady,
  },
  {
    // sunbathers' umbrellas, a lifeguard stand and the dune fence
    name: "city-beach",
    query: "room=city&view=full&time=15:00&at=-135,317",
    act: furnitureReady,
  },
  {
    // along the boardwalk, looking east: shops on the left, beach and sea on
    // the right, the Ferris wheel ahead (the camera is pinned with ?cam=)
    name: "city-boardwalk-wide",
    query:
      "room=city&view=room&time=15:00&at=250,284&cam=160,2.8,282,340,3,296",
    act: furnitureReady,
  },
  {
    // eye level on the deck: the crowd, the kiosks and carts, the cyclists
    name: "city-boardwalk-crowd",
    query:
      "room=city&view=room&time=15:00&at=40,283&cam=-10,2.2,284,90,1.8,283.5",
    act: furnitureReady,
  },
  {
    // a parade float up close (the parade is under way when the HUD says so)
    name: "city-parade-float",
    query:
      "room=city&view=room&time=15:00&parade=60&at=-40,283&cam=-62,2.6,288,-10,2.2,283",
    act: furnitureReady,
  },
  {
    // straight down on the planks: the boards run north-south, across the walk
    name: "city-deck-top",
    query: "room=city&time=15:00&at=-34,286&cam=-34,14,283,-34,0,283.5",
    act: furnitureReady,
  },
  {
    name: "city-boardwalk-dusk",
    query:
      "room=city&view=room&time=19:40&at=250,284&cam=160,2.8,282,340,3,296",
    act: furnitureReady,
  },
  {
    name: "city-sidewalk-night",
    query: "room=city&view=full&time=23:00&at=-36,9.5",
    act: furnitureReady,
  },
  {
    // the game menu open over the city: everything not needed this moment
    name: "city-menu",
    query: "room=city&view=full",
    act: async (page) => {
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.frames) >= 6,
        null,
        { timeout: 300_000 },
      );
      await page.getByRole("button", { name: "Menu", exact: true }).click();
    },
  },
  {
    name: "credits",
    query: "room=city&view=full",
    act: async (page) => {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Credits", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Credits", exact: true }),
      ).toBeVisible();
    },
  },
  {
    name: "credits-mobile",
    query: "room=city&view=full",
    viewport: { width: 390, height: 844 },
    touch: true,
    act: async (page) => {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Credits", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Credits", exact: true }),
      ).toBeVisible();
    },
  },
  {
    // the wheel zooms from the overview all the way in on her face
    name: "city-zoom",
    query: "room=city",
    live: true,
    act: async (page) => {
      const canvas = page.locator("canvas");
      await canvas.waitFor();
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.mouse.move(640, 400);
      for (let i = 0; i < 60; i++) await page.mouse.wheel(0, -100);
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.camDistance) < 1,
        null,
        { timeout: 120_000 },
      );
    },
  },
  {
    // the park's street-food stop from the zoomed-out orbit camera: the view the
    // low tier's triangle budget has to hold (src/game/city/budget.ts)
    name: "park-wide",
    query: "room=city&view=full&time=12:00&at=254,-264",
    live: true,
    act: async (page) => {
      await furnitureReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.streetFood === "ready",
        null,
        { timeout: 300_000 },
      );
      await page.mouse.move(850, 350);
      await page.mouse.wheel(0, 1400);
      await page.waitForFunction(
        () =>
          Number(document.querySelector("canvas")?.dataset.camDistance) > 20,
        null,
        { timeout: 120_000 },
      );
    },
  },
  {
    // the west end of the avenue, the plan-heaviest spot on the low tier
    name: "w144-wide",
    query: "room=city&view=full&time=12:00&at=-144,0",
    live: true,
  },
  {
    name: "city-mobile",
    query: "room=city&view=full",
    viewport: { width: 390, height: 844 },
    touch: true,
  },
  { name: "speedway-grid", query: "room=speedway" },
  { name: "cars-lineup", query: "room=speedway&lineup=cars" },
  {
    // the same cars with a wrap, gold rims, smoked windows and underglow
    name: "cars-lineup-mods",
    query:
      "room=speedway&lineup=cars&wrap=stripes&rims=gold&tint=smoke&glow=pink",
  },
  {
    name: "cars-lineup-two-tone",
    query: "room=speedway&lineup=cars&wrap=two-tone&rims=pink",
  },
  {
    name: "speedway-racing",
    query: "room=speedway",
    live: true,
    act: async (page) => {
      const canvas = page.getByRole("img", { name: "3D room view" });
      await page.getByRole("button", { name: "Race the Neon Oval" }).click();
      await expect(canvas).toHaveAttribute("data-race-phase", "racing", {
        timeout: 120_000,
      });
      await page.keyboard.down("KeyW");
    },
  },
  {
    name: "speedway-bumper",
    query: "room=speedway",
    live: true,
    act: async (page) => {
      const canvas = page.getByRole("img", { name: "3D room view" });
      await page.getByRole("button", { name: "Bumper cars" }).click();
      await expect(canvas).toHaveAttribute("data-race-phase", "bumpers");
    },
  },
  {
    name: "speedway-mobile",
    query: "room=speedway",
    viewport: { width: 390, height: 844 },
    touch: true,
    live: true,
    act: async (page) => {
      const canvas = page.getByRole("img", { name: "3D room view" });
      await page.getByRole("button", { name: "Race the Neon Oval" }).click();
      await expect(canvas).toHaveAttribute("data-race-phase", "racing", {
        timeout: 120_000,
      });
    },
  },
  { name: "point-and-eat-kitchen", query: "room=filipino-joint" },
  { name: "jade-whisk-boba-matcha", query: "room=boba-matcha" },
  { name: "purple-pandesal-ube", query: "room=ube-bakery" },
  {
    name: "ube-bakery-counter",
    query: "room=ube-bakery&cam=0,2.1,3,0,1.1,-0.9",
  },
  { name: "farm", query: "room=farm" },
  { name: "garden", query: "room=garden" },
  // close on the north pasture's fence rails and the plots
  { name: "farm-fence", query: "room=farm&cam=12,3.5,-1,12,0.6,-12" },
  {
    name: "plate-rush-app",
    query: "room=city",
    act: async (page) => {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Plate Rush" }).click();
      await expect(
        page.getByRole("dialog", { name: "Plate Rush" }),
      ).toBeVisible();
    },
  },
];

const only = process.argv.slice(2);
// hair-<name> and doll-suit-<name> shots are the lineup page's
// (scripts/hair-shots.ts), which writes docs/screenshots/<prefix>-<name>.png
// like any other shot
const prefixOf = (n: string) =>
  n.startsWith("hair-") ? "hair-" : n.startsWith("doll-suit-") ? "doll-" : "";
const hairShots = only.filter((n) => prefixOf(n));
if (hairShots.length) {
  execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "scripts/hair-shots.ts",
      ...hairShots.map((n) => n.slice(prefixOf(n).length)),
    ],
    { stdio: "inherit" },
  );
  if (hairShots.length === only.length) process.exit(0);
}
const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
for (const shot of SHOTS) {
  if (only.length && !only.includes(shot.name)) continue;
  // a phone shot needs touch on, so the stick shows and pointer:coarse matches
  const page = await browser.newPage({
    viewport: shot.viewport ?? { width: 1280, height: 800 },
    isMobile: shot.touch ?? false,
    hasTouch: shot.touch ?? false,
  });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  // a fresh save would show the first-visit walkthrough in every shot
  await page.addInitScript(() => {
    const key = "daydaze-save-v1";
    const save = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (!("onboarded" in save))
      localStorage.setItem(key, JSON.stringify({ ...save, onboarded: true }));
  });
  const started = Date.now();
  await page.setViewportSize(shot.viewport ?? { width: 1280, height: 800 });
  const still = shot.live ? "" : "&still=1";
  await page.goto(`${BASE}/?quality=low${still}&${shot.query}`, {
    timeout: 300_000,
  });
  if (shot.act) await shot.act(page);
  const canvas = page.getByRole("img", { name: "3D room view" });
  await expect(canvas).toHaveAttribute("data-frames", /\d+/, {
    timeout: 600_000,
  });
  // wait until the demand loop has rendered and then gone quiet for 8 s
  let last = "";
  let quietSince = Date.now();
  while (Date.now() - quietSince < 8000) {
    await page.waitForTimeout(1000);
    const frames =
      (await page
        .locator("canvas")
        .getAttribute("data-frames")
        .catch(() => null)) ?? "";
    if (frames !== last) {
      last = frames;
      quietSince = Date.now();
    }
    if (Date.now() - started > 600_000) break;
  }
  // a live frame loop can make the capture wait a long time on SwiftShader
  await page.screenshot({
    path: `docs/screenshots/${shot.name}.png`,
    timeout: 180_000,
  });
  // renderer stats for the first frames: draw calls and triangles
  const calls = await canvas.getAttribute("data-calls");
  const triangles = await canvas.getAttribute("data-triangles");
  console.log(
    `${shot.name}: ${last} frames, ${calls} draw calls, ${triangles} triangles, ${((Date.now() - started) / 1000).toFixed(0)} s`,
  );
  await page.close();
}
await browser.close();
