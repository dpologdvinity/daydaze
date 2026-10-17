import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Look } from "../../../game/look.ts";
import { POOL, SEAL_SPOT, SHOW, type Trick } from "../../../game/sealShow.ts";
import { useReducedMotion } from "../../motion.ts";
import { cameraHold } from "../../world/cameraHold.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { hdr } from "../shared/materials.ts";
import { sealShow } from "./session.ts";

const TRAINER_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "ponytail",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "shorts",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

const SEAL = "#4a4a58";

/**
 * The show pool and Pepper the seal on her rock. She bobs and looks about
 * between cues; a stuck cue sets off the trick (a wave, a nose balance, a
 * barrel roll, a dive through the hoop, a clap, a backflip, a bow). The
 * camera comes round to the pool while the show's on.
 */
export function SealShow() {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const seal = useRef<THREE.Group>(null);
  const flipper = useRef<THREE.Mesh>(null);
  const ball = useRef<THREE.Mesh>(null);
  const hoop = useRef<THREE.Mesh>(null);
  const eye = useMemo(() => new THREE.Vector3(2.4, 2.6, 7.4), []);
  const look = useMemo(
    () => new THREE.Vector3(SEAL_SPOT[0], 1, SEAL_SPOT[1]),
    [],
  );
  useEffect(
    () => () => {
      sealShow.leave();
      if (cameraHold.by === "aquarium") cameraHold.by = null;
    },
    [],
  );
  useFrame(({ clock }, dt) => {
    const now = performance.now();
    sealShow.tick(now);
    const s = sealShow.store.get();
    cameraHold.by = s.phase !== "off" ? "aquarium" : null;
    const g = seal.current;
    if (!g) return;
    const t = sealShow.routineTime(now);
    // the trick under way, if its cue was stuck: 0..1 through it
    let trick: Trick | null = null;
    let f = 0;
    for (const [i, e] of SHOW.entries()) {
      if (s.routine.marks[i] !== "stuck" || calm) continue;
      const k = (t - (e.at - 0.2)) / 1.2;
      if (k >= 0 && k <= 1) {
        trick = e.trick;
        f = k;
      }
    }
    const bob = calm ? 0 : Math.sin(clock.elapsedTime * 2) * 0.03;
    g.position.set(SEAL_SPOT[0], 0.75 + bob, SEAL_SPOT[1]);
    g.rotation.set(
      0,
      -0.4 + (calm ? 0 : Math.sin(clock.elapsedTime * 0.7) * 0.3),
      0,
    );
    if (flipper.current) flipper.current.rotation.z = 0.4;
    if (ball.current) ball.current.visible = false;
    if (hoop.current) hoop.current.visible = s.phase === "routine";
    const arc = Math.sin(f * Math.PI);
    switch (trick) {
      case "wave":
        if (flipper.current)
          flipper.current.rotation.z = 0.4 + Math.sin(f * Math.PI * 6) * 0.8;
        break;
      case "ball":
        if (ball.current) {
          ball.current.visible = true;
          ball.current.position.set(0, 1.0 + arc * 0.8, 0.55);
        }
        break;
      case "spin":
        g.rotation.z = f * Math.PI * 2;
        break;
      case "hoop":
        g.position.y += arc * 1.6;
        g.position.x -= Math.sin(f * Math.PI) * 0.6;
        g.rotation.z = (f - 0.5) * 1.2;
        break;
      case "clap":
        if (flipper.current)
          flipper.current.rotation.z =
            0.4 + Math.abs(Math.sin(f * Math.PI * 8)) * 1.1;
        break;
      case "flip":
        g.position.y += arc * 1.2;
        g.rotation.x = -f * Math.PI * 2;
        break;
      case "bow":
        g.rotation.x = arc * 0.7;
        break;
    }
    if (s.phase === "off") return;
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2.5));
    camera.lookAt(look);
  });
  const cx = (POOL.x0 + POOL.x1) / 2;
  const cz = (POOL.z0 + POOL.z1) / 2;
  return (
    <>
      {/* the pool: a rim a step up, the water, and Pepper's rock */}
      <mesh position={[cx, 0.3, cz]}>
        <boxGeometry args={[POOL.x1 - POOL.x0, 0.6, POOL.z1 - POOL.z0]} />
        <meshStandardMaterial color="#2f5a7a" roughness={0.6} />
      </mesh>
      <mesh position={[cx, 0.61, cz]} rotation-x={-Math.PI / 2}>
        <planeGeometry
          args={[POOL.x1 - POOL.x0 - 0.3, POOL.z1 - POOL.z0 - 0.3]}
        />
        <meshBasicMaterial color={hdr("#1fa6c9", 1.2)} />
      </mesh>
      <mesh
        position={[SEAL_SPOT[0], 0.55, SEAL_SPOT[1]]}
        scale={[0.7, 0.35, 0.6]}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#6a6070" roughness={0.9} flatShading />
      </mesh>
      {/* the hoop she dives through, held out over the water */}
      <mesh
        ref={hoop}
        position={[SEAL_SPOT[0] - 0.6, 2.1, SEAL_SPOT[1]]}
        rotation-y={Math.PI / 2}
        visible={false}
      >
        <torusGeometry args={[0.45, 0.04, 8, 28]} />
        <meshBasicMaterial color={hdr("#ff4fb3", 1.6)} toneMapped={false} />
      </mesh>
      {/* Pepper: a sleek body sitting up, head, nose, flippers */}
      <group ref={seal}>
        <mesh position-y={0.35} rotation-x={-0.5} scale={[0.32, 0.55, 0.3]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color={SEAL} roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.85, 0.22]} scale={[0.2, 0.19, 0.22]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color={SEAL} roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.82, 0.44]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshStandardMaterial color="#141018" />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.08, 0.9, 0.4]}>
            <sphereGeometry args={[0.025, 6, 4]} />
            <meshBasicMaterial color="#05030c" />
          </mesh>
        ))}
        <mesh
          ref={flipper}
          position={[0.3, 0.4, 0.1]}
          scale={[0.28, 0.06, 0.12]}
        >
          <sphereGeometry args={[1, 10, 6]} />
          <meshStandardMaterial color={SEAL} />
        </mesh>
        <mesh
          position={[-0.3, 0.4, 0.1]}
          rotation-z={-0.4}
          scale={[0.28, 0.06, 0.12]}
        >
          <sphereGeometry args={[1, 10, 6]} />
          <meshStandardMaterial color={SEAL} />
        </mesh>
        <mesh ref={ball} visible={false}>
          <sphereGeometry args={[0.14, 14, 10]} />
          <meshStandardMaterial
            color="#ff2f9a"
            emissive="#ff2f9a"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
      <group
        position={[POOL.x0 - 0.5, 0, POOL.z1 - 0.6]}
        rotation-y={Math.PI / 2}
      >
        <CrowdFigure look={TRAINER_LOOK} seed={291} />
      </group>
    </>
  );
}
