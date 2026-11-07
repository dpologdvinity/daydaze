// Palm Court's motels (BEACH_BACK in layout.ts), dressed in the city's own
// instanced kinds like the rest of the street, and pure, so they look the same
// on every load. Each lot is a pastel two-story strip: a row of numbered doors,
// a window by each, an open walkway with railings along the second floor, a
// stair at one end, a parapet with a neon line; in front a pylon sign with the
// motel's neon name and a VACANCY / NO VACANCY panel, and on every other lot a
// fenced pool with loungers and an umbrella. No downloadable motel model
// exists (the Quaternius buildings are stone houses), so the strip is placed
// from boxes; the lot's far and near views are the same.
import {
  MOTEL_DOOR_NUMBERS,
  MOTEL_HEIGHT,
  MOTEL_NAMES,
  MOTEL_STAIR,
  MOTEL_Z1,
  type Building,
} from "./layout.ts";
import { hash, pick } from "./hash.ts";
import { labelUv, type Buckets } from "./dressing.ts";

const INK = "#1a0b2e";
const WHITE = "#fbf7ef";
const FLOOR = 3.4;
/** One room's width along the strip, meters. */
const UNIT = 3.8;
/** How far the walkway reaches out from the wall. */
const WALK = 1.8;
const STEP = 0.3;
/** The doors' paints: coral, teal, lemon and sky. */
const DOORS = ["#ff7a6b", "#2fb5a8", "#f2c14e", "#5aa9f2"];
/** The neon on the parapet and the name board, one per motel in turn. */
const NEON = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#7dff6b", "#b06bff"];
const LOUNGERS = ["#ff8a7a", "#ffe066", "#8fe9ff", "#c1fba4"];
const UMBRELLAS = ["#ff6f91", "#ffd166", "#4fe3ff"];
const LIT = ["#ffc46b", "#ffc46b", "#8fe9ff", "#ff7ac8"];
const UNLIT = "#2a2c44";

/** Every third motel hangs NO VACANCY. */
export const noVacancy = (n: number): boolean => n % 3 === 2;
/** Every other motel has a pool in its court. */
export const hasPool = (n: number): boolean => n % 2 === 0;

/** The motel's number from its id, `motel-<n>`. */
const numberOf = (b: Building): number => Number(b.id.slice("motel-".length));

/** A pylon sign: a post with a neon name board and a vacancy board, both
 * faces, standing across the lane so it reads from along it. */
function pylon(out: Buckets, n: number, x: number, z: number): void {
  const name = MOTEL_NAMES[n % MOTEL_NAMES.length] ?? "MOTEL";
  const hot = NEON[n % NEON.length] ?? "#ff4fb3";
  const vacancy = !noVacancy(n);
  const state = vacancy ? "VACANCY" : "NO VACANCY";
  out.pole.push({ x, y: 4.2, z, sx: 0.4, sy: 8.4, sz: 0.4, color: WHITE });
  // the name board: dark backing, a neon tube frame and the lit name
  out.ledge.push({ x, y: 9.2, z, sx: 0.4, sy: 2.2, sz: 5.4, color: "#1c1230" });
  for (const dy of [-1.05, 1.05])
    out.tube.push({
      x,
      y: 9.2 + dy,
      z,
      sx: 0.5,
      sy: 0.14,
      sz: 5.4,
      color: "#fff4d6",
    });
  for (const dz of [-2.65, 2.65])
    out.tube.push({
      x,
      y: 9.2,
      z: z + dz,
      sx: 0.5,
      sy: 2.2,
      sz: 0.14,
      color: "#fff4d6",
    });
  out.panel.push({ x, y: 9.2, z, sx: 0.6, sy: 1.7, sz: 4.8, color: hot });
  // the state board hangs under it
  out.ledge.push({ x, y: 7.5, z, sx: 0.4, sy: 1.0, sz: 3.6, color: "#1c1230" });
  out.panel.push({
    x,
    y: 7.5,
    z,
    sx: 0.6,
    sy: 0.75,
    sz: 3.2,
    color: vacancy ? "#7dff6b" : "#ff3b3b",
  });
  for (const side of [1, -1]) {
    const rot = [0, (side * Math.PI) / 2, 0] as const;
    out.label.push({
      x: x + side * 0.33,
      y: 9.2,
      z,
      sx: 4.6,
      sy: 1.15,
      sz: 1,
      rot,
      color: INK,
      uv: labelUv(name),
    });
    out.label.push({
      x: x + side * 0.33,
      y: 7.5,
      z,
      sx: 3.1,
      sy: 0.65,
      sz: 1,
      rot,
      color: INK,
      uv: labelUv(state),
    });
  }
}

/** A fenced pool with a deck, two loungers and an umbrella, centered on `cx`
 * with its deck from z `za` to `zb`. */
