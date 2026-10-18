import * as THREE from "three";
import { surface } from "../../city/worldTexture.ts";
import type { Batch } from "./batch.ts";
import { canvasTex, GOLD, hdr } from "./materials.ts";
import { inFrame, type Frame } from "./place.ts";

// Small set dressing for every room, added to a room's Batch so a wall of
// posters, a row of plants or a whole diner's condiments costs one draw call
// per material. Every material here is shared, so pieces from different
// helpers in one Batch merge too.

const POSTER_COLS = 4;
const POSTER_ROWS = 2;

// Eight poster designs in one atlas: gig bills, a sunset, a cocktail, a
// palm, stripes, a star, a heart and a moon.
function drawPosters(ctx: CanvasRenderingContext2D) {
  const W = 128;
  const H = 128;
  const designs: ((x: number, y: number) => void)[] = [
    (x, y) => {
      ctx.fillStyle = "#ff2f9a";
      ctx.fillRect(x, y, W, H);
      ctx.fillStyle = "#ffe14d";
      ctx.font = "bold 30px sans-serif";
      ctx.fillText("LIVE", x + 14, y + 44);
      ctx.fillStyle = "#1a0820";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("FRI · SAT · SUN", x + 14, y + 70);
      ctx.fillRect(x + 14, y + 84, 100, 4);
      ctx.fillText("DOORS 9PM", x + 14, y + 108);
    },
    (x, y) => {
      const g = ctx.createLinearGradient(0, y, 0, y + H);
      g.addColorStop(0, "#3a0a6a");
      g.addColorStop(0.55, "#ff6a3d");
      g.addColorStop(1, "#ffd27a");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, W, H);
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.arc(x + 64, y + 78, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a0838";
      for (let k = 0; k < 5; k++) ctx.fillRect(x, y + 92 + k * 7, W, 3);
    },
    (x, y) => {
      ctx.fillStyle = "#12324a";
      ctx.fillRect(x, y, W, H);
      ctx.strokeStyle = "#7af0ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 34, y + 30);
      ctx.lineTo(x + 94, y + 30);
      ctx.lineTo(x + 64, y + 70);
      ctx.closePath();
      ctx.moveTo(x + 64, y + 70);
      ctx.lineTo(x + 64, y + 100);
      ctx.moveTo(x + 46, y + 102);
      ctx.lineTo(x + 82, y + 102);
      ctx.stroke();
      ctx.fillStyle = "#ff5aa8";
      ctx.beginPath();
      ctx.arc(x + 82, y + 30, 8, 0, Math.PI * 2);
      ctx.fill();
    },
    (x, y) => {
      ctx.fillStyle = "#ffcf5a";
      ctx.fillRect(x, y, W, H);
      ctx.fillStyle = "#1f6b4a";
      ctx.fillRect(x + 60, y + 50, 8, 70);
      for (let k = 0; k < 6; k++) {
        ctx.save();
        ctx.translate(x + 64, y + 50);
        ctx.rotate((k / 6) * Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(22, 0, 24, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
    (x, y) => {
      const cols = ["#ff2f6a", "#ffb02e", "#3dd6a0", "#5ab0ff", "#c04dff"];
      cols.forEach((c, k) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, y + (k * H) / cols.length, W, H / cols.length);
      });
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("SUMMER", x + 18, y + 72);
    },
    (x, y) => {
      ctx.fillStyle = "#0e0a24";
      ctx.fillRect(x, y, W, H);
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 18 : 44;
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(x + 64 + Math.cos(a) * r, y + 60 + Math.sin(a) * r);
      }
      ctx.fill();
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("ALL STARS", x + 30, y + 120);
    },
    (x, y) => {
      ctx.fillStyle = "#ffd6e8";
      ctx.fillRect(x, y, W, H);
      ctx.fillStyle = "#e0185a";
      ctx.beginPath();
      ctx.moveTo(x + 64, y + 104);
      ctx.bezierCurveTo(x + 4, y + 60, x + 30, y + 14, x + 64, y + 42);
      ctx.bezierCurveTo(x + 98, y + 14, x + 124, y + 60, x + 64, y + 104);
      ctx.fill();
    },
    (x, y) => {
      const g = ctx.createRadialGradient(x + 64, y + 64, 4, x + 64, y + 64, 90);
      g.addColorStop(0, "#5a3aa8");
      g.addColorStop(1, "#120628");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, W, H);
      ctx.fillStyle = "#fff4c8";
      ctx.beginPath();
      ctx.arc(x + 70, y + 56, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#120628";
      ctx.beginPath();
      ctx.arc(x + 84, y + 46, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff4c8";
      for (let k = 0; k < 14; k++)
        ctx.fillRect(x + ((k * 37) % W), y + ((k * 53) % H), 2, 2);
    },
  ];
  designs.forEach((draw, i) =>
    draw((i % POSTER_COLS) * W, Math.floor(i / POSTER_COLS) * H),
  );
}

/** Poster art; it glows a little, so it reads in a dark club too. */
const POSTER_ART = canvasTex(128 * POSTER_COLS, 128 * POSTER_ROWS, drawPosters);
export const POSTER = new THREE.MeshStandardMaterial({
  map: POSTER_ART,
  emissiveMap: POSTER_ART,
  emissive: "#ffffff",
  emissiveIntensity: 0.35,
  roughness: 0.45,
});
export const FRAME_BLACK = new THREE.MeshStandardMaterial({
  color: "#141016",
  roughness: 0.4,
  metalness: 0.3,
});
export const POSTER_COUNT = POSTER_COLS * POSTER_ROWS;

const FOLIAGE = new THREE.MeshStandardMaterial({
  color: "#2f7a44",
  roughness: 0.6,
});
const SOIL = new THREE.MeshStandardMaterial({ color: "#2a1a10" });
const WHITE = new THREE.MeshStandardMaterial({
  color: "#f4f0ea",
  roughness: 0.7,
});
const CHROME = new THREE.MeshStandardMaterial({
  color: "#e8eaf0",
  metalness: 1,
  roughness: 0.18,
});
const DARK = new THREE.MeshStandardMaterial({
  color: "#1a1418",
  roughness: 0.5,
});
const KETCHUP = new THREE.MeshStandardMaterial({
  color: "#c8141e",
  roughness: 0.3,
});
const MUSTARD = new THREE.MeshStandardMaterial({
  color: "#f2c21a",
  roughness: 0.3,
});
const WIRE = new THREE.MeshBasicMaterial({ color: "#1a1418" });

const bulbs = new Map<string, THREE.MeshBasicMaterial>();
/** A bright, unlit bulb color, shared per hex so every bulb merges. */
export function bulb(hex: string) {
  let m = bulbs.get(hex);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color: hdr(hex, 2.2),
      toneMapped: false,
    });
    bulbs.set(hex, m);
  }
  return m;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const POT = new THREE.CylinderGeometry(1, 0.75, 1, 12);
