import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makeCanvas } from "../../canvas.ts";
import { useReducedMotion } from "../../motion.ts";
import { GOLD, hdr } from "../shared/materials.ts";
import { DANCE } from "./layout.ts";

// dark glass tile with a lit rim, tinted per-instance
const TILE_TEX = (() => {
  const { canvas: c, ctx } = makeCanvas(64, 64);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 64, 64);
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 40);
  g.addColorStop(0, "rgb(70,70,70)");
  g.addColorStop(0.65, "rgb(30,30,30)");
  g.addColorStop(0.8, "rgb(120,120,120)");
  g.addColorStop(1, "rgb(255,255,255)");
  ctx.fillStyle = g;
  ctx.fillRect(3, 3, 58, 58);
  return new THREE.CanvasTexture(c);
})();

const DISCO_TEX = (() => {
  const { canvas: c, ctx } = makeCanvas(64, 32);
  for (let x = 0; x < 64; x += 2)
    for (let y = 0; y < 32; y += 2) {
      const v = Math.random();
      const l = v > 0.93 ? 255 : v > 0.8 ? 120 : 18;
      ctx.fillStyle = `rgb(${l},${l * 0.85},${l})`;
      ctx.fillRect(x, y, 2, 2);
    }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
})();

export function DanceFloor() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 5,
    size = 0.64;
  const cols = useMemo(
    () =>
      ["#ff2f9a", "#9b5cff", "#ffb02e", "#3fe0d0"].map(
        (h) => new THREE.Color(h),
      ),
    [],
  );
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < n * n; i++) {
      o.position.set(
        ((i % n) - 2) * size,
        0.012,
        (Math.floor(i / n) - 2) * size,
      );
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, cols[0]);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [cols]);
  const c = useMemo(() => new THREE.Color(), []);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    // reduced motion freezes the chase on one lit frame
    const t = calm ? 1.2 : clock.elapsedTime;
    const step = Math.floor(t / 2.2);
    for (let i = 0; i < n * n; i++) {
      const x = (i % n) - 2,
        z = Math.floor(i / n) - 2;
      const d = Math.hypot(x, z);
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 - d * 1.4);
      c.copy(cols[(i + step + (x + z + 8)) % cols.length]).multiplyScalar(
        0.35 + pulse * 2.2,
      );
      m.setColorAt(i, c);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <group position={DANCE}>
      <instancedMesh ref={ref} args={[undefined, undefined, n * n]}>
        <boxGeometry args={[size - 0.04, 0.024, size - 0.04]} />
        <meshBasicMaterial toneMapped={false} map={TILE_TEX} />
      </instancedMesh>
      <mesh position-y={0.012} rotation-x={-Math.PI / 2} material={GOLD}>
        <ringGeometry
          args={[
            size * 2.6 * Math.SQRT2,
            size * 2.78 * Math.SQRT2,
            4,
            1,
            Math.PI / 4,
          ]}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- fixtures

const SPOTS = 14;

/**
 * A faceted mirror ball on a gold pole. Its spots orbit the dance floor as one
 * instanced mesh; reduced motion freezes both the spin and the spots.
 */
export function DiscoBall() {
  const ball = useRef<THREE.Group>(null);
  const spots = useRef<THREE.InstancedMesh>(null);
  const calm = useReducedMotion();
  const { body, spot, spotMat } = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({
      color: "#e8e0ff",
      metalness: 0.9,
      roughness: 0.18,
      flatShading: true,
      envMapIntensity: 2.4,
      emissive: hdr("#ffe6ff", 2.5),
      emissiveMap: DISCO_TEX,
      toneMapped: false,
    });
    const spot = new THREE.CircleGeometry(0.2, 10);
    spot.rotateX(-Math.PI / 2);
    const spotMat = new THREE.MeshBasicMaterial({
      color: hdr("#ffb8e6", 1.4),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { body, spot, spotMat };
  }, []);
  const faceted = useMemo(() => new THREE.IcosahedronGeometry(0.34, 2), []);
  const o = useMemo(() => new THREE.Object3D(), []);

  // Places every spot for time t; allocation-free so it can run each frame.
  const place = (m: THREE.InstancedMesh, t: number) => {
    for (let i = 0; i < SPOTS; i++) {
      const a = t * 0.25 + (i * Math.PI * 2) / SPOTS;
      const r = 3.6 + 0.9 * Math.sin(a * 1.7 + i);
      o.position.set(
        DANCE.x + Math.cos(a) * r,
        0.02,
        DANCE.z + Math.sin(a) * r * 0.8,
      );
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    if (spots.current) place(spots.current, calm ? 1.2 : 0);
  }, [calm]);
  useFrame(({ clock }, dt) => {
    if (calm) return;
    if (ball.current) ball.current.rotation.y += dt * 0.35;
    if (spots.current) place(spots.current, clock.elapsedTime);
  });
  return (
    <>
      <group position={[DANCE.x, 3.55, DANCE.z]}>
        <mesh position-y={0.6} material={GOLD}>
          <cylinderGeometry args={[0.008, 0.008, 1.0, 6]} />
        </mesh>
        <group ref={ball}>
          <mesh geometry={faceted} material={body} />
        </group>
      </group>
      <instancedMesh
        ref={spots}
        args={[spot, spotMat, SPOTS]}
        frustumCulled={false}
      />
    </>
  );
}
