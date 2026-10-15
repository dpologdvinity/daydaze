import { useMemo } from "react";
import * as THREE from "three";
import { Batch } from "../shared/batch.ts";
import { canvasTex, GOLD } from "../shared/materials.ts";
import { ROOM } from "./layout.ts";
import { inFrame, type Frame } from "./place.ts";

// Two paintings share one atlas: left half sunburst, right half moon.
function drawAtlas(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#2a0a4a");
  g.addColorStop(1, "#7a1f6a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  // sunburst in the left half
  ctx.save();
  ctx.translate(128, 128);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,176,46,0.5)" : "rgba(255,47,154,0.45)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 150, (i / 24) * Math.PI * 2, ((i + 0.5) / 24) * Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff1b8";
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // moon and reflection in the right half
  const m = ctx.createRadialGradient(360, 120, 10, 380, 128, 110);
  m.addColorStop(0, "#fff7e0");
  m.addColorStop(0.6, "#c77dff");
  m.addColorStop(1, "#2a0a4a");
  ctx.fillStyle = m;
  ctx.fillRect(256, 0, 256, 256);
  ctx.fillStyle = "#fff1b8";
  ctx.beginPath();
  ctx.arc(390, 96, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,47,154,0.35)";
  for (let y = 150; y < 256; y += 14) {
    ctx.fillRect(300 + (y - 150) * 0.3, y, 180 - (y - 150) * 0.6, 4);
  }
}

// Each picture sits in its wall's local space: x runs along the wall, y is height.
// East wall local x is room z; west wall local x is minus room z.
const PICTURES: {
  frame: Frame;
  x: number;
  w: number;
  h: number;
  uv: number;
}[] = [
  { frame: { x: ROOM, z: 0, ry: -Math.PI / 2 }, x: -2.6, w: 1.5, h: 1.1, uv: 0 },
  { frame: { x: -ROOM, z: 0, ry: Math.PI / 2 }, x: -2.0, w: 1.2, h: 1.2, uv: 0.5 },
];

export function Art() {
  const parts = useMemo(() => {
    const tex = canvasTex(512, 256, drawAtlas);
    const paint = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0,
    });
    const batch = new Batch();
    for (const { frame, x, w, h, uv: u0 } of PICTURES) {
      const at = inFrame(batch, frame);
      const plane = new THREE.PlaneGeometry(w, h);
      const uv = plane.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, u0 + uv.getX(i) * 0.5, uv.getY(i));
      at.add(plane, paint, { position: [x, 2.4, 0.025] });
      at.add(new THREE.BoxGeometry(w + 0.1, 0.06, 0.05), GOLD, {
        position: [x, 2.4 + h / 2 + 0.03, 0.02],
      });
      at.add(new THREE.BoxGeometry(w + 0.1, 0.06, 0.05), GOLD, {
        position: [x, 2.4 - h / 2 - 0.03, 0.02],
      });
      at.add(new THREE.BoxGeometry(0.06, h, 0.05), GOLD, {
        position: [x - w / 2 - 0.03, 2.4, 0.02],
      });
      at.add(new THREE.BoxGeometry(0.06, h, 0.05), GOLD, {
        position: [x + w / 2 + 0.03, 2.4, 0.02],
      });
    }
    return batch.build();
  }, []);
  return <primitive object={parts} />;
}
