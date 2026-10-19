import * as THREE from "three";
import {
  BLUSHES,
  HIGHLIGHTERS,
  LIPS,
  makeupOf,
  type Look,
  type Makeup,
} from "../../../game/look.ts";
import { makeCanvas } from "../../canvas.ts";

/**
 * Paints the 3D doll's makeup. The face has a planar UV over the front of the
 * head (see art/doll/blender/build_doll.py), so everything here is drawn in
 * that square, 0..1 with y down, along landmarks Blender baked into the model:
 * lid lines, eye centers, cheeks, mouth corners and the nose tip. Lips and
 * cheeks also get masks (R lips, G cheeks) baked from the sculpt itself.
 */

export type Marks = {
  lLidUpper: [number, number][];
  lLidLower: [number, number][];
  rLidUpper: [number, number][];
  rLidLower: [number, number][];
  lEye: [number, number];
  rEye: [number, number];
  lCheek: [number, number];
  rCheek: [number, number];
  mouthL: [number, number];
  mouthR: [number, number];
  noseTip: [number, number];
};

const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) &&
  v.length === 2 &&
  v.every((n) => typeof n === "number" && Number.isFinite(n));
const isLine = (v: unknown): v is [number, number][] =>
  Array.isArray(v) && v.length > 1 && v.every(isPair);

/** The landmarks from the model's extras; null if the model is malformed. */
export function readMarks(json: unknown): Marks | null {
  if (typeof json !== "string") return null;
  let meta: unknown;
  try {
    meta = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof meta !== "object" || meta === null || !("marks" in meta))
    return null;
  const m: unknown = meta.marks;
  if (typeof m !== "object" || m === null) return null;
  const get = (k: string): unknown => (k in m ? Reflect.get(m, k) : null);
  const lines = ["lLidUpper", "lLidLower", "rLidUpper", "rLidLower"] as const;
  const points = [
    "lEye",
    "rEye",
    "lCheek",
    "rCheek",
    "mouthL",
    "mouthR",
    "noseTip",
  ] as const;
  if (!lines.every((k) => isLine(get(k)))) return null;
  if (!points.every((k) => isPair(get(k)))) return null;
  const line = (k: (typeof lines)[number]) => {
    const v = get(k);
    return isLine(v) ? v : [];
  };
  const point = (k: (typeof points)[number]): [number, number] => {
    const v = get(k);
    return isPair(v) ? v : [0, 0];
  };
  return {
    lLidUpper: line("lLidUpper"),
    lLidLower: line("lLidLower"),
    rLidUpper: line("rLidUpper"),
    rLidLower: line("rLidLower"),
    lEye: point("lEye"),
    rEye: point("rEye"),
    lCheek: point("lCheek"),
    rCheek: point("rCheek"),
    mouthL: point("mouthL"),
    mouthR: point("mouthR"),
    noseTip: point("noseTip"),
  };
}

const SIZE = 1024;

// how much shine each finish puts on the lips
const GLOSS: Record<Makeup["gloss"], number> = {
  matte: 0,
  satin: 0.35,
  glossy: 0.8,
  glass: 1.25,
};

/** A lipstick's base color and its deeper liner, from the closet swatch. */
function lipInk(id: Look["lips"]): [string, string] {
  const swatch = LIPS.find((l) => l.id === id)?.swatch ?? "#c98f86";
  const liner = `#${new THREE.Color(swatch).multiplyScalar(0.55).getHexString()}`;
  return [swatch, liner];
}

