import { Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playClick } from "../../audio/worldSounds.ts";
import {
  BENCH,
  HOLE_XS,
  holeToRoom,
  HUT,
  TEE_Z,
} from "../../game/lagoonLinks.ts";
import {
  BALL_RADIUS,
  CUP_RADIUS,
  HOLES,
  holeIndex,
  type PuttResult,
} from "../../game/minigolf.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import { MiniGolfNpcs } from "./minigolf/Npcs.tsx";
import { getCourse, leaveCourse, settle } from "./minigolf/session.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const TEAL = "#3fe0d0";
const CURB = 0.12;
const scratch = {
  eye: new THREE.Vector3(),
  look: new THREE.Vector3(),
  o: new THREE.Object3D(),
};

/** A green: its felt cut to the hole's outline, curbs along every wall,
 * bumpers as rocks, and the cup with its flag. */
function Green({ index }: { index: number }) {
  const hole = HOLES[index];
  const felt = useMemo(() => {
    const shape = new THREE.Shape(
      hole.walls.map(([x, z]) => new THREE.Vector2(x, -z)),
    );
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [hole]);
  const curbs = useMemo(
    () =>
      hole.walls.map(([ax, az], i) => {
        const [bx, bz] = hole.walls[(i + 1) % hole.walls.length];
        const len = Math.hypot(bx - ax, bz - az);
        return {
          x: (ax + bx) / 2,
          z: (az + bz) / 2,
          len: len + CURB,
          yaw: Math.atan2(bx - ax, bz - az),
        };
      }),
    [hole],
  );
  const [ox, oz] = holeToRoom(index, [0, 0]);
  return (
    <group position={[ox, 0, oz]}>
      <mesh geometry={felt} position-y={0.03}>
        <meshStandardMaterial color="#1f8a4c" roughness={0.9} />
      </mesh>
      {curbs.map((c, i) => (
        <mesh key={i} position={[c.x, 0.08, c.z]} rotation-y={c.yaw}>
          <boxGeometry args={[CURB, 0.12, c.len]} />
          <meshStandardMaterial color="#f4ecd8" roughness={0.6} />
        </mesh>
      ))}
      {hole.bumpers.map(({ at: [x, z], r }, i) =>
        index === 2 && i === 0 ? (
          <Lighthouse key={i} x={x} z={z} r={r} />
        ) : (
          <mesh key={i} position={[x, r * 0.6, z]} scale={[1, 0.7, 1]}>
            <dodecahedronGeometry args={[r, 0]} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
          </mesh>
        ),
      )}
      {/* the cup and its flag */}
      <mesh
        position={[hole.cup[0], 0.035, hole.cup[1]]}
        rotation-x={-Math.PI / 2}
      >
        <circleGeometry args={[CUP_RADIUS, 20]} />
        <meshBasicMaterial color="#050505" />
      </mesh>
      <mesh position={[hole.cup[0], 0.6, hole.cup[1]]}>
        <cylinderGeometry args={[0.01, 0.01, 1.2, 6]} />
        <meshStandardMaterial color="#e8e8f0" metalness={0.6} />
      </mesh>
      <mesh position={[hole.cup[0] + 0.15, 1.08, hole.cup[1]]}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshBasicMaterial
          color={hdr(index === 1 ? "#ff4fb3" : "#ffd84f", 1.4)}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* the tee mat */}
      <mesh
        position={[hole.tee[0], 0.035, hole.tee[1]]}
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial color="#14602f" roughness={1} />
      </mesh>
    </group>
  );
}

