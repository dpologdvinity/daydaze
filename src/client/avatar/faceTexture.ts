import * as THREE from "three";
import { makeCanvas } from "../canvas.ts";

// The face canvas is a window onto the 1024px template's coordinate space.
// Head UVs are planar-projected into the same window (see Doll.tsx), so
// everything below is authored in template pixels.
export const FACE_X0 = 262;
export const FACE_Y0 = 60;
export const FACE_W = 500;
export const FACE_H = 710;
const SCALE = 1.6;

// Mean skin colour of the golden template, used to re-tint the cropped art.
const TEMPLATE_SKIN: [number, number, number] = [240, 176, 104];

const EYE_L = { x: 381, y: 463, rx: 112, ry: 64 };
const EYE_R = { x: 644, y: 463, rx: 112, ry: 64 };
const NOSE = { x: 512, y: 556, rx: 46, ry: 62 };

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(name: string) {
  let p = images.get(name);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${name}`));
      img.src = `/doll/${name}.png`;
    });
    images.set(name, p);
  }
  return p;
}

// sRGB bytes straight from the hex (THREE.Color would hand back linear values)
function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = ([r, g, b]: number[], a = 1) =>
  `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const mix = (a: number[], b: number[], t: number) =>
  a.map((v, i) => v + (b[i] - v) * t);
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function ellipseD(x: number, y: number, e: typeof EYE_L) {
  return Math.hypot((x - e.x) / e.rx, (y - e.y) / e.ry);
}

// Crops eyes + nose from the template and re-tints the skin-coloured pixels.
// A pixel counts as skin when it is (nearly) a scalar multiple of the
// template skin colour, which keeps whites, irises and liner untouched.
let featureCache: { key: string; canvas: HTMLCanvasElement } | null = null;
async function featureLayer(skin: [number, number, number]) {
  const key = skin.join(",");
  if (featureCache?.key === key) return featureCache.canvas;
  const img = await loadImage("face-template");
  const x0 = 268,
    y0 = 392,
    w = 494,
    h = 230;
  const { canvas: c, ctx } = makeCanvas(w, h);
  ctx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const T = TEMPLATE_SKIN;
  const TT = T[0] * T[0] + T[1] * T[1] + T[2] * T[2];
  const ratio = [skin[0] / T[0], skin[1] / T[1], skin[2] / T[2]];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      const x = x0 + i,
        y = y0 + j;
      const eye = Math.min(ellipseD(x, y, EYE_L), ellipseD(x, y, EYE_R));
      const nose = ellipseD(x, y, NOSE);
      let m = Math.max(1 - smooth(0.78, 1, eye), 1 - smooth(0.55, 1, nose));
      m *= smooth(270, 282, x) * (1 - smooth(744, 756, x));
      const r = d[o],
        g = d[o + 1],
        b = d[o + 2];
      const k = (r * T[0] + g * T[1] + b * T[2]) / TT;
      const res =
        Math.hypot(r - k * T[0], g - k * T[1], b - k * T[2]) /
        (Math.hypot(r, g, b) + 8);
      const wSkin = 1 - smooth(0.1, 0.28, res);
      d[o] = r + (r * ratio[0] - r) * wSkin;
      d[o + 1] = g + (g * ratio[1] - g) * wSkin;
      d[o + 2] = b + (b * ratio[2] - b) * wSkin;
      d[o + 3] = d[o + 3] * m;
    }
  }
  ctx.putImageData(data, 0, 0);
  featureCache = { key, canvas: c };
  return c;
}

