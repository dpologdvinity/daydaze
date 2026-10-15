import * as THREE from "three";
import { lathe, lumpy } from "../../avatar/dollGeometry.ts";
import { gradientMap } from "../../avatar/toon.ts";
import type { Batch } from "../shared/batch.ts";
import { GOLD } from "../shared/materials.ts";

// Same palm as shared/Palm.tsx, but batched: the shared one costs about
// twelve draw calls each and the Plaza has eight of them.
const TRUNK = new THREE.MeshToonMaterial({ color: "#3a2418", gradientMap });
const FROND = ["#1f5a34", "#2a7240"].map(
  (color) =>
    new THREE.MeshToonMaterial({
      color,
      gradientMap,
      side: THREE.DoubleSide,
    }),
);

let parts:
  | {
      pot: THREE.BufferGeometry;
      trunk: THREE.BufferGeometry;
      frond: THREE.BufferGeometry;
    }
  | undefined;

function palmParts() {
  if (parts) return parts;
  const trunk = lumpy(
    lathe(
      [
        [0, 0.07],
        [0.6, 0.055],
        [1.2, 0.045],
        [1.7, 0.04],
        [1.75, 0],
      ],
      10,
    ),
    0.008,
    40,
  );
  const frond = new THREE.PlaneGeometry(0.34, 1.1, 1, 12);
  const p = frond.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = (p.getY(i) + 0.55) / 1.1;
    p.setX(
      i,
      p.getX(i) * Math.sin(Math.PI * Math.min(1, y * 1.1)) * (1 - y * 0.4),
    );
    p.setY(i, y * 1.1);
    p.setZ(i, -0.6 * y * y);
  }
  frond.computeVertexNormals();
  const pot = new THREE.CylinderGeometry(0.26, 0.2, 0.5, 20);
  parts = { pot, trunk, frond };
  return parts;
}

/** Adds one potted palm at (x, y, z), scaled like the shared Palm. */
export function addPalm(b: Batch, x: number, y: number, z: number, scale = 1) {
  const { pot, trunk, frond } = palmParts();
  const at = (dy: number) => [x, y + dy * scale, z] as [number, number, number];
  b.add(pot, GOLD, { position: at(0.25), scale }).add(trunk, TRUNK, {
    position: at(0.45),
    scale,
  });
  for (let i = 0; i < 10; i++) {
    b.add(frond, FROND[i % 2], {
      position: at(2.15),
      rotation: [-0.5 - (i % 3) * 0.25, (i / 10) * Math.PI * 2, 0],
      scale,
    });
  }
}