// Brow shapes: thickness (canvas units), arch lift, tail lift, color.
const BROW: Record<Look["brows"], [number, number, number, string]> = {
  "brows-y2k-thin": [0.009, 0.024, 0.006, "#24130e"],
  "brows-fox-snatched": [0.014, 0.014, 0.03, "#26150f"],
  "brows-sculpted-espresso": [0.019, 0.022, 0.004, "#22120c"],
  "brows-feathered-honey": [0.02, 0.016, 0.0, "#5e3c22"],
};

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = ([r, g, b]: readonly number[], a = 1) =>
  `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const mixRgb = (a: readonly number[], b: readonly number[], t: number) =>
  a.map((v, i) => v + (b[i] - v) * t);

let mask: Promise<HTMLImageElement> | null = null;
function loadMask() {
  mask ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the face mask"));
    img.src = "/models/doll-face.png";
  });
  return mask;
}

/** One channel of the baked mask as an alpha-only canvas, tinted. */
function channel(img: HTMLImageElement, ch: 0 | 1, color: string) {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const data = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = data.data;
  const [r, g, b] = hexRgb(color);
  for (let o = 0; o < d.length; o += 4) {
    const a = d[o + ch];
    d[o] = r;
    d[o + 1] = g;
    d[o + 2] = b;
    d[o + 3] = a;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: readonly number[],
  a: number,
) {
  ctx.save();
  ctx.translate(x * SIZE, y * SIZE);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * SIZE);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx * SIZE, -rx * SIZE, rx * 2 * SIZE, rx * 2 * SIZE);
  ctx.restore();
}

function path(ctx: CanvasRenderingContext2D, pts: readonly [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * SIZE, pts[0][1] * SIZE);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(
      pts[i][0] * SIZE,
      pts[i][1] * SIZE,
      mx * SIZE,
      my * SIZE,
    );
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0] * SIZE, last[1] * SIZE);
}

/** The lid line, inner corner first, with a wing flicked up and out. */
function winged(lid: readonly [number, number][], wing: number) {
  const a = lid[lid.length - 2];
  const b = lid[lid.length - 1];
  const out = Math.sign(b[0] - a[0]) || 1;
  return [...lid, [b[0] + out * wing, b[1] - wing * 0.75]] as [
    number,
    number,
  ][];
}

// [lift above the lash line, width, opacity] bands per shadow style
const SHADOW_BANDS: Record<Makeup["shadowStyle"], [number, number, number][]> =
  {
    wash: [
      [0.012, 0.03, 0.5],
      [0.006, 0.016, 0.65],
    ],
    "cut-crease": [
      [0.022, 0.008, 0.85],
      [0.008, 0.018, 0.55],
    ],
    smoky: [
      [0.014, 0.038, 0.6],
      [0.006, 0.022, 0.85],
      [0.002, 0.012, 0.9],
    ],
    halo: [
      [0.012, 0.03, 0.55],
      [0.008, 0.012, 0.0],
    ],
  };

function paintShadow(
  ctx: CanvasRenderingContext2D,
  lid: readonly [number, number][],
  color: string,
  style: Makeup["shadowStyle"],
) {
  const c = hexRgb(color);
  ctx.save();
  ctx.filter = style === "cut-crease" ? "blur(4px)" : "blur(10px)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // smoky goes deeper near the lashes
  const ink = style === "smoky" ? c.map((v) => v * 0.55) : c;
  for (const [lift, width, alpha] of SHADOW_BANDS[style]) {
    const raised = winged(lid, 0.018).map(
      ([x, y]) => [x, y - lift] as [number, number],
    );
    ctx.strokeStyle = rgba(lift < 0.005 ? ink : c, alpha);
    ctx.lineWidth = width * SIZE;
    path(ctx, raised);
    ctx.stroke();
  }
  ctx.restore();
  // halo: a bright spot in the middle of the lid
  if (style === "halo") {
    const mid = lid[Math.floor(lid.length / 2)];
    blob(ctx, mid[0], mid[1] - 0.01, 0.018, 0.01, [255, 240, 250], 0.7);
  }
  // shimmer on the brow bone
  const mid = lid[Math.floor(lid.length / 2)];
  blob(ctx, mid[0], mid[1] - 0.04, 0.03, 0.012, [255, 236, 246], 0.35);
}

// [width, wing length, blur px] per liner style
const LINER: Record<
  Exclude<Makeup["liner"], "none">,
  [number, number, number]
> = {
  thin: [0.004, 0.006, 1],
  winged: [0.0085, 0.03, 1],
  smoky: [0.011, 0.012, 5],
  graphic: [0.012, 0.045, 0.5],
};

function paintLiner(
  ctx: CanvasRenderingContext2D,
  lid: readonly [number, number][],
  style: Makeup["liner"],
) {
  if (style === "none") return;
  const [width, wing, blur] = LINER[style];
  ctx.save();
  ctx.strokeStyle = "rgba(14,6,10,0.95)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.filter = `blur(${blur}px)`;
  ctx.lineWidth = width * SIZE;
  path(ctx, winged(lid, wing));
  ctx.stroke();
  // graphic: a floating line above the crease, echoing the wing
  if (style === "graphic") {
    ctx.lineWidth = 0.004 * SIZE;
    path(
      ctx,
      winged(lid, wing).map(([x, y]) => [x, y - 0.03] as [number, number]),
    );
    ctx.stroke();
  }
  ctx.restore();
}

function paintBrow(
  ctx: CanvasRenderingContext2D,
  lid: readonly [number, number][],
  shape: [number, number, number, string],
  rand: () => number,
) {
  const [thick, arch, tail, color] = shape;
  const ink = hexRgb(color);
  const n = lid.length;
  const inner = lid[0];
  const outer = lid[n - 1];
  const out = Math.sign(outer[0] - inner[0]) || 1;
  // brow line: from just above the inner corner, arching, past the outer end
  const pt = (t: number): [number, number] => {
    const x = inner[0] - out * 0.012 + (outer[0] - inner[0] + out * 0.03) * t;
    const lidY = inner[1] + (outer[1] - inner[1]) * t;
    const lift =
      0.058 +
      arch * Math.sin(Math.PI * Math.min(t / 0.7, 1)) * (t < 0.7 ? 1 : 0) +
      tail * t;
    const drop = t > 0.7 ? (t - 0.7) * 0.05 : 0;
    return [x, lidY - lift + drop];
  };
  ctx.save();
  ctx.lineCap = "round";
  // soft fill under the hairs
  ctx.filter = "blur(3px)";
  ctx.strokeStyle = rgba(ink, 0.35);
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const [x, y] = pt(t);
    const w = thick * (1 - 0.65 * t) * SIZE;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x * SIZE, y * SIZE);
    const [x2, y2] = pt(Math.min(1, t + 0.05));
    ctx.lineTo(x2 * SIZE, y2 * SIZE);
    ctx.stroke();
  }
  ctx.filter = "none";
  // individual hairs: upward at the front, sweeping outward along the tail
  for (let i = 0; i < 90; i++) {
    const t = rand();
    const [x, y] = pt(t);
    const w = thick * (1 - 0.6 * t);
    const off = (rand() - 0.5) * w;
    const ang = (-Math.PI / 2) * (1 - t) + (t * Math.PI) / 12;
    const len = (0.008 + rand() * 0.006) * (1 - 0.4 * t);
    ctx.strokeStyle = rgba(ink, 0.55 + rand() * 0.35);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x * SIZE, (y + off) * SIZE);
    ctx.lineTo(
      (x + out * Math.cos(ang) * len * (t < 0.2 ? 0.3 : 1)) * SIZE,
      (y + off + Math.sin(ang) * len) * SIZE,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** The face texture: skin, contour, blush, shadow, liner, brows, lips. */
export async function paintFace(look: Look, marks: Marks) {
  const img = await loadMask();
  const makeup = makeupOf(look);
  const skin = hexRgb(look.skin);
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);
  ctx.fillStyle = rgba(skin);
  ctx.fillRect(0, 0, SIZE, SIZE);

  // living skin is never one flat color: faint mottling everywhere, warmer
  // where blood sits close (nose, cheeks, chin, lips' edge), a cool soft
  // shadow under the eyes
  let grain = 99;
  const noise = () => {
    grain = (grain * 16807) % 2147483647;
    return grain / 2147483647;
  };
  const warm = mixRgb(skin, [205, 92, 86], 0.5);
  for (let i = 0; i < 260; i++) {
    const tint = noise() < 0.5 ? warm : skin.map((v) => v * 0.9);
    const r = 0.01 + noise() * 0.03;
    blob(ctx, noise(), noise(), r, r * (0.6 + noise() * 0.8), tint, 0.07);
  }
  const { noseTip: nose, lCheek: lc, rCheek: rc, lEye: le, rEye: re } = marks;
  blob(ctx, nose[0], nose[1] - 0.01, 0.035, 0.028, warm, 0.22);
  for (const c of [lc, rc])
    blob(ctx, c[0], c[1] + 0.005, 0.07, 0.05, warm, 0.16);
  blob(ctx, 0.5, marks.mouthL[1] + 0.07, 0.05, 0.03, warm, 0.12);
  const under = mixRgb(skin, [110, 80, 100], 0.35);
  for (const e of [le, re])
    blob(ctx, e[0], e[1] + 0.035, 0.045, 0.02, under, 0.3);

  // contour and highlight, faded well before the edge of the square so the
  // face meets the unpainted body skin without a seam
  const dark = skin.map((v) => v * 0.8);
  const light = mixRgb(skin, [255, 244, 236], 0.3);
  const { lCheek, rCheek, noseTip, mouthL, mouthR, lEye, rEye } = marks;
  blob(ctx, 0.5, 0.18, 0.16, 0.08, light, 0.45);
  blob(ctx, noseTip[0], noseTip[1] - 0.08, 0.012, 0.07, light, 0.55);
  blob(
    ctx,
    noseTip[0],
    noseTip[1] - 0.005,
    0.012,
    0.008,
    [255, 255, 255],
    0.35,
  );
  blob(ctx, 0.5, 0.74, 0.03, 0.02, light, 0.45);
  for (const c of [lCheek, rCheek]) {
    const out = c[0] > 0.5 ? 1 : -1;
    blob(ctx, c[0] + out * 0.04, c[1] + 0.05, 0.05, 0.11, dark, 0.35);
    blob(ctx, c[0] - out * 0.01, c[1] - 0.045, 0.04, 0.018, light, 0.5);
  }

  // blush in the chosen color, a touch deeper on deeper skin
  const deep = Math.max(0, Math.min(1, (200 - skin[0]) / 110));
  const blushSwatch = BLUSHES.find((b) => b.id === makeup.blush)?.swatch;
  if (makeup.blush !== "none" && blushSwatch) {
    const tone = mixRgb(hexRgb(blushSwatch), [150, 30, 70], deep * 0.35);
    const cheekMask = channel(
      img,
      1,
      `#${tone.map((v) => (v | 0).toString(16).padStart(2, "0")).join("")}`,
    );
    ctx.save();
    ctx.globalAlpha = { soft: 0.16, medium: 0.28, bold: 0.42 }[
      makeup.blushStrength
    ];
    ctx.filter = "blur(22px)";
    ctx.drawImage(cheekMask, 0, 0);
    ctx.restore();
  }

  // freckles: a sprinkle across the nose bridge and the tops of the cheeks,
  // the same pattern every time for the same face
  if (makeup.freckles !== "none") {
    const fleck = mixRgb(skin, [110, 55, 35], 0.5);
    let f = 4242;
    const rand = () => {
      f = (f * 16807) % 2147483647;
      return f / 2147483647;
    };
    const count = makeup.freckles === "lots" ? 120 : 45;
    for (let i = 0; i < count; i++) {
      // spread across the band between the cheeks, thickest over the nose
      const t = rand() * 2 - 1;
      const x = noseTip[0] + t * (Math.abs(lCheek[0] - rCheek[0]) / 2) * 1.1;
      const y = noseTip[1] - 0.05 + (rand() - 0.5) * 0.07 + Math.abs(t) * 0.02;
      const r = 0.0022 + rand() * 0.0028;
      blob(ctx, x, y, r, r * (0.8 + rand() * 0.4), fleck, 0.35 + rand() * 0.3);
    }
  }

  // highlighter: cheekbone tops, nose bridge, cupid's bow and brow bone
  const glow = HIGHLIGHTERS.find((h) => h.id === makeup.highlight)?.swatch;
  if (makeup.highlight !== "none" && glow) {
    const g = hexRgb(glow);
    for (const c of [lCheek, rCheek]) {
      const out = c[0] > 0.5 ? 1 : -1;
      blob(ctx, c[0] - out * 0.005, c[1] - 0.05, 0.055, 0.02, g, 0.32);
    }
    blob(ctx, noseTip[0], noseTip[1] - 0.09, 0.009, 0.06, g, 0.3);
    blob(
      ctx,
      (mouthL[0] + mouthR[0]) / 2,
      mouthL[1] - 0.035,
      0.012,
      0.006,
      g,
      0.6,
    );
  }

  paintShadow(ctx, marks.lLidUpper, look.shadow, makeup.shadowStyle);
  paintShadow(ctx, marks.rLidUpper, look.shadow, makeup.shadowStyle);
  // lower lash line smudge
  ctx.save();
  ctx.filter = "blur(2px)";
  ctx.strokeStyle = rgba(
    hexRgb(look.shadow).map((v) => v * 0.7),
    0.5,
  );
  ctx.lineWidth = 0.004 * SIZE;
  for (const lid of [marks.lLidLower, marks.rLidLower]) {
    path(ctx, lid);
    ctx.stroke();
  }
  ctx.restore();
  paintLiner(ctx, marks.lLidUpper, makeup.liner);
  paintLiner(ctx, marks.rLidUpper, makeup.liner);

  let seed = 1234;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  paintBrow(ctx, marks.lLidUpper, BROW[look.brows], rand);
  paintBrow(ctx, marks.rLidUpper, BROW[look.brows], rand);

  // freckles on lighter skin, and a beauty mark on every skin
  const lum = (skin[0] + skin[1] + skin[2]) / 3;
  const density = Math.max(0, Math.min(1, (lum - 165) / 50));
  const freckle = mixRgb(skin, [96, 52, 32], 0.55);
  for (let i = 0; i < Math.round(density * 40); i++) {
    const c = i % 2 ? lCheek : rCheek;
    const x = (c[0] + 0.5) / 2 + (rand() - 0.5) * 0.14;
    const y = noseTip[1] - 0.04 + rand() * 0.07;
    blob(ctx, x, y, 0.003, 0.003, freckle, 0.5 * density);
  }
  blob(
    ctx,
    mouthR[0] - 0.02,
    mouthR[1] - 0.045,
    0.0035,
    0.0035,
    [64, 32, 26],
    0.9,
  );

  // lips: color through the sculpted lip mask, a deeper liner edge, gloss
  const [base, liner] = lipInk(look.lips);
  const gloss = GLOSS[makeup.gloss];
  // the liner is a soft deepening at the lip's edge, not a drawn outline
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.filter = "blur(1.5px)";
  ctx.drawImage(channel(img, 0, liner), 0, 0);
  ctx.restore();
  ctx.save();
  ctx.filter = "blur(2px)";
  ctx.globalAlpha = 0.85;
  const inset = channel(img, 0, base);
  const mx = (mouthL[0] + mouthR[0]) / 2;
  const my = (mouthL[1] + mouthR[1]) / 2;
  ctx.translate(mx * SIZE, my * SIZE);
  ctx.scale(0.94, 0.88);
  ctx.translate(-mx * SIZE, -my * SIZE);
  ctx.drawImage(inset, 0, 0);
  ctx.restore();
  blob(ctx, mx - 0.004, my + 0.022, 0.03, 0.007, [255, 255, 255], 0.45 * gloss);
  blob(ctx, mx - 0.012, my + 0.018, 0.007, 0.003, [255, 255, 255], 0.9 * gloss);
  // keep the eyes' own position free of paint: the eyeballs sit there
  void lEye;
  void rEye;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = 8;
  return tex;
}