/** The third hole's lighthouse: a red-and-white tower whose lamp turns. */
function Lighthouse({ x, z, r }: { x: number; z: number; r: number }) {
  const calm = useReducedMotion();
  const beam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (beam.current && !calm)
      beam.current.rotation.y = clock.elapsedTime * 1.2;
  });
  return (
    <group position={[x, 0, z]}>
      {[0, 1, 2, 3].map((band) => (
        <mesh key={band} position-y={0.25 + band * 0.5}>
          <cylinderGeometry
            args={[r * (0.95 - band * 0.1), r * (1 - band * 0.1), 0.5, 20]}
          />
          <meshStandardMaterial color={band % 2 ? "#f4f0e8" : "#c82a2a"} />
        </mesh>
      ))}
      <mesh position-y={2.2}>
        <cylinderGeometry args={[0.28, 0.28, 0.4, 16]} />
        <meshBasicMaterial color={hdr("#ffe8a0", 2.6)} toneMapped={false} />
      </mesh>
      <mesh position-y={2.55}>
        <coneGeometry args={[0.36, 0.3, 16]} />
        <meshStandardMaterial color="#2a2440" />
      </mesh>
      <group ref={beam} position-y={2.2}>
        <mesh position-x={2.2} rotation-z={Math.PI / 2}>
          <coneGeometry args={[0.5, 4, 16, 1, true]} />
          <meshBasicMaterial
            color="#ffe8a0"
            transparent
            opacity={0.12}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Tiki torches round the course, flames flickering. */
function Torches() {
  const calm = useReducedMotion();
  const flames = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(
    () =>
      [-9.5, -4.3, 1.6, 8.5].flatMap((x) => [
        [x, -6.4],
        [x, 4.9],
      ]),
    [],
  );
  useFrame(({ clock }) => {
    const m = flames.current;
    if (!m) return;
    const o = scratch.o;
    const t = clock.elapsedTime;
    spots.forEach(([x, z], i) => {
      const lick = calm ? 1 : 0.85 + Math.sin(t * 9 + i * 1.9) * 0.2;
      o.position.set(x, 1.85 + lick * 0.12, z);
      o.scale.set(1, lick, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      {spots.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.9, z]}>
          <cylinderGeometry args={[0.04, 0.05, 1.8, 6]} />
          <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
        </mesh>
      ))}
      <instancedMesh
        ref={flames}
        args={[undefined, undefined, spots.length]}
        frustumCulled={false}
      >
        <coneGeometry args={[0.1, 0.35, 7]} />
        <meshBasicMaterial color={hdr("#ff9a3c", 2.6)} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/** The ball, the aim line and the camera for the hole in play. While a
 * round is on this holds the camera: behind the ball along the aim, then
 * riding after it as it rolls. */
function Play() {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const ball = useRef<THREE.Mesh>(null);
  const aim = useRef<THREE.Group>(null);
  const heard = useRef<PuttResult | null>(null);

  useEffect(
    () => () => {
      leaveCourse();
      if (cameraHold.by === "mini-golf") cameraHold.by = null;
    },
    [],
  );

  useFrame((_, dt) => {
    const c = getCourse();
    const playing = c.phase !== "off";
    cameraHold.by = playing ? "mini-golf" : null;
    const i = holeIndex(c.round);
    let [bx, bz] = c.round.ball;
    if (c.putt) {
      if (heard.current !== c.putt) {
        heard.current = c.putt;
        playClick();
      }
      const elapsed = (performance.now() - c.since) / 1000;
      const k = Math.min(c.putt.frames.length - 1, Math.floor(elapsed * 30));
      [bx, bz] = c.putt.frames[k];
      if (k === c.putt.frames.length - 1 && elapsed * 30 > k + 15) settle();
    }
    const [rx, rz] = holeToRoom(i, [bx, bz]);
    const holed = bx === HOLES[i].cup[0] && bz === HOLES[i].cup[1];
    const b = ball.current;
    if (b) {
      b.visible = playing;
      b.position.set(rx, BALL_RADIUS + 0.03 - (holed ? 0.06 : 0), rz);
    }
    const a = aim.current;
    if (a) {
      a.visible = c.phase === "aim" || c.phase === "power";
      a.position.set(rx, 0.04, rz);
      // the aim is clockwise from -z; three turns counter-clockwise from +z
      a.rotation.y = Math.PI - c.aim;
    }
    if (!playing) return;
    const { eye, look } = scratch;
    const dirX = Math.sin(c.aim);
    const dirZ = -Math.cos(c.aim);
    if (c.phase === "rolling") {
      eye.set(rx, 3.2, rz + 3.4);
      look.set(rx, 0, rz - 0.6);
    } else {
      eye.set(rx - dirX * 2.4, 1.6, rz - dirZ * 2.4);
      look.set(rx + dirX * 2, 0, rz + dirZ * 2);
    }
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 4));
    camera.lookAt(look);
  });

  return (
    <>
      <mesh ref={ball} visible={false}>
        <sphereGeometry args={[BALL_RADIUS, 16, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#9ad8ff"
          emissiveIntensity={0.4}
          roughness={0.3}
        />
      </mesh>
      <group ref={aim} visible={false}>
        <mesh position={[0, 0, 0.8]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.03, 1.4]} />
          <meshBasicMaterial
            color={hdr("#ffd84f", 2)}
            toneMapped={false}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>
    </>
  );
}

/**
 * Lagoon Links, out on Beachside's sand: three holes under the stars by the
 * dark sea, curbed greens with rocks in the way, a red-and-white lighthouse
 * on the third whose lamp turns, tiki torches, palms, a bench and the
 * starter's hut. Play a round of three: aim, time the power, putt.
 */
export function MiniGolf({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#0a0820"]} />
      <fog attach="fog" args={["#140c2c", 18, 60]} />
      <Stars
        radius={60}
        depth={10}
        count={900}
        factor={3}
        saturation={0.5}
        fade
        speed={calm ? 0 : 0.4}
      />
      <hemisphereLight args={["#6a5aa8", "#3a2a1a", 0.9]} />
      <pointLight
        position={[-1.5, 4, 1]}
        color="#ffc890"
        intensity={4}
        distance={14}
      />
      <Floor
        width={26}
        depth={26}
        center={[-0.5, 1]}
        color="#c9a274"
        low={{ metalness: 0, roughness: 1 }}
        onPick={onPick}
      />
      {/* the sea beyond the course, a moon's path across it */}
      <mesh position={[0, 0.01, -40]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[200, 54]} />
        <meshStandardMaterial
          color="#0b2a4a"
          emissive="#0a1a3a"
          roughness={0.15}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[8, 0.02, -40]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3, 54]} />
        <meshBasicMaterial
          color="#ffe6f4"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[8, 14, -66]}>
        <circleGeometry args={[2.4, 32]} />
        <meshBasicMaterial
          color={hdr("#ffe6f4", 1.6)}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <PortalPads room={ROOMS["mini-golf"]} color={TEAL} />
      {HOLES.map((_, i) => (
        <Green key={i} index={i} />
      ))}
      {/* each hole's number on a board by its tee */}
      {HOLE_XS.map((x, i) => (
        <NeonText
          key={x}
          text={String(i + 1)}
          color={TEAL}
          font={MARQUEE}
          width={0.9}
          k={3}
          position={[x - 1.2, 1.2, TEE_Z + 0.6]}
        />
      ))}
      <Torches />
      <Play />
      {/* the bench and the starter's hut */}
      <mesh position={[BENCH[0], 0.42, BENCH[1]]}>
        <boxGeometry args={[1.8, 0.08, 0.42]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.7} />
      </mesh>
      <mesh position={[BENCH[0], 0.7, BENCH[1] + 0.22]}>
        <boxGeometry args={[1.8, 0.4, 0.06]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.7} />
      </mesh>
      <group position={[(HUT.x0 + HUT.x1) / 2, 0, (HUT.z0 + HUT.z1) / 2]}>
        <mesh position-y={1.1}>
          <boxGeometry args={[HUT.x1 - HUT.x0, 2.2, HUT.z1 - HUT.z0]} />
          <meshStandardMaterial color="#d8b88a" roughness={0.9} />
        </mesh>
        <mesh position-y={2.45} rotation-y={Math.PI / 4}>
          <coneGeometry args={[2.4, 0.9, 4]} />
          <meshStandardMaterial color="#b89a5a" roughness={1} />
        </mesh>
        <NeonText
          text="LAGOON LINKS"
          color={TEAL}
          font={MARQUEE}
          width={2.6}
          k={3}
          position={[0, 1.75, -(HUT.z1 - HUT.z0) / 2 - 0.02]}
          rotation-y={Math.PI}
        />
      </group>
      <Suspense fallback={null}>
        <Palm position={[-9.6, 0, 7.8]} />
        <Palm position={[8.6, 0, -6.6]} scale={1.1} />
      </Suspense>
      <MiniGolfNpcs />
    </>
  );
}
