import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { canvasTex, GOLD, neonMat } from "../shared/materials.ts";

export function LionCrest(props: { position: [number, number, number] }) {
  const tex = useMemo(
    () =>
      canvasTex(512, 512, (ctx) => {
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
      }),
    [],
  );
  const rays = useMemo(() => Array.from({ length: 20 }, (_, i) => i), []);
  return (
    <group {...props}>
      {rays.map((i) => {
        const a = (i / 20) * Math.PI * 2;
        const L = i % 2 ? 0.55 : 0.85;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * (0.55 + L / 2),
              Math.sin(a) * (0.55 + L / 2),
              -0.02,
            ]}
            rotation-z={a}
            material={GOLD}
          >
            <boxGeometry args={[L, 0.035, 0.02]} />
          </mesh>
        );
      })}
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.46, 0.46, 0.05, 48]} />
        <meshStandardMaterial
          attach="material"
          color="#ffffff"
          metalness={0.9}
          roughness={0.3}
          map={tex}
        />
      </mesh>
      <mesh material={GOLD}>
        <torusGeometry args={[0.5, 0.045, 12, 64]} />
      </mesh>
      <mesh material={neonMat("#ffb02e", 3.5)}>
        <torusGeometry args={[0.6, 0.012, 8, 64]} />
      </mesh>
    </group>
  );
}

const TIERS = [
  { r: 0.75, y: 0, n: 30 },
  { r: 0.55, y: -0.28, n: 24 },
  { r: 0.32, y: -0.52, n: 16 },
];
const CRYSTALS = TIERS.reduce((a, t) => a + t.n, 0);

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
  const g = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (g.current && !calm)
      g.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.15;
  });
  return (
    <group position={position} ref={g}>
      <mesh position-y={0.6} material={GOLD}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 6]} />
      </mesh>
      {TIERS.map((t) => (
        <mesh
          key={t.r}
          position-y={t.y}
          rotation-x={Math.PI / 2}
          material={GOLD}
        >
          <torusGeometry args={[t.r, 0.018, 8, 48]} />
        </mesh>
      ))}
      {TIERS.map((t) => (
        <mesh
          key={`b${t.r}`}
          position-y={t.y + 0.06}
          material={neonMat("#ffd6a0", 3)}
        >
          <torusGeometry args={[t.r * 0.92, 0.01, 6, 48]} />
        </mesh>
      ))}
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

export function Drape({
  position,
  color = "#2a0a4a",
}: {
  position: [number, number, number];
  color?: string;
}) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.5, 4.4, 60, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i);
      // gathered at the tie-back, falling into folds
      const gather = 1 - 0.35 * Math.exp(-Math.pow((y + 0.6) / 0.5, 2));
      p.setX(i, x * gather);
      p.setZ(i, Math.sin(x * 15) * 0.07 + Math.sin(x * 6.5 + 1) * 0.04);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={position} rotation-y={Math.PI / 2}>
      <mesh geometry={geo} position-y={2.2}>
        <meshPhysicalMaterial
          color={color}
          sheen={1}
          sheenColor="#c77dff"
          sheenRoughness={0.3}
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1.6, 0.1]} material={GOLD}>
        <torusGeometry args={[0.55, 0.02, 8, 24, Math.PI]} />
      </mesh>
    </group>
  );
}
