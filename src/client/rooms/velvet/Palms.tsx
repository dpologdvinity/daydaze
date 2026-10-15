import { useMemo } from "react";
import * as THREE from "three";
import { gradientMap } from "../../avatar/toon.ts";
import { Batch } from "../shared/batch.ts";
import { GOLD } from "../shared/materials.ts";
import { inFrame } from "./place.ts";

const TRUNK = new THREE.MeshToonMaterial({ color: "#3a2418", gradientMap });
const LEAF_DARK = new THREE.MeshToonMaterial({
  color: "#1f5a34",
  gradientMap,
  side: THREE.DoubleSide,
});
const LEAF_LIGHT = new THREE.MeshToonMaterial({
  color: "#2a7240",
  gradientMap,
  side: THREE.DoubleSide,
});

// One frond: a ribbed leaf that droops from its root, turned to a yaw and tilt.
function frond(yaw: number, tilt: number, len: number) {
  const g = new THREE.PlaneGeometry(0.42, len, 1, 6);
  g.translate(0, len / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / len;
    p.setZ(i, -0.9 * len * 0.3 * t * t);
  }
  g.applyMatrix4(
    new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(tilt, yaw, 0, "YXZ"),
    ),
  );
  g.computeVertexNormals();
  return g;
}

const FROND_LEN = 1.4;
const PALMS: { x: number; z: number; s: number }[] = [
  { x: -5.1, z: -5.1, s: 1 },
  { x: -5.0, z: 3.0, s: 0.85 },
  { x: 5.0, z: 4.6, s: 1.1 },
  { x: 5.1, z: -4.9, s: 0.9 },
];

// Four potted palms in one batch: gold pots, trunks, two leaf greens.
export function Palms() {
  const parts = useMemo(() => {
    const batch = new Batch();
    for (const { x, z, s } of PALMS) {
      const at = inFrame(batch, { x, z, s });
      at.add(new THREE.CylinderGeometry(0.26, 0.2, 0.5, 20), GOLD, {
        position: [0, 0.25, 0],
      });
      at.add(new THREE.CylinderGeometry(0.06, 0.11, 1.7, 8), TRUNK, {
        position: [0, 1.35, 0],
      });
      for (let i = 0; i < 10; i++) {
        const yaw = (i / 10) * Math.PI * 2;
        const tilt = -0.5 - (i % 3) * 0.25;
        at.add(frond(yaw, tilt, FROND_LEN), i % 2 ? LEAF_LIGHT : LEAF_DARK, {
          position: [0, 2.15, 0],
        });
      }
    }
    return batch.build();
  }, []);
  return <primitive object={parts} />;
}
