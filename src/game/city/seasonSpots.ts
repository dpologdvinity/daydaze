// Where the seasonal dressings go (pure; src/client/city/SeasonalDressing.tsx
// draws them): fairy-light swags along the avenue facades, the Plaza tree's
// spiral of bulbs, red lantern strings over Chinatown and Koreatown, and the
// pumpkins and paper bats on the avenue stoops. Everything follows the real
// building footprints and doors in layout.ts, so a new storefront is dressed
// for free.

import { BUILDINGS, type Building } from "./layout.ts";
import type { Vec2 } from "../walk.ts";

/** One glowing bulb: world position, size (m) and color. */
export type Bulb = {
  at: readonly [number, number, number];
  size: number;
  color: string;
};
/** One placed model: position, yaw and scale. */
export type Piece = {
  at: readonly [number, number, number];
  yaw: number;
  scale: number;
};

/** The avenue's facades stand on these two lines (z = ±14). */
const FACADE_Z = 14;
/** Fairy lights hang this far off the wall and this high. */
const SWAG_OFF = 0.4;
const SWAG_HEIGHT = 3.9;
const SWAG_SAG = 0.7;
const SWAG_SPAN = 6;
const BULB_GAP = 1.5;

export const WARM_LIGHTS = [
  "#ffd9a0",
  "#ffb347",
  "#ff6b6b",
  "#7bd88f",
] as const;
export const RAINBOW_LIGHTS = [
  "#ff4d4d",
  "#ff9f43",
  "#ffe066",
  "#5fd068",
  "#4dabf7",
  "#b197fc",
] as const;
export const HALLOWEEN_LIGHTS = [
  "#ff7a1a",
  "#9b5de5",
  "#ff7a1a",
  "#7bff5a",
] as const;

/** The Plaza's tree stands east of the fountain's bench ring. */
export const PLAZA_TREE: Vec2 = [12, 29];
export const PLAZA_TREE_HEIGHT = 8;

type Front = { b: Building; x0: number; x1: number; side: 1 | -1 };

/** Buildings whose front is on the avenue (z = ±14), with the side they stand on. */
function avenueFronts(): Front[] {
  const out: Front[] = [];
  for (const b of BUILDINGS) {
    const xs = b.footprint.map((p) => p[0]);
    const zs = b.footprint.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    if (Math.min(...zs) === FACADE_Z) out.push({ b, x0, x1, side: 1 });
    else if (Math.max(...zs) === -FACADE_Z) out.push({ b, x0, x1, side: -1 });
  }
  return out;
}

/** Swags of bulbs along Downtown's and Nightlife Row's facades, colors cycling through `palette`. */
export function facadeLights(palette: readonly string[]): Bulb[] {
  const bulbs: Bulb[] = [];
  let n = 0;
  for (const { b, x0, x1, side } of avenueFronts()) {
    if (b.neighborhood !== "downtown" && b.neighborhood !== "nightlife-row")
      continue;
    const spans = Math.max(1, Math.round((x1 - x0) / SWAG_SPAN));
    const steps = spans * (SWAG_SPAN / BULB_GAP);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const phase = (t * spans) % 1;
      const sag = SWAG_SAG * 4 * phase * (1 - phase);
      bulbs.push({
        at: [
          x0 + t * (x1 - x0),
          SWAG_HEIGHT - sag,
          side * (FACADE_Z - SWAG_OFF),
        ],
        size: 0.32,
        color: palette[n++ % palette.length] ?? "#ffd9a0",
      });
    }
  }
  return bulbs;
}

/** The Plaza tree's string of lights, spiraling up its cone. */
export function treeLights(): Bulb[] {
  const colors = ["#fff0c8", "#ff5a5a", "#ffd24d", "#6ec6ff"] as const;
  const bulbs: Bulb[] = [];
  const count = 72;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const r = 2.1 * (1 - t) + 0.15;
    const a = t * Math.PI * 2 * 5;
    bulbs.push({
      at: [
        PLAZA_TREE[0] + Math.cos(a) * r,
        0.9 + t * (PLAZA_TREE_HEIGHT - 1.6),
        PLAZA_TREE[1] + Math.sin(a) * r,
      ],
      size: 0.3,
      color: colors[i % colors.length] ?? "#fff0c8",
    });
  }
  return bulbs;
}

/** Strings across the avenue every 12 m through Chinatown and Koreatown: lanterns and the cord's dots. */
export function lanternStrings(): { lanterns: Piece[]; cord: Bulb[] } {
  const lanterns: Piece[] = [];
  const cord: Bulb[] = [];
  const fronts = avenueFronts().filter(
    ({ b }) => b.neighborhood === "chinatown-koreatown",
  );
  if (fronts.length === 0) return { lanterns, cord };
  const x0 = Math.min(...fronts.map((f) => f.x0)) + 6;
  const x1 = Math.max(...fronts.map((f) => f.x1));
  for (let x = x0, k = 0; x <= x1; x += 12, k++) {
    for (let s = 0; s <= 24; s++) {
      const t = s / 24;
      const z = (t * 2 - 1) * (FACADE_Z - 0.5);
      const y = 7.4 - 1.6 * 4 * t * (1 - t);
      cord.push({ at: [x, y, z], size: 0.1, color: "#5a1010" });
      if (s % 5 === 2)
        lanterns.push({ at: [x, y - 0.8, z], yaw: (k + s) * 0.7, scale: 1 });
    }
  }
  return { lanterns, cord };
}

/** Avenue doors (stoops at z = ±12.5): where pumpkins sit and bats hang. */
function stoops(): { x: number; side: 1 | -1 }[] {
  const out: { x: number; side: 1 | -1 }[] = [];
  for (const b of BUILDINGS) {
    const p = b.door?.position;
    if (p && Math.abs(Math.abs(p[1]) - 12.5) < 0.01)
      out.push({ x: p[0], side: p[1] > 0 ? 1 : -1 });
  }
  return out;
}

/** Two pumpkins beside every avenue door. */
export function pumpkins(): Piece[] {
  return stoops().flatMap(({ x, side }, i) =>
    [-1.4, 1.5].map((dx, j) => ({
      at: [x + dx, 0, side * 13.2] as const,
      yaw: (i * 2 + j) * 1.3,
      scale: j === 0 ? 1 : 0.75,
    })),
  );
}

/** Three paper bats on the wall above every avenue door, facing the street. */
export function bats(): Piece[] {
  return stoops().flatMap(({ x, side }) =>
    [-2.2, 0.4, 2.4].map((dx, j) => ({
      at: [x + dx, 3.6 + (j % 2) * 0.9, side * (FACADE_Z - 0.1)] as const,
      yaw: side === 1 ? Math.PI : 0,
      scale: 1.2 - j * 0.15,
    })),
  );
}