// Brow art ships with a pale halo; keep only the dark hair strokes.
function inkOnly(img: HTMLImageElement) {
  const { canvas: c, ctx } = makeCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let o = 0; o < d.length; o += 4) {
    const lum = (d[o] * 0.3 + d[o + 1] * 0.59 + d[o + 2] * 0.11) / 255;
    d[o + 3] *= 1 - smooth(0.55, 0.85, lum);
    d[o] *= 0.45;
    d[o + 1] *= 0.4;
    d[o + 2] *= 0.42;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

type FaceOpts = { skin: string; lips: string; brows: string; shadow: string };

function paintBase(
  ctx: CanvasRenderingContext2D,
  skin: [number, number, number],
) {
  ctx.fillStyle = rgba(skin);
  ctx.fillRect(0, 0, 1024, 1024);
  const dark = skin.map((v) => v * 0.78);
  const light = mix(skin, [255, 240, 230], 0.22);
  // forehead + chin highlight, temple/jaw contour
  const hl = (x: number, y: number, r: number, c: number[], a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  hl(512, 300, 170, light, 0.55);
  hl(512, 718, 50, light, 0.5);
  hl(262, 560, 120, dark, 0.55);
  hl(762, 560, 120, dark, 0.55);
  hl(512, 790, 160, dark, 0.35);
  // blush, warmer and more saturated on deeper skin
  const blush = mix([255, 92, 140], [200, 40, 90], smooth(200, 90, skin[0]));
  hl(356, 600, 86, blush, 0.42);
  hl(668, 600, 86, blush, 0.42);
}

// Lid colour as a per-pixel multiply on skin-like pixels only, so it never
// stains the whites of the eyes and needs no hard clip.
function paintShadow(
  ctx: CanvasRenderingContext2D,
  skin: [number, number, number],
  shadow: string,
) {
  const sh = hexRgb(shadow);
  const S = skin;
  const SS = S[0] * S[0] + S[1] * S[1] + S[2] * S[2];
  const top = Math.round((330 - FACE_Y0) * SCALE);
  const h = Math.round(200 * SCALE);
  const w = ctx.canvas.width;
  const data = ctx.getImageData(0, top, w, h);
  const d = data.data;
  for (let j = 0; j < h; j++) {
    const ty = (top + j) / SCALE + FACE_Y0;
    for (let i = 0; i < w; i++) {
      const tx = i / SCALE + FACE_X0;
      let m = 0;
      for (const e of [EYE_L, EYE_R]) {
        const dir = e.x < 512 ? -1 : 1;
        // lid crescent that sweeps up and out into a wing
        const u = (tx - e.x - dir * 18) / 112;
        const v = (ty - (e.y - 26 - Math.max(0, u * dir) * 26)) / 34;
        m = Math.max(m, Math.exp(-(u * u * 1.4 + v * v)));
      }
      if (m < 0.01) continue;
      const o = (j * w + i) * 4;
      const r = d[o],
        g = d[o + 1],
        b = d[o + 2];
      const k = (r * S[0] + g * S[1] + b * S[2]) / SS;
      const res =
        Math.hypot(r - k * S[0], g - k * S[1], b - k * S[2]) /
        (Math.hypot(r, g, b) + 8);
      const a = m * (1 - smooth(0.06, 0.2, res)) * 0.92;
      d[o] = r * (1 + ((sh[0] / 255) * 1.15 - 1) * a);
      d[o + 1] = g * (1 + ((sh[1] / 255) * 1.15 - 1) * a);
      d[o + 2] = b * (1 + ((sh[2] / 255) * 1.15 - 1) * a);
    }
  }
  ctx.putImageData(data, 0, top);
  // brow-bone shimmer
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const e of [EYE_L, EYE_R]) {
    const g = ctx.createRadialGradient(e.x, e.y - 70, 0, e.x, e.y - 70, 60);
    g.addColorStop(0, "rgba(255,230,245,0.2)");
    g.addColorStop(1, "rgba(255,230,245,0)");
    ctx.fillStyle = g;
    ctx.fillRect(e.x - 70, e.y - 140, 140, 140);
  }
  ctx.restore();
}

function paintClosedEyes(
  ctx: CanvasRenderingContext2D,
  skin: [number, number, number],
  shadow: string,
) {
  for (const e of [EYE_L, EYE_R]) {
    const dir = e.x < 512 ? -1 : 1;
    const g = ctx.createRadialGradient(e.x, e.y, 10, e.x, e.y, e.rx);
    g.addColorStop(0, rgba(skin));
    g.addColorStop(0.8, rgba(skin));
    g.addColorStop(1, rgba(skin, 0));
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(1, e.ry / e.rx);
    ctx.beginPath();
    ctx.arc(0, 0, e.rx * 0.96, 0, Math.PI * 2);
    ctx.translate(-e.x, -e.y);
    ctx.fill();
    ctx.restore();
  }
  paintShadow(ctx, skin, shadow);
  ctx.strokeStyle = "#120609";
  ctx.lineCap = "round";
  for (const e of [EYE_L, EYE_R]) {
    const dir = e.x < 512 ? -1 : 1;
    const inner = [e.x - dir * 104, e.y + 6];
    const outer = [e.x + dir * 100, e.y - 8];
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(inner[0], inner[1]);
    ctx.quadraticCurveTo(e.x, e.y + 34, outer[0], outer[1]);
    ctx.lineTo(outer[0] + dir * 22, outer[1] - 22);
    ctx.stroke();
    ctx.lineWidth = 4;
    for (let i = 0; i < 9; i++) {
      const t = 0.25 + i * 0.085;
      const px =
        (1 - t) * (1 - t) * inner[0] + 2 * (1 - t) * t * e.x + t * t * outer[0];
      const py =
        (1 - t) * (1 - t) * inner[1] +
        2 * (1 - t) * t * (e.y + 34) +
        t * t * outer[1];
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(
        px + dir * 6,
        py + 14,
        px + dir * (14 + t * 14),
        py + 18 - t * 8,
      );
      ctx.stroke();
    }
  }
}

async function paint(opts: FaceOpts, closed: boolean) {
  const skin = hexRgb(opts.skin);
  const [features, lips, brows] = await Promise.all([
    featureLayer(skin),
    loadImage(opts.lips),
    loadImage(opts.brows).then(inkOnly),
  ]);
  const { canvas: c, ctx } = makeCanvas(
    Math.round(FACE_W * SCALE),
    Math.round(FACE_H * SCALE),
  );
  ctx.setTransform(SCALE, 0, 0, SCALE, -FACE_X0 * SCALE, -FACE_Y0 * SCALE);
  paintBase(ctx, skin);
  ctx.drawImage(features, 268, 392);
  if (closed) paintClosedEyes(ctx, skin, opts.shadow);
  else paintShadow(ctx, skin, opts.shadow);
  ctx.drawImage(brows, 512 - 226, 326, 452, 130);
  const lw = 156,
    lh = (lw * lips.height) / lips.width;
  ctx.drawImage(lips, 512 - lw / 2, 668 - lh / 2, lw, lh);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export async function buildFaceTextures(opts: FaceOpts) {
  const [open, closed] = await Promise.all([
    paint(opts, false),
    paint(opts, true),
  ]);
  return { open, closed };
}
