import { Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { playClick } from "../../audio/worldSounds.ts";
import {
  BAY_XS,
  BENCH_Z,
  FLOOR_BOUNDS,
  rangeToRoom,
  TEE,
} from "../../game/drivingRange.ts";
import { RINGS, TARGETS } from "../../game/golfRange.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import { WINDOWS } from "./plaza/Sky.tsx";
import { leave, range, tick } from "./range/session.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const LIME = "#7dff6b";
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
const CZ = (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2;

/** The skyline beyond the range: towers in a row, lit windows. */
function Skyline() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 28; i++) {
      const n = Math.sin(i * 12.9898) * 43758.5453;
      const r = n - Math.floor(n);
      const w = 10 + r * 14;
      const h = 18 + ((r * 7.3) % 1) * 34;
      const g = new THREE.BoxGeometry(w, h, 10);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++)
        uv.setXY(k, uv.getX(k) * (w / 4), uv.getY(k) * (h / 4));
      g.translate(-220 + i * 16, h / 2, -420 - ((r * 3.1) % 1) * 50);
      parts.push(g);
    }
    const merged = mergeGeometries(parts);
    if (!merged) throw new Error("Skyline parts have mismatched attributes.");
    return merged;
  }, []);
  const tex = useMemo(() => {
    const t = WINDOWS.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    return t;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial map={tex} color="#c8b8d8" fog={false} />
    </mesh>
  );
}

/** The target greens out on the range, each ringed in its own neon, with a
 * flag; distance boards every fifty metres. */
function Targets() {
  return (
    <>
      {TARGETS.map((t) => {
        const [x, z] = rangeToRoom(t.at);
        return (
          <group key={t.at[1]} position={[x, 0.02, z]}>
            <mesh rotation-x={-Math.PI / 2}>
              <circleGeometry args={[RINGS[2].r, 40]} />
              <meshStandardMaterial color="#3aa84e" roughness={0.9} />
            </mesh>
            {RINGS.map((ring) => (
              <mesh key={ring.r} position-y={0.02} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[ring.r - 0.25, ring.r, 48]} />
                <meshBasicMaterial color={hdr(t.color, 2)} toneMapped={false} />
              </mesh>
            ))}
            <mesh position-y={1.5}>
              <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.5, 2.7, 0]}>
              <planeGeometry args={[1, 0.6]} />
              <meshBasicMaterial
                color={hdr(t.color, 1.6)}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
      {[50, 100, 150, 200].map((m) => (
        <NeonText
          key={m}
          text={`${m}`}
          color="#ffffff"
          font={MARQUEE}
          width={4 + m / 40}
          k={2.6}
          position={[
            rangeToRoom([-34, m])[0],
            2.5 + m / 50,
            rangeToRoom([-34, m])[1],
          ]}
        />
      ))}
    </>
  );
}

/** The ball's flight, and the camera behind it as it goes. */
function Shot() {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const ball = useRef<THREE.Mesh>(null);
  const heard = useRef<unknown>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      leave();
      if (cameraHold.by === "driving-range") cameraHold.by = null;
    },
    [],
  );
  useFrame((_, dt) => {
    const now = performance.now();
    tick(now);
    const s = range.get();
    cameraHold.by = s.phase !== "off" ? "driving-range" : null;
    const b = ball.current;
    if (!b) return;
    if (s.phase === "flying" && s.shot) {
      if (heard.current !== s.shot) {
        heard.current = s.shot;
        playClick();
      }
      const i = Math.min(
        s.shot.frames.length - 1,
        Math.floor(((now - s.since) / 1000) * 30),
      );
      const [x, y, z] = s.shot.frames[i];
      const [rx, rz] = rangeToRoom([x, z]);
      b.position.set(rx, 0.05 + y, rz);
      // ride behind the ball, high, to watch it land
      eye.set(rx * 0.6, 6 + y * 0.4, rz + 22);
      look.set(rx, y * 0.5, rz - 10);
    } else {
      b.position.set(TEE[0], 0.05, TEE[1]);
      eye.set(TEE[0] + 1.2, 2.2, TEE[1] + 4.2);
      look.set(TEE[0], 1, TEE[1] - 40);
    }
    if (s.phase === "off") return;
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2.5));
    camera.lookAt(look);
  });
  return (
    <mesh ref={ball}>
      <sphereGeometry args={[0.05, 12, 8]} />
      <meshBasicMaterial color={hdr("#ffffff", 1.6)} toneMapped={false} />
    </mesh>
  );
}

/**
 * Skyline Driving Range on Gallery Row: a deck of tee bays under a neon
 * sign, looking out over a floodlit range of target greens ringed in neon,
 * distance boards out to two hundred metres, and the city's towers lit up
 * beyond. Hit a bucket of ten at the greens.
 */
export function DrivingRange({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#08061c"]} />
      <fog attach="fog" args={["#120c2c", 60, 320]} />
      <Stars
        radius={200}
        depth={20}
        count={900}
        factor={4}
        fade
        speed={calm ? 0 : 0.3}
      />
      <hemisphereLight args={["#c8d8ff", "#1a3a1a", 1]} />
      <pointLight
        position={[0, 5, 0]}
        color="#fff4e0"
        intensity={5}
        distance={14}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, CZ]}
        color="#5a4a3a"
        texture={{ id: "dark_wooden_planks", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.8 }}
        onPick={onPick}
      />
      {/* the range itself, stretching away into the night */}
      <mesh position={[0, -0.02, TEE[1] - 130]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[160, 260]} />
        <meshStandardMaterial color="#1f6a2e" roughness={1} />
      </mesh>
      <PortalPads room={ROOMS["driving-range"]} color={LIME} />
      {/* the tee mats and the dividers between the bays */}
      {BAY_XS.map((x) => (
        <mesh key={x} position={[x, 0.02, TEE[1]]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshStandardMaterial color="#2a8a3a" roughness={1} />
        </mesh>
      ))}
      {[-4.5, -1.5, 1.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 1, TEE[1] + 0.8]}>
          <boxGeometry args={[0.15, 2, 1.8]} />
          <meshStandardMaterial color="#2a2440" />
        </mesh>
      ))}
      {/* the roof over the bays, edged in neon */}
      <mesh position={[0, 3.2, CZ]}>
        <boxGeometry args={[W + 1, 0.2, D + 1]} />
        <meshStandardMaterial color="#1c1430" />
      </mesh>
      <mesh position={[0, 3.05, FLOOR_BOUNDS.z0 - 0.4]}>
        <boxGeometry args={[W + 1, 0.06, 0.06]} />
        <meshBasicMaterial color={hdr(LIME, 2.4)} toneMapped={false} />
      </mesh>
      <NeonText
        text="SKYLINE RANGE"
        color={LIME}
        font={MARQUEE}
        width={5}
        k={3.4}
        position={[0, 2.6, FLOOR_BOUNDS.z1 - 0.02]}
        rotation-y={Math.PI}
      />
      {[-4, 4].map((x) => (
        <mesh key={x} position={[x, 0.42, BENCH_Z]}>
          <boxGeometry args={[2.8, 0.08, 0.42]} />
          <meshStandardMaterial color="#8a5a3a" />
        </mesh>
      ))}
      {/* floodlights along the range */}
      {[-40, 40].map((x) => (
        <mesh key={x} position={[x, 14, TEE[1] - 60]}>
          <boxGeometry args={[3, 1.4, 0.3]} />
          <meshBasicMaterial color={hdr("#f4f8ff", 2.4)} toneMapped={false} />
        </mesh>
      ))}
      <Targets />
      <Skyline />
      <Shot />
    </>
  );
}
