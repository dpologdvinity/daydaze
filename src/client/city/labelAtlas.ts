// Draws every city sign and ad name into one atlas texture, one 512 by 128 cell
// per label in LABELS order, so all signs share a single material.

import * as THREE from "three";
import { LABELS, LABEL_COLUMNS, LABEL_ROWS } from "../../game/city/dressing.ts";

const CELL_W = 512;
const CELL_H = 128;

/** Every sign and ad name in the city, drawn once onto one texture. */
export function createLabelAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CELL_W * LABEL_COLUMNS;
  canvas.height = CELL_H * LABEL_ROWS;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas for the city's signs");
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  LABELS.forEach((text, i) => {
    const x = (i % LABEL_COLUMNS) * CELL_W + CELL_W / 2;
    const y = Math.floor(i / LABEL_COLUMNS) * CELL_H + CELL_H / 2;
    // shrink a long name until it fits its cell
    let size = 96;
    ctx.font = `900 ${size}px "Arial Black", system-ui, sans-serif`;
    while (ctx.measureText(text).width > CELL_W * 0.92 && size > 24) {
      size -= 4;
      ctx.font = `900 ${size}px "Arial Black", system-ui, sans-serif`;
    }
    ctx.fillText(text, x, y);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}
