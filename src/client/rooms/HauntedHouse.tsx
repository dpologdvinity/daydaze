import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { HAUNTED_WALLS, ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { hdr } from "./shared/materials.ts";

const GHOSTS = 7;
const Y = new THREE.Vector3(0, 1, 0);
const PORTRAITS: readonly [number, number, number, number][] = [
  // x, y, z, yaw: frames on the outer walls, eyes that glow
  [-6.9, 1.9, -4.5, Math.PI / 2],
  [-6.9, 1.9, 3, Math.PI / 2],
  [6.9, 1.9, -0.5, -Math.PI / 2],
  [2, 1.9, -5.9, 0],
];

const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(1, 1, 1),
};

/** A sheet ghost: a rounded dome over a ragged skirt, one geometry. */
function ghostGeometry() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * 0.32, 0.9 + Math.cos(a) * 0.32));
  }
  pts.push(new THREE.Vector2(0.36, 0.3), new THREE.Vector2(0.42, 0));
  return new THREE.LatheGeometry(pts, 16);
}

/**
 * The Haunted House: dark rooms joined by gaps in the walls, sheet ghosts
 * drifting through them, portraits whose eyes glow, candles that gutter and
 * a cold blue glow at the back. Spooky, never gory: no zombies.
 */
export function HauntedHouse({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  const ghosts = useRef<THREE.InstancedMesh>(null);
  const candle = useRef<THREE.PointLight>(null);
  const ghost = useMemo(ghostGeometry, []);
  const walls = useMemo(
    () =>
      HAUNTED_WALLS.map((w) => {
        const xs = w.map(([x]) => x);
        const zs = w.map(([, z]) => z);
        const x0 = Math.min(...xs);
        const x1 = Math.max(...xs);
        const z0 = Math.min(...zs);
        const z1 = Math.max(...zs);
        return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
      }),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (calm ? 0.3 : 1);
    const g = ghosts.current;
    if (g) {
      const { m, q, p, s } = scratch;
      for (let i = 0; i < GHOSTS; i++) {
        // each drifts a slow loop of its own through the rooms
        const a = t * (0.15 + i * 0.02) + i * 1.7;
        p.set(
          Math.sin(a) * (3.5 + (i % 3)),
          0.4 + Math.sin(t * 1.3 + i) * 0.25,
          Math.cos(a * 0.8) * 4.2,
        );
        q.setFromAxisAngle(Y, a);
        g.setMatrixAt(i, m.compose(p, q, s));
      }
      g.instanceMatrix.needsUpdate = true;
    }
    // the candle gutters
    if (candle.current)
      candle.current.intensity =
        2.2 + (calm ? 0 : Math.sin(t * 13) * 0.4 + Math.sin(t * 7.3) * 0.3);
  });
  return (
    <>
      <color attach="background" args={["#050208"]} />
      <fog attach="fog" args={["#0a0414", 6, 24]} />
      <hemisphereLight args={["#6a4a9a", "#140a1e", 1.4]} />
      <pointLight
        ref={candle}
        position={[-4.5, 1.6, 3.6]}
        color="#ff9a3c"
        intensity={2.2}
        distance={8}
      />
      <pointLight
        position={[4.5, 1.4, -4.6]}
        color="#4fa8ff"
        intensity={5}
        distance={9}
      />
      <Floor
        width={14}
        depth={12}
        center={[0, 0]}
        color="#2a1a22"
        texture={{ id: "dark_wooden_planks", scale: 0.5 }}
        mirror={0.2}
        low={{ metalness: 0, roughness: 0.9 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["haunted-house"]} color="#7a5cff" />
      {/* outer walls and the inner ones that make the route wind */}
      {[
        { x: 0, z: -6, w: 14, d: 0.2 },
        { x: -7, z: 0, w: 0.2, d: 12 },
        { x: 7, z: 0, w: 0.2, d: 12 },
        ...walls,
      ].map((w, i) => (
        <mesh key={i} position={[w.x, 1.5, w.z]}>
          <boxGeometry args={[w.w, 3, w.d]} />
          <meshStandardMaterial color="#2b1d33" roughness={0.95} />
        </mesh>
      ))}
      {PORTRAITS.map(([x, y, z, yaw], i) => (
        <group key={i} position={[x, y, z]} rotation-y={yaw}>
          <mesh>
            <boxGeometry args={[0.9, 1.2, 0.06]} />
            <meshStandardMaterial
              color="#5a3a1a"
              metalness={0.4}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[0.7, 1]} />
            <meshStandardMaterial color="#1a1420" />
          </mesh>
          {[-0.1, 0.1].map((ex) => (
            <mesh key={ex} position={[ex, 0.15, 0.05]}>
              <circleGeometry args={[0.03, 8]} />
              <meshBasicMaterial color={hdr("#ff3a3a", 4)} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {/* candles on a table by the door */}
      <mesh position={[-4.5, 0.4, 3.6]}>
        <boxGeometry args={[1.2, 0.8, 0.6]} />
        <meshStandardMaterial color="#3a2418" />
      </mesh>
      {[-0.3, 0, 0.3].map((dx) => (
        <mesh key={dx} position={[-4.5 + dx, 0.95, 3.6]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3 - Math.abs(dx) * 0.3, 8]} />
          <meshBasicMaterial color={hdr("#ffd27a", 2)} toneMapped={false} />
        </mesh>
      ))}
      <instancedMesh ref={ghosts} args={[ghost, undefined, GHOSTS]}>
        <meshStandardMaterial
          color="#e8f0ff"
          emissive="#9ab8ff"
          emissiveIntensity={0.6}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}
