// The detail pass: the small parts that turn a facade, a corner or a planter
// into a place. Balconies and fire escapes, rooftop kit, shopfront displays,
// graffiti, planter foliage and traffic lights. Pure and deterministic, like
// the rest of the dressing, and types only from its neighbours so the module
// loads on its own.
import { hash, pick } from "./hash.ts";
import type { Building } from "./layout.ts";
import type { Buckets, Front, Placed } from "./dressing.ts";

// the window rows sit on the same floors as dressing's windows
const FLOOR = 3.4;
const CONCRETE = "#4a3f72";
const TRIM = "#2a2050";
const IRON = "#1c1438";
const TANK = "#6b4a2b";
const AC = ["#9aa3c4", "#7d86ab", "#b9bfd6"];
const NEON = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#7dff6b", "#b06bff", "#ff8a3d"];
const PRODUCT = ["#ffd84f", "#ff4fb3", "#f2eefc", "#4fe3ff", "#7dff6b"];
const POSTER = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#b06bff", "#f2eefc"];
const GRAFFITI = ["#ff4fb3", "#4fe3ff", "#7dff6b", "#ffd84f"];

/** Rooftop kit, balconies, fire escapes and shopfront displays for one building. */
export function detailBuilding(b: Building, f: Front, out: Buckets): void {
  if (b.style === "gate") return;
  // the roof slab sits from f.h to f.h + 0.5, so kit stands on its top
  const top = f.h + 0.5;
  const depth = f.z1 - f.z0;

  out.pole.push({
    x: f.x0 + f.w * 0.28,
    y: top + 1.3,
    z: f.cz,
    sx: 2.2,
    sy: 2.6,
    sz: 2.2,
    color: TANK,
  });
  for (let k = 0; k < 2; k++) {
    if (hash(f.cx, k, 21) < 0.35) continue;
    out.furniture.push({
      x: f.x0 + f.w * (0.58 + 0.2 * k),
      y: top + 0.5,
      z: f.cz - depth * 0.2,
      sx: 1.8,
      sy: 1,
      sz: 1.4,
      color: pick(AC, hash(k, f.cz, 22)),
    });
  }
  // an antenna with a red light blinking at the top
  const ax = f.x1 - 1.2;
  const az = f.z0 + 1.2;
  out.pole.push({
    x: ax,
    y: top + 2.2,
    z: az,
    sx: 0.12,
    sy: 4.4,
    sz: 0.12,
    color: "#8a8aa8",
  });
  out.bulb.push({
    x: ax,
    y: top + 4.5,
    z: az,
    sx: 0.3,
    sy: 0.3,
    sz: 0.3,
    color: "#ff3b4f",
  });
  // a rooftop neon bar on about a third of the buildings
  const sign = hash(f.cx, f.cz, 20);
  if (sign < 0.35) {
    out.tube.push({
      x: f.cx,
      y: top + 0.7,
      z: f.faceZ + f.out1 * 0.25,
      sx: Math.min(f.w * 0.5, 6),
      sy: 0.8,
      sz: 0.2,
      color: pick(NEON, sign * 9),
    });
  }

  // balconies on the avenue face, a slab and a rail, under some windows
  let balconies = 0;
  for (let y = 5; y < f.h - 3 && balconies < 6; y += FLOOR) {
    for (let x = f.x0 + 2; x < f.x1 - 2 && balconies < 6; x += 3.6) {
      if (hash(x, y, 23) > 0.12) continue;
      balconies++;
      out.ledge.push({
        x,
        y: y - 1.25,
        z: f.faceZ + f.out1 * 0.6,
        sx: 2.6,
        sy: 0.2,
        sz: 1.2,
        color: CONCRETE,
      });
      out.ledge.push({
        x,
        y: y + 0.4,
        z: f.faceZ + f.out1 * 1.2,
        sx: 2.6,
        sy: 0.9,
        sz: 0.08,
        color: TRIM,
      });
    }
  }

  if (b.style === "brick") {
    // tenement fire escapes: a landing every two floors and a ladder up the side
    const x = f.x0 + 2.2;
    for (let y = 3.8; y < f.h - 2; y += FLOOR * 2) {
      out.ledge.push({
        x,
        y,
        z: f.faceZ + f.out1 * 0.6,
        sx: 2.6,
        sy: 0.14,
        sz: 1.2,
        color: IRON,
      });
      out.ledge.push({
        x,
        y: y + 0.6,
        z: f.faceZ + f.out1 * 1.2,
        sx: 2.6,
        sy: 0.9,
        sz: 0.06,
        color: IRON,
      });
    }
    out.pole.push({
      x: x + 1.2,
      y: f.h / 2,
      z: f.faceZ + f.out1 * 1.0,
      sx: 0.1,
      sy: f.h,
      sz: 0.1,
      color: IRON,
    });
  }

  if (b.style === "brick" || b.style === "warehouse") {
    // spray-paint tags low on the wall
    for (let k = 0; k < 3; k++) {
      if (hash(f.cx, k, 40) < 0.4) continue;
      out.glow.push({
        x: f.x0 + f.w * (0.15 + 0.3 * k),
        y: 1.8 + hash(k, f.cx, 41) * 1.5,
        z: f.faceZ + f.out1 * 0.04,
        sx: 1.8 + hash(k, f.cz, 43),
        sy: 0.9,
        sz: 0.05,
        color: pick(GRAFFITI, hash(k, f.cz, 42)),
      });
    }
  }

  // posters pasted on the wall and a neon glyph, a heart in tube, by the door
  if (["brick", "warehouse", "storefront", "club"].includes(b.style)) {
    for (let k = 0; k < 2; k++) {
      if (hash(f.cx, k, 60) < 0.3) continue;
      const px = f.x0 + f.w * (0.1 + 0.8 * hash(f.cz, k, 61));
      const py = 2 + hash(k, f.cx, 62) * 1.2;
      const pz = f.faceZ + f.out1 * 0.05;
      out.glow.push({
        x: px,
        y: py,
        z: pz,
        sx: 1.1,
        sy: 1.5,
        sz: 0.04,
        color: pick(POSTER, hash(k, px, 63)),
      });
      out.glow.push({
        x: px,
        y: py + 0.2,
        z: pz + f.out1 * 0.02,
        sx: 0.7,
        sy: 0.5,
        sz: 0.04,
        color: "#1a0b2e",
      });
    }
  }
  if (
    (b.style === "storefront" || b.style === "club") &&
    hash(f.cx, f.cz, 64) < 0.7
  ) {
    const gx = f.x1 - 1.6;
    const gy = 3.4;
    const gz = f.faceZ + f.out1 * 0.12;
    const color = pick(NEON, hash(f.cx, f.cz, 65));
    // two lobes and a point, as four angled bars
    for (const [dx, dy, r] of [
      [-0.3, 0.25, -0.7],
      [0.3, 0.25, 0.7],
      [-0.3, -0.2, 0.9],
      [0.3, -0.2, -0.9],
    ] as const) {
      out.tube.push({
        x: gx + dx,
        y: gy + dy,
        z: gz,
        sx: 0.7,
        sy: 0.1,
        sz: 0.1,
        rot: [0, 0, r],
        color,
      });
    }
  }

  if (b.style === "storefront" || b.style === "club") {
    // a display behind the glass: shelves of product, four across
    for (let i = 0; i < 4; i++) {
      const x = f.x0 + 2.4 + (i * (f.w - 4.8)) / 3;
      out.furniture.push({
        x,
        y: 1.0,
        z: f.faceZ + f.out1 * 0.25,
        sx: 1.1,
        sy: 0.12,
        sz: 0.5,
        color: TRIM,
      });
      for (let k = 0; k < 2; k++) {
        out.furniture.push({
          x: x + (k - 0.5) * 0.5,
          y: 1.3,
          z: f.faceZ + f.out1 * 0.25,
          sx: 0.4,
          sy: 0.5,
          sz: 0.35,
          color: pick(PRODUCT, hash(x, k, 31)),
        });
      }
    }
  }
}

function put(
  out: Placed[],
  kind: "treeCanopy" | "pole" | "furniture" | "bulb",
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
): void {
  out.push({ at: [x, z], kind, instance: { x, y, z, sx, sy, sz, color } });
}

/** Traffic lights on the avenue pavement, one each side of every cross street. */
export function trafficLights(out: Placed[], crossX: readonly number[]): void {
  for (const cx of crossX) {
    for (const side of [-1, 1]) {
      // the corner of the avenue pavement and the cross street's pavement
      const x = cx + 7;
      const z = side * 9;
      put(out, "pole", x, 2.2, z, 0.16, 4.4, 0.16, "#2a2440");
      put(out, "furniture", x, 4.2, z, 0.5, 1.2, 0.5, IRON);
      // the lamps themselves cycle, so the client's Traffic layer draws them
    }
  }
}
