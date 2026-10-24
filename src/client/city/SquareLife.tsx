// Downtown's square dressing: the fountain with falling drops, the benches
// round it, and the bus shelter whose board shows a painted city map and opens
// the full map on click.

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CITY_BOUNDS,
  CITY_SURFACES,
  FOUNTAIN,
  SQUARE_BENCHES,
  SQUARE_BUS_STOP,
  WATER_Z,
} from "../../game/city/layout.ts";
import { canvasTex, hdr } from "../rooms/shared/materials.ts";
import { useReducedMotion } from "../motion.ts";
import { requestCityMap } from "../ui/cityMapRequest.ts";

const DROPS = 48;
const scratch = {
  o: new THREE.Object3D(),
};

/** The city map, painted once for the bus stop's board. */
function mapTexture() {
  const [[x0, z0], , [x1, z1]] = CITY_BOUNDS;
  const w = 256;
  const h = Math.round((w * (z1 - z0)) / (x1 - x0));
  const fill: Record<string, string> = {
    road: "#3a2f6e",
    sidewalk: "#6a5a9a",
    square: "#ffd84f",
    boardwalk: "#9a6a4a",
    sand: "#c9a274",
    lawn: "#2e5e3a",
  };
  return canvasTex(w, h, (ctx) => {
    const sx = w / (x1 - x0);
    const sz = h / (z1 - z0);
    ctx.fillStyle = "#120d26";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0b2a4a";
    ctx.fillRect(0, (WATER_Z - z0) * sz, w, h);
    for (const s of CITY_SURFACES) {
      ctx.fillStyle = fill[s.kind] ?? "#6a5a9a";
      ctx.beginPath();
      s.polygon.forEach(([x, z], i) => {
        const px = (x - x0) * sx;
        const pz = (z - z0) * sz;
        if (i) ctx.lineTo(px, pz);
        else ctx.moveTo(px, pz);
      });
      ctx.fill();
    }
    // you are here
    ctx.fillStyle = "#ff4fb3";
    ctx.beginPath();
    ctx.arc(
      (SQUARE_BUS_STOP[0] - x0) * sx,
      (SQUARE_BUS_STOP[1] - z0) * sz,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
}

/** The fountain: two stone tiers, glowing water in the basin, and drops
 * arcing from the top jet back down into it. */
function Fountain() {
  const calm = useReducedMotion();
  const drops = useRef<THREE.InstancedMesh>(null);
  const { x, z, r } = FOUNTAIN;
  useFrame(({ clock }) => {
    const m = drops.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const { o } = scratch;
    for (let i = 0; i < DROPS; i++) {
      const a = (i / DROPS) * Math.PI * 2;
      // each drop's flight: up out of the jet and over into the basin
      const k = calm ? 0.5 : (t * 0.7 + (i % 6) / 6) % 1;
      const reach = 0.3 + k * (r - 1.1);
      o.position.set(
        x + Math.sin(a) * reach,
        2.6 + k * 1.4 - k * k * 3.2,
        z + Math.cos(a) * reach,
      );
      o.scale.setScalar(1 - k * 0.4);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  // pale stone, faintly lit by the water so it still reads at night
  const stone = (
    <meshStandardMaterial
      color="#e8e0f4"
      emissive="#5a5078"
      emissiveIntensity={0.6}
      roughness={0.55}
    />
  );
  return (
    <group>
      <mesh position={[x, 0.35, z]}>
        <cylinderGeometry args={[r, r + 0.15, 0.7, 32, 1, true]} />
        {stone}
      </mesh>
      <mesh position={[x, 0.72, z]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[r - 0.25, r + 0.05, 32]} />
        {stone}
      </mesh>
      {/* the water, lit from below */}
      <mesh position={[x, 0.55, z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[r - 0.2, 32]} />
        <meshStandardMaterial
          color="#2a8ac8"
          emissive="#4fe3ff"
          emissiveIntensity={0.5}
          roughness={0.05}
          metalness={0.2}
        />
      </mesh>
      {/* the column and the upper bowl */}
      <mesh position={[x, 1.3, z]}>
        <cylinderGeometry args={[0.25, 0.4, 1.6, 16]} />
        {stone}
      </mesh>
      <mesh position={[x, 2.15, z]}>
        <cylinderGeometry args={[1.3, 0.35, 0.35, 24]} />
        {stone}
      </mesh>
      <mesh position={[x, 2.34, z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.15, 24]} />
        <meshBasicMaterial color={hdr("#7fd8ff", 1.4)} toneMapped={false} />
      </mesh>
      <mesh position={[x, 2.75, z]}>
        <cylinderGeometry args={[0.06, 0.1, 0.8, 8]} />
        <meshBasicMaterial color={hdr("#bff4ff", 1.8)} toneMapped={false} />
      </mesh>
      <instancedMesh
        ref={drops}
        args={[undefined, undefined, DROPS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.07, 6, 4]} />
        <meshBasicMaterial color={hdr("#bff4ff", 2)} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Benches round the fountain: a slatted seat and back on iron legs. */
function Benches() {
  const seats = useMemo(() => {
    const geo = new THREE.BoxGeometry(1.8, 0.08, 0.45);
    geo.translate(0, 0.45, 0);
    const back = new THREE.BoxGeometry(1.8, 0.4, 0.06);
    back.translate(0, 0.72, -0.22);
    const legs = [-0.8, 0.8].map((dx) => {
      const g = new THREE.BoxGeometry(0.06, 0.45, 0.4);
      g.translate(dx, 0.225, 0);
      return g;
    });
    return [geo, back, ...legs];
  }, []);
  return (
    <>
      {seats.map((geo, k) => (
        <instancedMesh
          key={k}
          args={[geo, undefined, SQUARE_BENCHES.length]}
          ref={(m) => {
            if (!m) return;
            const { o } = scratch;
            SQUARE_BENCHES.forEach(({ at: [x, z], yaw }, i) => {
              o.position.set(x, 0, z);
              o.rotation.set(0, yaw, 0);
              o.scale.setScalar(1);
              o.updateMatrix();
              m.setMatrixAt(i, o.matrix);
            });
            m.instanceMatrix.needsUpdate = true;
            m.computeBoundingSphere();
          }}
        >
          <meshStandardMaterial
            color={k < 2 ? "#8a5a3a" : "#2a2440"}
            roughness={0.7}
            metalness={k < 2 ? 0 : 0.6}
          />
        </instancedMesh>
      ))}
    </>
  );
}

/** The bus shelter on the avenue side: glass back, a roof, and a lit board
 * with the city map on it; tap the board to open the map. */
function BusStop() {
  const map = useMemo(mapTexture, []);
  const [x, z] = SQUARE_BUS_STOP;
  const open = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    requestCityMap();
  };
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0.65]}>
        <boxGeometry args={[3.6, 2.4, 0.06]} />
        <meshStandardMaterial
          color="#9ad8ff"
          transparent
          opacity={0.25}
          roughness={0.05}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 2.5, 0.1]}>
        <boxGeometry args={[3.9, 0.12, 1.5]} />
        <meshStandardMaterial color="#2a2440" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-1.8, 1.8].map((dx) => (
        <mesh key={dx} position={[dx, 1.25, 0.65]}>
          <boxGeometry args={[0.08, 2.5, 0.08]} />
          <meshStandardMaterial color="#2a2440" metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.45, 0.4]}>
        <boxGeometry args={[2.6, 0.08, 0.4]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.7} />
      </mesh>
      {/* the map board beside the shelter, facing the avenue */}
      <group position={[2.6, 0, 0.2]}>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.1, 1.8, 0.1]} />
          <meshStandardMaterial color="#2a2440" metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.55, -0.04]} onClick={open}>
          <boxGeometry args={[1.2, 1.5, 0.08]} />
          <meshStandardMaterial color="#14102a" />
        </mesh>
        <mesh position={[0, 1.55, -0.09]} rotation-y={Math.PI} onClick={open}>
          <planeGeometry args={[1.05, 1.3]} />
          <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
        <mesh position={[0, 2.38, -0.04]}>
          <boxGeometry args={[1.2, 0.18, 0.1]} />
          <meshBasicMaterial color={hdr("#ffd84f", 1.8)} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Downtown Plaza's square: the fountain in the middle, benches facing it,
 * and the bus stop on the avenue side whose board is the city map.
 */
export function SquareLife() {
  return (
    <>
      <Fountain />
      <Benches />
      <BusStop />
    </>
  );
}
