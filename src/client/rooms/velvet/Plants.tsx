// Small terracotta potted plants around the Velvet Room. Every pot and frond is
// merged into one batch; frond angles come from the pot's position, so each
// plant looks a little different with no randomness.

import { useMemo } from "react";
import * as THREE from "three";
import { lathe } from "../../avatar/dollGeometry.ts";
import { Batch } from "../shared/batch.ts";
import { FOLIAGE, TERRACOTTA } from "./materials.ts";
import { inFrame } from "../shared/place.ts";

const POTS: { x: number; z: number; s: number }[] = [
  { x: 3.1, z: -4.4, s: 1 },
  { x: -4.6, z: -0.2, s: 0.85 },
  { x: 4.7, z: -2.6, s: 1.1 },
];

const POT = lathe(
  [
    [0, 0.1],
    [0.05, 0.16],
    [0.3, 0.18],
    [0.34, 0.14],
    [0.36, 0.14],
    [0.36, 0],
  ],
  16,
);

// Potted plants: all pots in one mesh, all fronds in one mesh.
export function Plants() {
  const parts = useMemo(() => {
    const batch = new Batch();
    const frond = new THREE.SphereGeometry(1, 6, 4);
    for (const { x, z, s } of POTS) {
      const at = inFrame(batch, { x, z });
      at.add(POT, TERRACOTTA, { scale: s });
      // fronds radiate from the pot, each tilted outward and turned around
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + (x + z) * 0.7;
        const h = 0.55 + ((i * 37) % 7) * 0.05;
        at.add(frond, FOLIAGE, {
          position: [
            Math.cos(a) * 0.12 * s,
            (0.5 + h * 0.4) * s,
            Math.sin(a) * 0.12 * s,
          ],
          rotation: [Math.sin(a) * 0.6, a, Math.cos(a) * 0.6],
          scale: [0.1 * s, h * s, 0.04 * s],
        });
      }
    }
    return batch.build();
  }, []);
  return <primitive object={parts} />;
}