function pool(
  out: Buckets,
  n: number,
  cx: number,
  za: number,
  zb: number,
): void {
  const w = 8;
  const d = 3.4;
  const cz = (za + zb) / 2;
  const fx = (w + 5) / 2;
  const fz = (zb - za) / 2;
  out.ledge.push({
    x: cx,
    y: 0.1,
    z: cz,
    sx: 2 * fx,
    sy: 0.2,
    sz: 2 * fz,
    color: "#efe7da",
  });
  out.ledge.push({
    x: cx,
    y: 0.24,
    z: cz,
    sx: w + 1,
    sy: 0.16,
    sz: d + 1,
    color: "#ffffff",
  });
  out.lane.push({
    x: cx,
    y: 0.36,
    z: cz,
    sx: w,
    sy: 0.02,
    sz: d,
    color: "#3fd0f0",
  });
  // a white fence: posts every 2 m and two rails
  for (let i = 0; i <= 5; i++) {
    const x = cx - fx + (i * 2 * fx) / 5;
    for (const z of [cz - fz, cz + fz])
      out.pole.push({
        x,
        y: 0.7,
        z,
        sx: 0.12,
        sy: 1.4,
        sz: 0.12,
        color: "#ffffff",
      });
  }
  for (const y of [0.75, 1.25]) {
    for (const z of [cz - fz, cz + fz])
      out.ledge.push({
        x: cx,
        y,
        z,
        sx: 2 * fx,
        sy: 0.08,
        sz: 0.06,
        color: "#ffffff",
      });
    for (const x of [cx - fx, cx + fx])
      out.ledge.push({
        x,
        y,
        z: cz,
        sx: 0.06,
        sy: 0.08,
        sz: 2 * fz,
        color: "#ffffff",
      });
  }
  // two loungers by the back fence, a seat and a tilted back
  for (const [k, dx] of [-2.4, 0.2].entries()) {
    const color = LOUNGERS[(n + k) % LOUNGERS.length] ?? "#ffe066";
    out.furniture.push({
      x: cx + dx,
      y: 0.42,
      z: cz - fz + 1.1,
      sx: 0.8,
      sy: 0.2,
      sz: 1.5,
      color,
    });
    out.furniture.push({
      x: cx + dx,
      y: 0.72,
      z: cz - fz + 0.3,
      sx: 0.8,
      sy: 0.1,
      sz: 0.8,
      rot: [-0.9, 0, 0],
      color,
    });
  }
  // the umbrella: a pole and a flat-lit canopy
  const ux = cx + fx - 1.2;
  out.pole.push({
    x: ux,
    y: 1.2,
    z: cz - fz + 1.0,
    sx: 0.1,
    sy: 2.4,
    sz: 0.1,
    color: "#ffffff",
  });
  out.lamp.push({
    x: ux,
    y: 2.4,
    z: cz - fz + 1.0,
    sx: 2.4,
    sy: 0.6,
    sz: 2.4,
    color: UMBRELLAS[n % UMBRELLAS.length] ?? "#ff6f91",
  });
}

/** The stair up to the walkway: eleven solid steps along the strip's end
 * (`dir` is 1 for the east end, -1 for the west) and a rail on the open side. */
function stair(out: Buckets, edge: number, dir: 1 | -1, zf: number): void {
  const steps = Math.round(FLOOR / 0.31);
  for (let k = 0; k < steps; k++) {
    const h = ((k + 1) * FLOOR) / steps;
    out.ledge.push({
      x: edge + dir * (0.15 + (steps - 1 - k) * STEP + STEP / 2),
      y: h / 2,
      z: zf + 0.2 + 0.65,
      sx: STEP,
      sy: h,
      sz: 1.3,
      color: "#f4f0ea",
    });
  }
  const run = steps * STEP;
  const len = Math.hypot(run, FLOOR);
  out.ledge.push({
    x: edge + dir * (0.15 + run / 2),
    y: FLOOR / 2 + 1,
    z: zf + 1.55,
    sx: len,
    sy: 0.09,
    sz: 0.07,
    rot: [0, 0, dir * Math.atan2(FLOOR, run)],
    color: WHITE,
  });
}

