import * as THREE from "three";
import { makeCanvas } from "../../canvas.ts";

/** A color pushed past 1.0 so bloom picks it up. */
export const hdr = (hex: string, k: number) =>
  new THREE.Color(hex).multiplyScalar(k);

export const GOLD = new THREE.MeshStandardMaterial({
  color: "#f6c46a",
  metalness: 1,
  roughness: 0.25,
  envMapIntensity: 1.5,
});

export const LACQUER = new THREE.MeshStandardMaterial({
  color: "#0d0610",
  metalness: 0.3,
  roughness: 0.3,
  envMapIntensity: 0.6,
});

export const neonMat = (hex: string, k = 4) =>
  new THREE.MeshBasicMaterial({ color: hdr(hex, k), toneMapped: false });

export function gradientTex(stops: [number, string][], w = 4, h = 128) {
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(canvas);
}

export function canvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
) {
  const { canvas, ctx } = makeCanvas(w, h);
  draw(ctx);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}