const BALL = new THREE.SphereGeometry(1, 6, 4);
const LEAF = new THREE.SphereGeometry(1, 6, 4);

/**
 * A framed poster on a wall, art `design` (0 to 7) from the shared atlas.
 * It faces +z in `frame` (x along the wall, y up); `w` by `h` meters.
 */
export function poster(
  b: Batch,
  frame: Frame,
  design: number,
  w = 0.6,
  h = 0.8,
  border: THREE.Material = FRAME_BLACK,
) {
  const at = inFrame(b, frame);
  at.add(BOX, border, { scale: [w + 0.06, h + 0.06, 0.03] });
  const art = new THREE.PlaneGeometry(w, h);
  const d = ((design % POSTER_COUNT) + POSTER_COUNT) % POSTER_COUNT;
  const col = d % POSTER_COLS;
  const row = Math.floor(d / POSTER_COLS);
  const uv = art.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (col + uv.getX(i)) / POSTER_COLS,
      1 - (row + 1 - uv.getY(i)) / POSTER_ROWS,
    );
  at.add(art, POSTER, { position: [0, 0, 0.017] });
}

/** A potted plant standing at `frame`, about `s` meters tall. */
export function plant(b: Batch, frame: Frame, s = 1, pot?: THREE.Material) {
  const at = inFrame(b, frame);
  const potMat =
    pot ?? surface("clay_roof_tiles", { scale: 3, color: "#c86a4a" });
  at.add(POT, potMat, {
    position: [0, 0.16 * s, 0],
    scale: [0.16 * s, 0.32 * s, 0.16 * s],
  });
  at.add(CYL, SOIL, {
    position: [0, 0.31 * s, 0],
    scale: [0.14 * s, 0.02, 0.14 * s],
  });
  const seed = (frame.x ?? 0) * 3.1 + (frame.z ?? 0) * 1.7;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + seed;
    const h = (0.35 + ((i * 37) % 7) * 0.04) * s;
    const tilt = 0.35 + (i % 3) * 0.2;
    at.add(LEAF, FOLIAGE, {
      position: [
        Math.cos(a) * 0.1 * s,
        0.32 * s + h * 0.8,
        Math.sin(a) * 0.1 * s,
      ],
      rotation: [Math.sin(a) * tilt, -a, -Math.cos(a) * tilt],
      scale: [0.07 * s, h, 0.025 * s],
    });
  }
}

