// Kiddie Land's infield: what the toy train circles. A little pond with a
// play fountain whose drops arch up and fall back, four flower beds, and four
// bulb-lit lamp posts. A dozen draw calls, nothing allocated while it plays.

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { KIDDIE, type Vec3 } from "../../../game/amusementPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { Bulbs } from "./Bulbs.tsx";
import { Segments, type Segment } from "./Instanced.tsx";

const { cx, cz } = KIDDIE;
const POND = 2.1;
const DROPS = 72;

/** Where the flower beds lie round the pond: angle and distance from its middle. */
const BEDS: readonly [number, number][] = [
  [Math.PI * 0.5, 4.9],
  [Math.PI * 1.5, 4.9],
  [Math.PI * 0.12, 3.6],
  [Math.PI * 1.12, 3.6],
];
const FLOWERS_PER_BED = 16;
const BLOOM = [
  "#ff7ad9",
  "#ffd84f",
  "#ffffff",
  "#ff8a3d",
  "#c9a3ff",
  "#4fe3ff",
];

/** A fixed pseudo-random 0..1 per index and slot. */
function rand(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** The lamp posts: a pole and a ring of three warm bulbs at its top. */
const LAMPS: readonly (readonly [number, number])[] = [
  [cx - 3.3, cz - 6.2],
  [cx + 3.3, cz - 6.2],
  [cx - 3.3, cz + 6.2],
  [cx + 3.3, cz + 6.2],
];
const POLES: readonly Segment[] = LAMPS.map(([x, z]) => ({
  from: [x, 0, z],
  to: [x, 2.5, z],
  radius: 0.05,
}));
const LAMP_BULBS: readonly Vec3[] = LAMPS.flatMap(([x, z]) =>
  [0, 1, 2].map((k): Vec3 => {
    const a = (k / 3) * Math.PI * 2;
    return [x + Math.cos(a) * 0.16, 2.62, z + Math.sin(a) * 0.16];
  }),
);
const LAMP_COLORS = ["#ffe9a0", "#ffd0a0", "#fff4d0"];

/** Drops of water arching out of the middle of the pond. */
function Fountain() {
  const calm = useReducedMotion();
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(DROPS * 3), 3),
    );
    return g;
  }, []);
  const material = useMemo(() => {
    const S = 32;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }
    return new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(canvas),
      color: new THREE.Color("#bff4ff").multiplyScalar(2),
      size: 0.16,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (calm ? 0.25 : 1);
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < DROPS; i++) {
      // each drop's own arc: out along its jet's bearing, up and back down
      const jet = i % 6;
      const u = (t * 0.7 + rand(i, 1)) % 1;
      const bearing = (jet / 6) * Math.PI * 2 + rand(i, 2) * 0.25;
      const reach = (0.5 + 0.6 * (0.6 + rand(i, 3) * 0.4)) * 1.1 * u;
      pos.setXYZ(
        i,
        cx + Math.cos(bearing) * reach,
        0.15 + 1.9 * (1 - (2 * u - 1) ** 2) * (0.7 + 0.3 * rand(i, 4)),
        cz + Math.sin(bearing) * reach,
      );
    }
    pos.needsUpdate = true;
  });
  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}

/** The infield: pond, fountain, flower beds and lamps. */
export function KiddieInfield() {
  const flowers = useRef<THREE.InstancedMesh>(null);
  const mounds = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const f = flowers.current;
    const m = mounds.current;
    if (!f || !m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    BEDS.forEach(([a, d], b) => {
      const bx = cx + Math.cos(a) * d;
      const bz = cz + Math.sin(a) * d * 1.15;
      o.position.set(bx, 0.05, bz);
      o.scale.set(1.5, 0.12, 1.0);
      o.rotation.set(0, a, 0);
      o.updateMatrix();
      m.setMatrixAt(b, o.matrix);
      for (let k = 0; k < FLOWERS_PER_BED; k++) {
        const i = b * FLOWERS_PER_BED + k;
        const ang = rand(i, 5) * Math.PI * 2;
        const r = Math.sqrt(rand(i, 6));
        o.position.set(
          bx + Math.cos(ang) * r * 1.3,
          0.2 + rand(i, 7) * 0.12,
          bz + Math.sin(ang) * r * 0.85,
        );
        o.scale.setScalar(0.8 + rand(i, 8) * 0.5);
        o.rotation.set(0, 0, 0);
        o.updateMatrix();
        f.setMatrixAt(i, o.matrix);
        f.setColorAt(i, c.set(BLOOM[i % BLOOM.length] ?? "#ffffff"));
      }
    });
    f.instanceMatrix.needsUpdate = true;
    m.instanceMatrix.needsUpdate = true;
    if (f.instanceColor) f.instanceColor.needsUpdate = true;
  }, []);
  return (
    <group>
      {/* the pond, with a stone rim */}
      <mesh position={[cx, 0.03, cz]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[POND, 40]} />
        <meshStandardMaterial
          color="#2fb4d8"
          emissive="#136a8a"
          emissiveIntensity={0.6}
          roughness={0.15}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[cx, 0.05, cz]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[POND, POND + 0.28, 40]} />
        <meshStandardMaterial color="#cfc6e0" roughness={0.8} />
      </mesh>
      <Fountain />
      {/* flower beds: green mounds under bright blooms */}
      <instancedMesh ref={mounds} args={[undefined, undefined, BEDS.length]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshStandardMaterial color="#2c7a4c" roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        ref={flowers}
        args={[undefined, undefined, BEDS.length * FLOWERS_PER_BED]}
      >
        <sphereGeometry args={[0.11, 8, 6]} />
        <meshStandardMaterial roughness={0.6} emissive="#331a2a" />
      </instancedMesh>
      {/* lamp posts, a ring of bulbs on each */}
      <Segments items={POLES} color="#3a2a52" />
      <Bulbs
        points={LAMP_BULBS}
        colors={LAMP_COLORS}
        radius={0.1}
        detail={[6, 4]}
      />
    </group>
  );
}