/** One motel's strip: body, roof, doors, windows, walkway, stair and neon. */
function strip(out: Buckets, b: Building, n: number): void {
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const zf = Math.max(...zs);
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const h = MOTEL_HEIGHT;
  out.stucco.push({
    x: cx,
    y: h / 2,
    z: (z0 + zf) / 2,
    sx: w,
    sy: h,
    sz: zf - z0,
    color: b.color ?? "#ffd6e0",
  });
  // a flat roof with a white parapet and a neon line along the front
  out.roof.push({
    x: cx,
    y: h + 0.05,
    z: (z0 + zf) / 2,
    sx: w + 0.2,
    sy: 0.1,
    sz: zf - z0 + 0.2,
    color: "#9a96b0",
  });
  out.ledge.push({
    x: cx,
    y: h - 0.2,
    z: (z0 + zf) / 2,
    sx: w + 0.6,
    sy: 0.7,
    sz: zf - z0 + 0.6,
    color: WHITE,
  });
  out.tube.push({
    x: cx,
    y: h + 0.25,
    z: zf + 0.3,
    sx: w + 0.6,
    sy: 0.14,
    sz: 0.14,
    color: NEON[n % NEON.length] ?? "#ff4fb3",
  });
  // the walkway on the second floor: slab, a roof over it, posts and rails
  out.ledge.push({
    x: cx,
    y: FLOOR - 0.125,
    z: zf + WALK / 2,
    sx: w,
    sy: 0.25,
    sz: WALK,
    color: "#f4f0ea",
  });
  out.ledge.push({
    x: cx,
    y: h - 0.1,
    z: zf + WALK / 2 + 0.15,
    sx: w + 0.6,
    sy: 0.2,
    sz: WALK + 0.3,
    color: WHITE,
  });
  const units = Math.max(1, Math.floor((w - 0.6) / UNIT));
  const uw = (w - 0.6) / units;
  for (let i = 0; i <= units; i++) {
    const x = x0 + 0.3 + i * uw;
    // a support under the walkway and one holding its roof, on the unit lines
    out.pole.push({
      x,
      y: FLOOR / 2,
      z: zf + WALK - 0.1,
      sx: 0.2,
      sy: FLOOR,
      sz: 0.2,
      color: WHITE,
    });
    out.pole.push({
      x,
      y: FLOOR + (h - FLOOR) / 2,
      z: zf + WALK - 0.1,
      sx: 0.16,
      sy: h - FLOOR - 0.2,
      sz: 0.16,
      color: WHITE,
    });
  }
  for (let x = x0 + 0.3; x <= x1 - 0.2; x += 1.4)
    out.pole.push({
      x,
      y: FLOOR + 0.55,
      z: zf + WALK - 0.1,
      sx: 0.07,
      sy: 1.1,
      sz: 0.07,
      color: WHITE,
    });
  for (const y of [FLOOR + 0.55, FLOOR + 1.1])
    out.ledge.push({
      x: cx,
      y,
      z: zf + WALK - 0.1,
      sx: w,
      sy: 0.08,
      sz: 0.08,
      color: WHITE,
    });
  // a band on the floor line, then the rooms: a door, its number and a window
  out.ledge.push({
    x: cx,
    y: FLOOR,
    z: zf + 0.05,
    sx: w + 0.2,
    sy: 0.3,
    sz: 0.2,
    color: WHITE,
  });
  let room = 0;
  for (let floor = 0; floor < 2; floor++) {
    const y0 = floor * FLOOR;
    for (let i = 0; i < units; i++, room++) {
      const ux = x0 + 0.3 + (i + 0.5) * uw;
      const lit = hash(ux, y0, n) <= 0.5;
      out.furniture.push({
        x: ux - 0.8,
        y: y0 + 1.15,
        z: zf + 0.06,
        sx: 1.1,
        sy: 2.3,
        sz: 0.12,
        color: pick(DOORS, hash(i, floor, n)),
      });
      out.label.push({
        x: ux - 0.8,
        y: y0 + 2.65,
        z: zf + 0.14,
        sx: 0.9,
        sy: 0.225,
        sz: 1,
        color: INK,
        uv: labelUv(
          MOTEL_DOOR_NUMBERS[room % MOTEL_DOOR_NUMBERS.length] ?? "1",
        ),
      });
      out.ledge.push({
        x: ux + 0.9,
        y: y0 + 1.75,
        z: zf + 0.04,
        sx: 1.5,
        sy: 1.4,
        sz: 0.06,
        color: WHITE,
      });
      out.window.push({
        x: ux + 0.9,
        y: y0 + 1.75,
        z: zf + 0.08,
        sx: 1.2,
        sy: 1.1,
        sz: 1,
        rot: [0, 0, 0],
        color: lit ? pick(LIT, hash(ux, floor, 3)) : UNLIT,
      });
    }
  }
}

/** Everything a motel lot is: its strip, the pylon sign and, on pool lots, the pool. */
export function motelBuilding(b: Building, out: Buckets): void {
  const n = numberOf(b);
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const zf = Math.max(...zs);
  strip(out, b, n);
  // odd lots keep their stair room on the west end, even on the east
  if (n % 2) stair(out, x0, -1, zf);
  else stair(out, x1, 1, zf);
  const lotX0 = n % 2 ? x0 - MOTEL_STAIR : x0;
  pylon(out, n, lotX0 + 1.6, MOTEL_Z1 - 1.2);
  if (hasPool(n)) pool(out, n, (x0 + x1) / 2, zf + WALK + 1.2, MOTEL_Z1 - 2.2);
}
