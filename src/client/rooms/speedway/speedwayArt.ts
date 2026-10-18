import type { Paint } from "./canvasTextures.ts";
import { seeded } from "./canvasTextures.ts";

/** Gray grain for the road; the material color tints it. Tiles every UV_METRES. */
export const asphaltPaint: Paint = (ctx, w, h) => {
  const rand = seeded(7);
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 5; i++) {
    const v = Math.floor(70 + rand() * 150);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand(), 1 + rand());
  }
  // tyre rubber smudges, darker and soft
  ctx.globalAlpha = 0.14;
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = "#222";
    ctx.fillRect(rand() * w, rand() * h, 40 + rand() * 60, 6 + rand() * 6);
  }
  ctx.globalAlpha = 1;
};

/** A hung banner: a dark field with a color bar, a neon border and a label. */
export function bannerPaint(label: string, color: string): Paint {
  return (ctx, w, h) => {
    const field = ctx.createLinearGradient(0, 0, 0, h);
    field.addColorStop(0, "#1c1334");
    field.addColorStop(1, "#0a0716");
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = color;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.font = `bold ${Math.floor(h * 0.42)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#fff6ff";
    ctx.fillText(label, w / 2, h * 0.42);
  };
}

/** The grandstand scoreboard: dark glass with a timing panel. */
export const scoreboardPaint: Paint = (ctx, w, h) => {
  ctx.fillStyle = "#07050f";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#4fe3ff";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.floor(h * 0.26)}px monospace`;
  ctx.fillStyle = "#ffd84f";
  ctx.shadowColor = "#ffd84f";
  ctx.shadowBlur = 14;
  ctx.fillText("LAP 1 / 3", w / 2, h * 0.3);
  ctx.font = `bold ${Math.floor(h * 0.16)}px monospace`;
  ctx.fillStyle = "#4fe3ff";
  ctx.shadowColor = "#4fe3ff";
  ctx.fillText("P1  0:00.00  P2  0:00.00", w / 2, h * 0.68);
  ctx.shadowBlur = 0;
};

/** A garage back wall poster: diagonal pink and cyan stripes with the bay number. */
export const posterPaint: Paint = (ctx, w, h) => {
  ctx.fillStyle = "#17132e";
  ctx.fillRect(0, 0, w, h);
  for (let x = -h; x < w + h; x += 36) {
    ctx.fillStyle = (x / 36) % 2 ? "#ff4fb3" : "#4fe3ff";
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + 18, h);
    ctx.lineTo(x + 18 + h, 0);
    ctx.lineTo(x + h, 0);
    ctx.closePath();
    ctx.globalAlpha = 0.5;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#0a0716";
  ctx.fillRect(w * 0.2, h * 0.3, w * 0.6, h * 0.4);
  ctx.fillStyle = "#fff6ff";
  ctx.font = `bold ${Math.floor(h * 0.26)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BAY 7", w / 2, h / 2);
};

/** Paint for the pit apron: white bay boxes on a transparent canvas. */
export const pitMarkingPaint: Paint = (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "#f4f0ff";
  ctx.lineWidth = 10;
  const bays = 3;
  const bayW = w / bays;
  for (let b = 0; b <= bays; b++) {
    ctx.beginPath();
    ctx.moveTo(b * bayW, h * 0.1);
    ctx.lineTo(b * bayW, h);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, h * 0.1);
  ctx.lineTo(w, h * 0.1);
  ctx.stroke();
  ctx.fillStyle = "#ffd84f";
  ctx.font = `bold ${Math.floor(h * 0.12)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let b = 0; b < bays; b++) {
    ctx.fillText(String(b + 7), b * bayW + bayW / 2, h * 0.5);
  }
};