/**
 * A string of bulbs sagging from `a` to `b` (meters, room space), `count`
 * bulbs in `color` on a dark wire.
 */
export function stringLights(
  batch: Batch,
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  count = 12,
  color = "#ffd27a",
  sag = 0.35,
) {
  const p = new THREE.Vector3();
  const prev = new THREE.Vector3();
  const mat = bulb(color);
  for (let i = 0; i <= count + 1; i++) {
    const t = i / (count + 1);
    p.set(
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag,
      a[2] + (b[2] - a[2]) * t,
    );
    if (i > 0) {
      const len = p.distanceTo(prev);
      const mid = p.clone().add(prev).multiplyScalar(0.5);
      const seg = BOX.clone().scale(0.012, 0.012, len);
      seg.lookAt(p.clone().sub(prev));
      batch.add(seg, WIRE, { position: [mid.x, mid.y, mid.z] });
    }
    if (i > 0 && i <= count)
      batch.add(BALL, mat, {
        position: [p.x, p.y - 0.05, p.z],
        scale: [0.035, 0.05, 0.035],
      });
    prev.copy(p);
  }
}

/**
 * A diner table's clutter, centered at `frame` on the tabletop: a chrome
 * napkin holder, salt and pepper, ketchup and mustard, and a menu card.
 */
export function tableSetting(b: Batch, frame: Frame) {
  const at = inFrame(b, frame);
  at.add(BOX, CHROME, { position: [0, 0.006, 0], scale: [0.12, 0.012, 0.07] });
  at.add(BOX, WHITE, { position: [0, 0.06, 0], scale: [0.1, 0.09, 0.05] });
  for (const z of [-0.03, 0.03])
    at.add(BOX, CHROME, { position: [0, 0.06, z], scale: [0.11, 0.1, 0.004] });
  at.add(CYL, WHITE, {
    position: [0.12, 0.035, 0.02],
    scale: [0.018, 0.07, 0.018],
  });
  at.add(CYL, DARK, {
    position: [0.16, 0.035, 0.02],
    scale: [0.018, 0.07, 0.018],
  });
  for (const x of [0.12, 0.16])
    at.add(CYL, CHROME, {
      position: [x, 0.075, 0.02],
      scale: [0.019, 0.015, 0.019],
    });
  at.add(CYL, KETCHUP, {
    position: [-0.13, 0.08, 0.01],
    scale: [0.025, 0.16, 0.025],
  });
  at.add(CYL, MUSTARD, {
    position: [-0.19, 0.08, 0.01],
    scale: [0.025, 0.16, 0.025],
  });
  for (const x of [-0.13, -0.19])
    at.add(CYL, WHITE, {
      position: [x, 0.175, 0.01],
      scale: [0.01, 0.03, 0.01],
    });
  // a menu card folded into a tent
  for (const s of [-1, 1])
    at.add(BOX, POSTER, {
      position: [0.02, 0.06, -0.09 + s * 0.018],
      rotation: [s * 0.3, 0, 0],
      scale: [0.1, 0.12, 0.004],
    });
}

/** A rug of `w` by `d` meters at `frame`, a woven pattern tinted `color`. */
export function rug(
  b: Batch,
  frame: Frame,
  w: number,
  d: number,
  color: string,
) {
  const at = inFrame(b, frame);
  at.add(BOX, surface("fabric_pattern_05", { scale: 1.5, color }), {
    position: [0, 0.006, 0],
    scale: [w, 0.012, d],
  });
  at.add(BOX, GOLD, {
    position: [0, 0.004, 0],
    scale: [w + 0.06, 0.008, d + 0.06],
  });
}

/** A shelf board of `w` meters at `frame`, its top at the frame's y. */
export function shelf(
  b: Batch,
  frame: Frame,
  w: number,
  mat: THREE.Material,
  depth = 0.26,
) {
  inFrame(b, frame).add(BOX, mat, {
    position: [0, -0.015, 0],
    scale: [w, 0.03, depth],
  });
}
