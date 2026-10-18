import { useMemo } from "react";
import * as THREE from "three";
import { groundMaps, surface } from "../../city/worldTexture.ts";
import { Batch } from "../shared/batch.ts";
import { canvasTex, GOLD } from "../shared/materials.ts";
import { NEON_PINK, NEON_VIOLET } from "./materials.ts";
import { inFrame, type Frame } from "./place.ts";
import { ROOM } from "./layout.ts";

const H = 4.6;
const WALLS: Frame[] = [
  { z: -ROOM },
  { x: -ROOM, ry: Math.PI / 2 },
  { x: ROOM, ry: -Math.PI / 2 },
];

// Tufted velvet walls with a lacquer wainscot, gold pilasters and neon cornice.
export function Walls() {
  const tufted = useMemo(
    () =>
      canvasTex(
        256,
        256,
        (ctx) => {
          ctx.fillStyle = "#4a1046";
          ctx.fillRect(0, 0, 256, 256);
          // quilted diamonds: highlight top-left, shade bottom-right
          for (const [cx, cy] of [
            [128, 128],
            [0, 0],
            [256, 0],
            [0, 256],
            [256, 256],
          ]) {
            const g = ctx.createRadialGradient(
              cx - 30,
              cy - 30,
              6,
              cx,
              cy,
              130,
            );
            g.addColorStop(0, "rgba(255,140,220,0.30)");
            g.addColorStop(0.6, "rgba(120,20,100,0.0)");
            g.addColorStop(1, "rgba(10,0,15,0.55)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 128);
            ctx.lineTo(cx + 128, cy);
            ctx.lineTo(cx, cy + 128);
            ctx.lineTo(cx - 128, cy);
            ctx.fill();
          }
          ctx.strokeStyle = "rgba(20,0,20,0.8)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 128);
          ctx.lineTo(128, 0);
          ctx.lineTo(256, 128);
          ctx.lineTo(128, 256);
          ctx.closePath();
          ctx.stroke();
          // damask scroll and gold tuft buttons where the diamonds meet
          ctx.strokeStyle = "rgba(246,196,106,0.22)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(128, 128, 34, 18, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#f6c46a";
          for (const [x, y] of [
            [0, 128],
            [128, 0],
            [256, 128],
            [128, 256],
            [128, 128],
          ]) {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        },
        [14, 6],
      ),
    [],
  );

  const parts = useMemo(() => {
    // the pile's weave from a CC0 velvet scan, under the quilting
    const { normalMap } = groundMaps("velour_velvet");
    normalMap.repeat.set(36, 14);
    const velvet = new THREE.MeshStandardMaterial({
      map: tufted,
      normalMap,
      roughness: 0.75,
      metalness: 0.05,
    });
    // a dark walnut wainscot instead of flat lacquer
    const walnut = surface("wood_veneer", {
      scale: 1.2,
      color: "#5a3a3a",
      roughness: 0.5,
    });
    const batch = new Batch();
    for (const frame of WALLS) {
      const at = inFrame(batch, frame);
      at.add(new THREE.PlaneGeometry(12, H), velvet, {
        position: [0, H / 2, 0],
      });
      // black lacquer wainscot with a gold rail
      at.add(new THREE.BoxGeometry(12, 1, 0.04), walnut, {
        position: [0, 0.5, 0.02],
      });
      at.add(new THREE.BoxGeometry(12, 0.05, 0.06), GOLD, {
        position: [0, 1.02, 0.05],
      });
      // fluted gold pilasters every two meters
      for (let x = -5; x <= 5; x += 2) {
        at.add(new THREE.BoxGeometry(0.1, H - 0.2, 0.06), GOLD, {
          position: [x, H / 2, 0.03],
        });
        at.add(new THREE.BoxGeometry(0.16, 0.12, 0.12), GOLD, {
          position: [x, H - 0.12, 0.06],
        });
      }
      // crown moulding
      at.add(new THREE.BoxGeometry(12, 0.12, 0.2), GOLD, {
        position: [0, H - 0.06, 0.1],
      });
      // neon cornice and baseboard
      at.add(new THREE.BoxGeometry(12, 0.025, 0.025), NEON_VIOLET, {
        position: [0, H - 0.25, 0.06],
      });
      at.add(new THREE.BoxGeometry(12, 0.02, 0.02), NEON_PINK, {
        position: [0, 0.06, 0.06],
      });
    }
    return batch.build();
  }, [tufted]);

  return <primitive object={parts} />;
}