/** Sclera, iris and pupil for the eyeballs' front planar UV. */
export function paintIris(color = "#6b3f22") {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.fillStyle = "#f4ece8";
  ctx.fillRect(0, 0, S, S);
  const c = S / 2;
  const iris = hexRgb(color);
  const g = ctx.createRadialGradient(c, c, 0, c, c, S * 0.27);
  g.addColorStop(0, rgba(mixRgb(iris, [255, 210, 120], 0.35)));
  g.addColorStop(0.55, rgba(iris));
  g.addColorStop(0.9, rgba(iris.map((v) => v * 0.55)));
  g.addColorStop(1, "rgba(20,10,8,1)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, S * 0.27, 0, Math.PI * 2);
  ctx.fill();
  // fibers
  ctx.strokeStyle = rgba(mixRgb(iris, [255, 255, 255], 0.25), 0.35);
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * S * 0.08, c + Math.sin(a) * S * 0.08);
    ctx.lineTo(c + Math.cos(a) * S * 0.18, c + Math.sin(a) * S * 0.18);
    ctx.stroke();
  }
  ctx.fillStyle = "#070304";
  ctx.beginPath();
  ctx.arc(c, c, S * 0.085, 0, Math.PI * 2);
  ctx.fill();
  // catchlights: the sparkle that makes a doll's eyes read as alive
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(c - S * 0.06, c - S * 0.07, S * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.arc(c + S * 0.07, c + S * 0.06, S * 0.015, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  return tex;
}

/** Lash strands: roots at the bottom of the card, tips at the top. */
export function paintLashes() {
  const W = 512,
    H = 64;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(10,5,8,1)";
  let seed = 77;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // real lashes: dense at the root, tapering to fine tips, short at the
  // inner corner and longest past the middle (x grows to the outer corner),
  // gathered into little clumps rather than combed evenly
  const count = 120;
  for (let i = 0; i < count; i++) {
    const u = (i + rand() * 0.8) / count;
    const x = u * W;
    const len =
      H * (0.35 + 0.6 * Math.sin(Math.min(1, u * 1.25) * Math.PI * 0.85));
    const clump = Math.floor(i / 4) * 4 + 1.5;
    const tipX = x + (clump * (W / count) - x) * 0.6 + (u - 0.25) * 26;
    const tipY = H - len * (0.85 + rand() * 0.15);
    const root = 1.4 + rand() * 0.8;
    // a tapered curve: the root's width narrowing to a point at the tip
    ctx.beginPath();
    ctx.moveTo(x - root, H);
    ctx.quadraticCurveTo(
      x - root * 0.6 + (tipX - x) * 0.2,
      H - len * 0.55,
      tipX,
      tipY,
    );
    ctx.quadraticCurveTo(
      x + root * 0.6 + (tipX - x) * 0.25,
      H - len * 0.5,
      x + root,
      H,
    );
    ctx.closePath();
    ctx.fill();
  }
  // the lash line itself: a soft dark band at the roots
  ctx.fillRect(0, H - 3, W, 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  return tex;
}
