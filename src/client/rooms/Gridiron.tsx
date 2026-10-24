// The Gridiron football field: field texture, goalposts, scoreboard and the
// field-goal kick animation with its follow camera. Goal and field coordinates
// come from game/gridiron.ts and are mapped to room space with fieldToRoom.

import { Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playClick } from "../../audio/worldSounds.ts";
import {
  CROSSBAR_Y,
  made,
  UPRIGHT_TOP,
  UPRIGHT_X,
} from "../../game/fieldGoal.ts";
import { BENCH_X, fieldToRoom, GOAL } from "../../game/gridiron.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import { GridironNpcs } from "./gridiron/Npcs.tsx";
import { current, fieldGoals, leave, tick } from "./gridiron/session.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted, poster } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

const BENCH = surface("plastic", { scale: 1, color: "#c2185b" });

/** A Gatorade-style cooler table, footballs and helmets by the bench, and
 * ad boards along the sideline. */
function buildDressing() {
  const b = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const ball = new THREE.SphereGeometry(0.1, 10, 8);
  const helmet = new THREE.SphereGeometry(
    0.14,
    12,
    8,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.6,
  );
  const cooler = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 12);
  b.add(painted(box, "#e8e8f0"), GLOSS, {
    position: [BENCH_X + 0.3, 0.4, 3.2],
    scale: [0.6, 0.04, 1.2],
  });
  for (const z of [2.9, 3.5])
    b.add(painted(cooler, "#ff8a3d"), GLOSS, {
      position: [BENCH_X + 0.3, 0.65, z],
    });
  for (let k = 0; k < 4; k++) {
    b.add(painted(helmet, k % 2 ? GOLD : "#c2185b"), GLOSS, {
      position: [BENCH_X + 0.1, 0.02, -1.2 + k * 0.6],
    });
    b.add(painted(ball, "#7a3a14"), GLOSS, {
      position: [BENCH_X - 0.15, 0.07, -1 + k * 0.6],
      scale: [1, 1, 1.6],
    });
  }
  for (let k = 0; k < 6; k++) {
    const z = -6 + k * 2.8;
    b.add(painted(box, "#141020"), GLOSS, {
      position: [-FIELD_EDGE, 0.4, z],
      scale: [0.1, 0.8, 2.6],
    });
    poster(
      b,
      { x: -FIELD_EDGE + 0.07, y: 0.4, z, ry: Math.PI / 2 },
      k + 1,
      2.4,
      0.6,
    );
  }
  return b.build();
}
const FIELD_EDGE = 11;
import { Jumbotron } from "./shared/Jumbotron.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Stands, type Bank } from "./shared/Stands.tsx";

const GOLD = "#ffd84f";
const PITCH_W = 60;
const PITCH_D = 70;

const BANKS: readonly Bank[] = [
  { at: [-13, -14], yaw: Math.PI / 2, length: 34, rows: 8 },
  { at: [13, -14], yaw: -Math.PI / 2, length: 34, rows: 8 },
  { at: [0, GOAL[1] - 8], yaw: 0, length: 26, rows: 9 },
];

/** The field: stripes every five yards, numbers and the end zone. */
function fieldTexture() {
  const px = 12;
  return canvasTex(PITCH_W * px, PITCH_D * px, (ctx) => {
    const w = PITCH_W * px;
    const h = PITCH_D * px;
    ctx.fillStyle = "#2f8a3e";
    ctx.fillRect(0, 0, w, h);
    // the field runs towards the goal at the top of the texture
    const goalZ = 10 * px;
    ctx.fillStyle = "#c2185b";
    ctx.fillRect(0, 0, w, goalZ);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${5 * px}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("DAYDAZE", w / 2, goalZ - 3 * px);
    ctx.strokeStyle = "#f4f4f0";
    ctx.lineWidth = 3;
    for (let yd = 0; yd <= 60; yd += 5) {
      const z = goalZ + yd * 0.9144 * px;
      ctx.beginPath();
      ctx.moveTo(0, z);
      ctx.lineTo(w, z);
      ctx.stroke();
      if (yd && yd % 10 === 0) {
        ctx.fillStyle = "#f4f4f0";
        ctx.font = `800 ${3 * px}px sans-serif`;
        ctx.fillText(String(yd), w * 0.18, z + px);
        ctx.fillText(String(yd), w * 0.82, z + px);
      }
    }
  });
}

/** The yellow goalposts: a post up from the end line, the crossbar and two
 * tall uprights. */
