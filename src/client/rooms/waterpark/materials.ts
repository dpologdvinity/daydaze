import * as THREE from "three";
import { gradientMap } from "../../avatar/toon.ts";
import { makeCanvas } from "../../canvas.ts";
import { canvasTex } from "../shared/materials.ts";

const cache = new Map<string, THREE.MeshToonMaterial>();

/** A shared flat toon material per color, like the doll's shading. */
export function toon(hex: string) {
  let m = cache.get(hex);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color: hex, gradientMap });
    cache.set(hex, m);
  }
  return m;
}

/** Toon shading for `Props` meshes: colors come from the vertex colors. */
export const PROPS = new THREE.MeshToonMaterial({
  vertexColors: true,
  gradientMap,
});

/** Vertical candy stripes, for umbrellas, awnings and the tower roof. */
export function stripes(colors: readonly string[], repeat = 1) {
  return canvasTex(
    64 * colors.length,
    8,
    (ctx) =>
      colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(i * 64, 0, 64, 8);
      }),
    [repeat, 1],
  );
}

/** Lesbian pride flag stripes, top to bottom. */
export const SUNSET_FLAG = [
  "#d52d00",
  "#ff9a56",
  "#ffffff",
  "#d362a4",
  "#a30262",
] as const;

type Wave = { kx: number; ky: number; phase: number; amp: number };

/** Seeded cosine waves on whole-number frequencies, so a texture built from them tiles. */
function waves(seed: number, count: number, maxK: number): Wave[] {
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => ({
    kx: Math.round((rand() * 2 - 1) * maxK),
    ky: Math.round((rand() * 2 - 1) * maxK) || 1,
    phase: rand() * Math.PI * 2,
    amp: 0.5 + rand() * 0.5,
  }));
}

/**
 * A tileable canvas texture: each texel is `shade(height, slopeX, slopeY)` of
 * the normalized wave field.
 */
function waveTex(
  size: number,
  ws: Wave[],
  shade: (h: number, gx: number, gy: number) => [number, number, number],
) {
  const total = ws.reduce((sum, w) => sum + w.amp, 0);
  const { canvas, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0;
      let gx = 0;
      let gy = 0;
      for (const w of ws) {
        const a = 2 * Math.PI * ((w.kx * x + w.ky * y) / size) + w.phase;
        const slope = (-w.amp * Math.sin(a) * 2 * Math.PI) / size;
        h += w.amp * Math.cos(a);
        gx += slope * w.kx;
        gy += slope * w.ky;
      }
      const [r, g, b] = shade(h / total, gx / total, gy / total);
      const i = (y * size + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

let caustic: THREE.Texture | null = null;
/** Bright net lines of light on the pool floor, greyscale. */
export function causticTex() {
  caustic ??= waveTex(128, waves(7, 5, 3), (h) => {
    const v = Math.pow(1 - Math.min(1, Math.abs(h) * 5), 3) * 255;
    return [v, v, v];
  });
  return caustic;
}

let ripple: THREE.Texture | null = null;
/** Tangent-space normal map for the wave surface. Linear, not sRGB. */
export function rippleTex() {
  ripple ??= waveTex(256, waves(23, 6, 9), (_h, gx, gy) => {
    const nx = -gx * 12;
    const ny = -gy * 12;
    const len = Math.hypot(nx, ny, 1);
    return [
      (nx / len) * 127.5 + 127.5,
      (ny / len) * 127.5 + 127.5,
      (1 / len) * 127.5 + 127.5,
    ];
  });
  return ripple;
}
