// Velvet Room wall and ceiling decor: the gold lion sunburst crest, the swaying
// crystal chandelier (one instanced draw) and the gathered velvet curtains. The
// curtain geometry is built once at module load and shared by every drape.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { Batch } from "../shared/batch.ts";
import { canvasTex, GOLD } from "../shared/materials.ts";
import {
  NEON_AMBER,
  NEON_WARM,
  PLUM_VELVET,
  ROSE_VELVET,
} from "./materials.ts";
import { inFrame } from "../shared/place.ts";

/**
 * Gold sunburst crest with a painted Leo glyph disc and a neon halo, facing +z
 * at `position`.
 */
export function LionCrest(props: { position: [number, number, number] }) {
  const parts = useMemo(() => {
    const tex = canvasTex(512, 512, (ctx) => {
      const g = ctx.createRadialGradient(200, 180, 20, 256, 256, 260);
      g.addColorStop(0, "#fff1b8");
      g.addColorStop(0.5, "#e7a93f");
      g.addColorStop(1, "#7a4a12");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#3a1030";
      ctx.font =
        "320px 'DejaVu Sans', 'Segoe UI Symbol', 'Apple Symbols', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♌", 256, 270);
    });
    const disc = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      metalness: 0.9,
      roughness: 0.3,
      map: tex,
    });
    const batch = new Batch();
    // sunburst rays, gold ring and neon halo
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const L = i % 2 ? 0.55 : 0.85;
      batch.add(new THREE.BoxGeometry(L, 0.035, 0.02), GOLD, {
        position: [
          Math.cos(a) * (0.55 + L / 2),
          Math.sin(a) * (0.55 + L / 2),
          -0.02,
        ],
        rotation: [0, 0, a],
      });
    }
    batch.add(new THREE.TorusGeometry(0.5, 0.045, 12, 64), GOLD);
    batch.add(new THREE.TorusGeometry(0.6, 0.012, 8, 64), NEON_AMBER);
    batch.add(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 48), disc, {
      rotation: [Math.PI / 2, 0, 0],
    });
    return batch.build();
  }, []);
  return (
    <group {...props}>
      <primitive object={parts} />
    </group>
  );
}

const TIERS = [
  { r: 0.75, y: 0, n: 30 },
  { r: 0.55, y: -0.28, n: 24 },
  { r: 0.32, y: -0.52, n: 16 },
];
const CRYSTALS = TIERS.reduce((a, t) => a + t.n, 0);

// Brass chandelier: three tiers of crystals, one instanced draw.
export function Chandelier({
  position,
}: {
  position: [number, number, number];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (const t of TIERS)
      for (let k = 0; k < t.n; k++) {
        const a = (k / t.n) * Math.PI * 2;
        o.position.set(
          Math.cos(a) * t.r,
          t.y - 0.12 - (k % 2) * 0.06,
          Math.sin(a) * t.r,
        );
        o.scale.set(0.028, 0.075, 0.028);
        o.rotation.set(0, a, 0);
        o.updateMatrix();
        m.setMatrixAt(i++, o.matrix);
      }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  const parts = useMemo(() => {
    const batch = new Batch();
    batch.add(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), GOLD, {
      position: [0, 0.6, 0],
    });
    for (const t of TIERS) {
      batch.add(new THREE.TorusGeometry(t.r, 0.018, 8, 48), GOLD, {
        position: [0, t.y, 0],
        rotation: [Math.PI / 2, 0, 0],
      });
      batch.add(new THREE.TorusGeometry(t.r * 0.92, 0.01, 6, 48), NEON_WARM, {
        position: [0, t.y + 0.06, 0],
      });
    }
    return batch.build();
  }, []);
  const g = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (g.current && !calm)
      g.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.15;
  });
  return (
    <group position={position} ref={g}>
      <primitive object={parts} />
      <instancedMesh ref={ref} args={[undefined, undefined, CRYSTALS]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ffe8ff"
          emissive="#ff8ad8"
          emissiveIntensity={0.5}
          metalness={0.2}
          roughness={0}
          envMapIntensity={3}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}

const CURTAIN = (() => {
  // a velvet curtain gathered at the tie-back, falling into folds
  const geo = new THREE.PlaneGeometry(1.5, 4.4, 60, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    const gather = 1 - 0.35 * Math.exp(-Math.pow((y + 0.6) / 0.5, 2));
    p.setX(i, x * gather);
    p.setZ(i, Math.sin(x * 15) * 0.07 + Math.sin(x * 6.5 + 1) * 0.04);
  }
  geo.computeVertexNormals();
  return geo;
})();

/** Velvet curtains on the west wall. All share one fabric batch per color. */
export function Drapes({
  items,
}: {
  items: readonly {
    position: [number, number, number];
    fabric: THREE.Material;
  }[];
}) {
  const parts = useMemo(() => {
    const batch = new Batch();
    for (const { position, fabric } of items) {
      const frame = inFrame(batch, {
        x: position[0],
        y: position[1],
        z: position[2],
        ry: Math.PI / 2,
      });
      frame.add(CURTAIN, fabric, { position: [0, 2.2, 0] });
      frame.add(new THREE.TorusGeometry(0.55, 0.02, 8, 24, Math.PI), GOLD, {
        position: [0, 1.6, 0.1],
      });
    }
    return batch.build();
  }, [items]);
  return <primitive object={parts} />;
}
