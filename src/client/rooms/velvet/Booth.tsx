import { useMemo } from "react";
import * as THREE from "three";
import { Batch } from "../shared/batch.ts";
import { GOLD, LACQUER } from "../shared/materials.ts";
import { BOOTH } from "./layout.ts";
import { Cocktails } from "./Props.tsx";
import { inFrame } from "../shared/place.ts";
import { NEON_WARM, VELVET } from "./materials.ts";

const SPAN = 1.85;
const BUTTON = new THREE.MeshStandardMaterial({
  color: "#ff4fa8",
  roughness: 0.35,
  metalness: 0.2,
});

function sectorShape(r0: number, r1: number, a0: number, a1: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return s;
}

// An arc of points on the booth floor plane, at radius r and height y.
function arc(r: number, y: number, a0: number, a1: number, n: number) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return new THREE.Vector3(r * Math.cos(a), y, -r * Math.sin(a));
  });
}

// Tufted velvet booth in a half-round, with piped seams and rose buttons.
export function Booth() {
  const parts = useMemo(() => {
    const ext = (shape: THREE.Shape, depth: number, bevel: number) => {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        curveSegments: 32,
      });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const batch = new Batch();
    const at = inFrame(batch, { x: BOOTH.x, z: BOOTH.z });

    // seat cushion and tufted back, in one velvet bucket
    at.add(ext(sectorShape(0.95, 1.5, -SPAN, SPAN), 0.36, 0.05), VELVET, {
      position: [0, 0.06, 0],
    });
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a0 = -SPAN + (i * 2 * SPAN) / n + 0.012;
      const a1 = -SPAN + ((i + 1) * 2 * SPAN) / n - 0.012;
      at.add(ext(sectorShape(1.5, 1.68, a0, a1), 0.95, 0.055), VELVET, {
        position: [0, 0.06, 0],
      });
    }

    // rose buttons pinned into the back, two rows
    const sphere = new THREE.SphereGeometry(0.024, 8, 6);
    for (const y of [0.45, 0.75]) {
      for (let i = 0; i < 9; i++) {
        const a = -SPAN * 0.9 + (i * 2 * SPAN * 0.9) / 8;
        at.add(sphere, BUTTON, {
          position: [1.49 * Math.cos(a), 0.06 + y, -1.49 * Math.sin(a)],
        });
      }
    }

    // gold piping on the seat edge and along the top of the back
    const pipe = (pts: THREE.Vector3[]) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 6);
    at.add(pipe(arc(1.5, 0.42, -SPAN, SPAN, 40)), GOLD);
    at.add(pipe(arc(1.68, 1.01, -SPAN, SPAN, 40)), GOLD);

    // brass ring at the foot of the booth
    at.add(new THREE.RingGeometry(1.48, 1.74, 64, 1, -1.9, 3.8), GOLD, {
      position: [0, 0.04, 0],
      rotation: [-Math.PI / 2, 0, 0],
    });

    // table: gold stem, lacquer top with a gold rim, two tealights
    const table = [-0.25, 0, 0] as const;
    at.add(new THREE.CylinderGeometry(0.05, 0.16, 0.72, 16), GOLD, {
      position: [table[0], 0.36, table[2]],
    });
    at.add(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 40), LACQUER, {
      position: [table[0], 0.73, table[2]],
    });
    at.add(new THREE.TorusGeometry(0.5, 0.018, 8, 48), GOLD, {
      position: [table[0], 0.73, table[2]],
      rotation: [Math.PI / 2, 0, 0],
    });
    const tealight = new THREE.SphereGeometry(0.012, 8, 6);
    for (const [x, z] of [
      [-0.18, 0.05],
      [-0.05, -0.05],
    ])
      at.add(tealight, NEON_WARM, { position: [x - 0.25, 0.76, z] });

    return batch.build();
  }, []);
  return (
    <group>
      <primitive object={parts} />
      <Cocktails
        items={[
          {
            position: [BOOTH.x - 0.1, BOOTH.y + 0.75, BOOTH.z + 0.18],
            color: "#ff2f4a",
            scale: 0.85,
          },
          {
            position: [BOOTH.x - 0.15, BOOTH.y + 0.75, BOOTH.z - 0.22],
            color: "#ffc21f",
            scale: 0.85,
          },
        ]}
      />
    </group>
  );
}
