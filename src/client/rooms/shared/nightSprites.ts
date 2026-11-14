// The little sprite pictures and the cheap per-index random draws the night
// decor (NightDecor.tsx) and the night signatures (NightSignature.tsx) share.

import * as THREE from "three";

export type Shape =
  "dot" | "square" | "heart" | "star" | "petal" | "bar" | "ring";

const shapeTextures = new Map<Shape, THREE.CanvasTexture>();

/** A sprite's white-on-clear picture, drawn once per shape. */
export function shapeTexture(shape: Shape): THREE.CanvasTexture {
  const cached = shapeTextures.get(shape);
  if (cached) return cached;
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = ctx.strokeStyle = "#ffffff";
    ctx.translate(S / 2, S / 2);
    if (shape === "dot") {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, S / 2);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.45, "rgba(255,255,255,0.75)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-S / 2, -S / 2, S, S);
    } else if (shape === "square") {
      ctx.fillRect(-20, -14, 40, 28);
    } else if (shape === "bar") {
      ctx.fillRect(-4, -28, 8, 56);
    } else if (shape === "ring") {
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape === "petal") {
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 22, 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === "heart") {
      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.bezierCurveTo(-34, -2, -18, -26, 0, -10);
      ctx.bezierCurveTo(18, -26, 34, -2, 0, 22);
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 26 : 10;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  shapeTextures.set(shape, tex);
  return tex;
}

/** A fixed pseudo-random 0..1 per index and slot. */
export function rand(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
