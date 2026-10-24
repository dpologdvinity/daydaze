// Beachside's sand dressing: bonfires with animated flames and log seats, and
// the volleyball court (net and boundary tape). Wood, flames and tape are one
// instanced draw each; flames hold still under reduced motion.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BONFIRES, VOLLEYBALL } from "../../game/city/layout.ts";
import { useReducedMotion } from "../motion.ts";

const FLAMES = 3;
const LOGS = 4;

/**
 * Life on the sand: bonfires (flickering flame cones over stacked wood, log
 * seats round them) and a volleyball net. Each part is one instanced draw.
 */
export function BeachLife() {
  const calm = useReducedMotion();
  const flames = useRef<THREE.InstancedMesh>(null);
  const flame = useMemo(() => new THREE.ConeGeometry(0.35, 1.1, 7), []);
  const wood = useMemo(() => {
    const m = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.1, 6),
      new THREE.MeshStandardMaterial({ color: "#4a2e1c", roughness: 0.9 }),
      BONFIRES.length * (3 + LOGS),
    );
    const o = new THREE.Object3D();
    let k = 0;
    for (const [x, z] of BONFIRES) {
      // three sticks leaning into a tepee
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        o.position.set(x + Math.cos(a) * 0.2, 0.4, z + Math.sin(a) * 0.2);
        o.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
      // log seats round the fire
      for (let i = 0; i < LOGS; i++) {
        const a = (i / LOGS) * Math.PI * 2 + 0.4;
        o.position.set(x + Math.cos(a) * 2.2, 0.22, z + Math.sin(a) * 2.2);
        o.rotation.set(0, -a, Math.PI / 2);
        o.scale.set(2.2, 1.6, 2.2);
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, []);
  useFrame(({ clock }) => {
    const f = flames.current;
    if (!f) return;
    const t = clock.elapsedTime;
    const o = scratch;
    BONFIRES.forEach(([x, z], b) => {
      for (let i = 0; i < FLAMES; i++) {
        const lick = calm
          ? 1
          : 0.8 + Math.sin(t * (7 + i * 2.3) + b * 1.7) * 0.25;
        o.position.set(
          x + (i - 1) * 0.15,
          0.45 + lick * 0.45,
          z + ((i % 2) - 0.5) * 0.12,
        );
        o.rotation.set(0, t * 0.5 + i, 0);
        o.scale.set(1 - i * 0.2, lick, 1 - i * 0.2);
        o.updateMatrix();
        f.setMatrixAt(b * FLAMES + i, o.matrix);
      }
    });
    f.instanceMatrix.needsUpdate = true;
  });
  const { x, z, half } = VOLLEYBALL;
  return (
    <>
      <primitive object={tape} />
      <primitive object={wood} />
      <instancedMesh
        ref={flames}
        args={[flame, undefined, BONFIRES.length * FLAMES]}
      >
        <meshBasicMaterial
          color={new THREE.Color("#ff8a2a").multiplyScalar(2.2)}
          toneMapped={false}
          transparent
          opacity={0.85}
        />
      </instancedMesh>
      {/* the volleyball net: two posts and the mesh between them */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[x + side * half, 1.25, z]}>
          <cylinderGeometry args={[0.06, 0.06, 2.5, 6]} />
          <meshStandardMaterial color="#e8e0d0" />
        </mesh>
      ))}
      <mesh position={[x, 2, z]}>
        <planeGeometry args={[half * 2, 0.9]} />
        <meshStandardMaterial
          color="#f4f1ea"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

const scratch = new THREE.Object3D();

/** The court's boundary tape on the sand: two sidelines, two end lines and
 * the center line under the net, one instanced draw. */
const tape = (() => {
  const { x, z, half, depth } = VOLLEYBALL;
  const lines: [number, number, number, number][] = [
    // center x, center z, length along x, length along z
    [x - half, z, 0.1, depth * 2],
    [x + half, z, 0.1, depth * 2],
    [x, z - depth, half * 2, 0.1],
    [x, z + depth, half * 2, 0.1],
    [x, z, half * 2, 0.1],
  ];
  const m = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.01, 1),
    // pale rope with a faint glow, so the court reads after dark
    new THREE.MeshStandardMaterial({
      color: "#eef6ff",
      emissive: "#bfe0ff",
      emissiveIntensity: 0.35,
      roughness: 0.8,
    }),
    lines.length,
  );
  const o = new THREE.Object3D();
  lines.forEach(([cx, cz, lx, lz], i) => {
    // just above the sand, whose top is at 0.14 (plan.ts surfaceStyle)
    o.position.set(cx, 0.15, cz);
    o.scale.set(lx, 1, lz);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  });
  return m;
})();