function Goalposts() {
  const gold = (
    <meshStandardMaterial
      color={GOLD}
      emissive={GOLD}
      emissiveIntensity={0.3}
      metalness={0.4}
      roughness={0.35}
    />
  );
  return (
    <group position={[GOAL[0], 0, GOAL[1] - 2]}>
      <mesh position-y={CROSSBAR_Y / 2}>
        <cylinderGeometry args={[0.1, 0.12, CROSSBAR_Y, 10]} />
        {gold}
      </mesh>
      <mesh position={[0, CROSSBAR_Y, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.08, 0.08, UPRIGHT_X * 2, 10]} />
        {gold}
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * UPRIGHT_X, (CROSSBAR_Y + UPRIGHT_TOP) / 2, 0]}
        >
          <cylinderGeometry args={[0.06, 0.06, UPRIGHT_TOP - CROSSBAR_Y, 10]} />
          {gold}
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * UPRIGHT_X, UPRIGHT_TOP + 0.3, 0]}>
          <planeGeometry args={[0.15, 0.6]} />
          <meshBasicMaterial
            color={hdr("#ff2f4f", 1.6)}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Board() {
  const s = fieldGoals.use();
  const { distance } = current();
  return (
    <Jumbotron
      title="THE GRIDIRON"
      accent={GOLD}
      width={6}
      lines={
        s.phase === "off"
          ? ["FIELD GOALS", "STEP UP"]
          : [
              `${made(s.series)} GOOD`,
              s.phase === "over"
                ? "FINAL"
                : `${Math.round(distance * 1.094)} YARDS`,
            ]
      }
      position={[0, 12, GOAL[1] - 14]}
    />
  );
}

/** The ball on its tee, its flight, and the camera behind the kick. */
function Kick() {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const ball = useRef<THREE.Mesh>(null);
  const heard = useRef<unknown>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      leave();
      if (cameraHold.by === "gridiron") cameraHold.by = null;
    },
    [],
  );
  useFrame((_, dt) => {
    const now = performance.now();
    tick(now);
    const s = fieldGoals.get();
    cameraHold.by = s.phase !== "off" ? "gridiron" : null;
    const b = ball.current;
    const { distance } = current();
    const [tx, tz] = fieldToRoom([0, distance]);
    if (b) {
      if (s.phase === "flying" && s.kick) {
        if (heard.current !== s.kick) {
          heard.current = s.kick;
          playClick();
        }
        const i = Math.min(
          s.kick.frames.length - 1,
          Math.floor(((now - s.since) / 1000) * 30),
        );
        const [x, y, z] = s.kick.frames[i];
        const [rx, rz] = fieldToRoom([x, z]);
        b.position.set(rx, 0.2 + y, rz);
        if (!calm) b.rotation.x -= dt * 12;
      } else {
        b.position.set(tx, 0.2, tz);
        b.rotation.set(0.3, 0, 0);
      }
    }
    if (s.phase === "off") return;
    const follow = s.phase === "flying" && b ? b.position.z + 7 : tz + 7;
    eye.set(0, 2.6, follow);
    look.set(0, 2.2, GOAL[1] - 2);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
  });
  return (
    <mesh ref={ball} scale={[0.11, 0.11, 0.18]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial color="#7a3a14" roughness={0.6} />
    </mesh>
  );
}

/**
 * The Gridiron on the Fairground forecourt: a floodlit American football
 * field under the stars, its pink end zone painted DAYDAZE, yellow
 * goalposts, packed stands and a scoreboard. Kick five field goals, each
 * from further out with a crosswind to aim into.
 */
export function Gridiron({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  const turf = useMemo(fieldTexture, []);
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#060818"]} />
      <fog attach="fog" args={["#0a0e24", 40, 110]} />
      <Stars
        radius={90}
        depth={10}
        count={700}
        factor={3}
        fade
        speed={calm ? 0 : 0.3}
      />
      <hemisphereLight args={["#e8f0ff", "#1a3a1a", 1.1]} />
      <pointLight
        position={[0, 16, -6]}
        color="#f4f8ff"
        intensity={12}
        distance={44}
      />
      <Floor
        width={PITCH_W}
        depth={PITCH_D}
        center={[0, GOAL[1] - 10 + PITCH_D / 2]}
        color="#ffffff"
        map={turf}
        texture={{ id: "leafy_grass", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.95 }}
        onPick={onPick}
      />
      <primitive object={dressing} />
      <PortalPads room={ROOMS.gridiron} color={GOLD} />
      <Goalposts />
      <Stands banks={BANKS} fill={0.85} seed={13} />
      <Board />
      {/* floodlight banks over the stands */}
      {[-16, 16].map((x) => (
        <mesh
          key={x}
          position={[x, 20, GOAL[1] - 4]}
          rotation-y={x < 0 ? -0.6 : 0.6}
        >
          <boxGeometry args={[4, 1.6, 0.3]} />
          <meshBasicMaterial color={hdr("#f4f8ff", 2.4)} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[BENCH_X + 0.35, 0.42, 0.5]} material={BENCH}>
        <boxGeometry args={[0.45, 0.08, 3.6]} />
      </mesh>
      <GridironNpcs />
      <Kick />
    </>
  );
}
