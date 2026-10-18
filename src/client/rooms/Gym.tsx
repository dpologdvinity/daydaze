import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { judgesScore, ROUTINE } from "../../game/gymnastics.ts";
import {
  BARS,
  BEAM,
  BENCH_Z,
  FLOOR_BOUNDS,
  JUDGES,
  SPRING,
  TRAMPOLINE,
  VAULT,
} from "../../game/gym.ts";
import type { Look } from "../../game/look.ts";
import { prizeDesk } from "../ui/prizeDesk.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import type { Player } from "../world/PlayerController.tsx";
import { gym, leave, routineTime, tick } from "./gym/session.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted, plant, poster } from "./shared/details.ts";
import { groundMaps, surface } from "../city/worldTexture.ts";

// a felt spring floor, suede beam, vinyl pads, rubber mats, painted block
const FELT_PILE = groundMaps("carpet").normalMap;
FELT_PILE.repeat.set(8, 8);
const SPRING_FELT = new THREE.MeshStandardMaterial({
  color: "#2e5ec8",
  normalMap: FELT_PILE,
  roughness: 0.9,
});
const SUEDE = surface("leather_white", {
  scale: 3,
  color: "#f4e8d8",
  roughness: 0.8,
});
const VINYL = surface("leather_white", {
  scale: 2.5,
  color: "#ff4fb3",
  roughness: 0.45,
});
const RUBBER = surface("rubber_tiles", { scale: 1, color: "#6a8ae8" });
const BLOCK = surface("concrete_wall_008", {
  scale: 0.4,
  color: "#6a5aa0",
  roughness: 0.9,
});
const DESK = surface("wood_veneer", { scale: 1.5, color: "#8a5a4a" });

/** Rubber landing mats under the apparatus, chalk bowls, crash pads,
 * banners and plants. */
function buildDressing() {
  const b = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (const [x, z, w, d] of [
    [BEAM.x, (BEAM.z0 + BEAM.z1) / 2, 2.2, BEAM.z1 - BEAM.z0 + 1.6],
    [BARS.x, BARS.z, 3.4, 3],
    [VAULT.x, VAULT.z, 2.2, 3],
  ] as const)
    b.add(box, RUBBER, { position: [x, 0.04, z], scale: [w, 0.08, d] });
  // folded crash pads stacked against the side walls
  for (const [x, z] of [
    [-9.3, 7.4],
    [9.3, 0.6],
  ] as const)
    for (let k = 0; k < 3; k++)
      b.add(painted(box, k % 2 ? "#2e5ec8" : PINK), GLOSS, {
        position: [x, 0.15 + k * 0.3, z],
        scale: [1.2, 0.28, 1.8],
      });
  // chalk bowls on stands by the beam and the bars
  const bowl = new THREE.CylinderGeometry(0.25, 0.18, 0.18, 12);
  const stand = new THREE.CylinderGeometry(0.03, 0.12, 0.8, 8);
  for (const [x, z] of [
    [BEAM.x + 1.4, BEAM.z1 + 0.8],
    [BARS.x + 1.8, BARS.z - 1.8],
  ] as const) {
    b.add(painted(stand, "#c8c8d4"), GLOSS, { position: [x, 0.4, z] });
    b.add(painted(bowl, "#f8f8f8"), GLOSS, { position: [x, 0.89, z] });
  }
  // the judges' table skirted, a banner run along the back wall
  b.add(box, DESK, {
    position: [0, 0.4, JUDGES.z],
    scale: [JUDGES.x1 - JUDGES.x0, 0.8, 0.6],
  });
  // clear of the scoreboard in the middle
  [-12, -8.5, -5, 5, 8.5, 12].forEach((x, k) =>
    poster(b, { x, y: 3.4, z: FLOOR_BOUNDS.z0 - 2.48 }, k + 2, 1.4, 2),
  );
  plant(b, { x: -9.4, z: -5.4 }, 1.6);
  plant(b, { x: 9.4, z: -5.4 }, 1.6);
  return b.build();
}
import { Jumbotron } from "./shared/Jumbotron.tsx";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { crowd, Stands, type Bank } from "./shared/Stands.tsx";

const PINK = "#ff4fb3";
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
const CZ = (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2;
const HEIGHT = 8;
const BANKS: readonly Bank[] = [
  { at: [-10.6, 0.4], yaw: Math.PI / 2, length: 12, rows: 4 },
  { at: [10.6, 0.4], yaw: -Math.PI / 2, length: 12, rows: 4 },
];
/** Her lap of the spring floor: corner to corner along its diagonals. */
const PATH: readonly [number, number][] = [
  [SPRING.x - 3, SPRING.z + 3],
  [SPRING.x + 3, SPRING.z - 3],
  [SPRING.x + 3, SPRING.z + 3],
  [SPRING.x - 3, SPRING.z - 3],
];

const JUMPER: Look = {
  skin: "#94603f",
  hairStyle: "top-knot",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "baby-tee-mini",
  outfitColor: "#9b5cff",
  shadow: "#7b4dff",
};
const JUDGE: Look = {
  skin: "#e6b48e",
  hairStyle: "bob",
  hairColor: "#4a2a1c",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#8a5a3c",
};

/** A gymnast bouncing on the trampoline, a full twist at every top. */
function Trampolinist() {
  const calm = useReducedMotion();
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = calm ? 0 : clock.elapsedTime;
    const phase = (t * 0.9) % 1;
    g.position.y = 0.6 + Math.sin(phase * Math.PI) * 2.2;
    g.rotation.y = calm ? 0 : phase * Math.PI * 2;
  });
  return (
    <group position={[TRAMPOLINE.x, 0, TRAMPOLINE.z]}>
      <mesh position-y={0.6} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[TRAMPOLINE.r - 0.15, 32]} />
        <meshStandardMaterial color="#14102a" roughness={0.6} />
      </mesh>
      <mesh position-y={0.6} rotation-x={Math.PI / 2}>
        <torusGeometry args={[TRAMPOLINE.r, 0.08, 8, 32]} />
        <meshStandardMaterial color={PINK} />
      </mesh>
      <group ref={ref}>
        <CrowdFigure look={JUMPER} seed={221} />
      </group>
    </group>
  );
}

/** The apparatus: balance beam, uneven bars and the vault table. */
function Apparatus() {
  const chrome = (
    <meshStandardMaterial color="#e8e8f0" metalness={0.9} roughness={0.25} />
  );
  return (
    <>
      <mesh position={[BEAM.x, 1.25, (BEAM.z0 + BEAM.z1) / 2]} material={SUEDE}>
        <boxGeometry args={[0.1, 0.16, BEAM.z1 - BEAM.z0]} />
      </mesh>
      {[BEAM.z0 + 0.6, BEAM.z1 - 0.6].map((z) => (
        <mesh key={z} position={[BEAM.x, 0.6, z]}>
          <cylinderGeometry args={[0.05, 0.12, 1.2, 8]} />
          {chrome}
        </mesh>
      ))}
      {[
        [-0.5, 1.7],
        [0.5, 2.5],
      ].map(([dz, y]) => (
        <group key={dz}>
          <mesh
            position={[BARS.x, y, BARS.z + dz]}
            rotation-x={Math.PI / 2}
            rotation-z={Math.PI / 2}
          >
            <cylinderGeometry args={[0.03, 0.03, 2.2, 10]} />
            <meshStandardMaterial color="#f4e8d8" />
          </mesh>
          {[-1.1, 1.1].map((dx) => (
            <mesh key={dx} position={[BARS.x + dx, y / 2, BARS.z + dz]}>
              <cylinderGeometry args={[0.035, 0.05, y, 8]} />
              {chrome}
            </mesh>
          ))}
        </group>
      ))}
      <group position={[VAULT.x, 0, VAULT.z]}>
        <mesh position-y={0.62} material={VINYL}>
          <boxGeometry args={[0.9, 0.2, 1.1]} />
        </mesh>
        <mesh position-y={0.3}>
          <cylinderGeometry args={[0.12, 0.3, 0.6, 10]} />
          {chrome}
        </mesh>
      </group>
    </>
  );
}

/** The judges at their table, the score shown on the board over them. */
function Judges() {
  const s = gym.use();
  const best = prizeDesk.use().bests.gymnastics;
  return (
    <>
      {[-1.6, 0, 1.6].map((x, i) => (
        <group key={x} position={[x, 0, JUDGES.z - 0.6]}>
          <CrowdFigure look={JUDGE} seed={230 + i} />
        </group>
      ))}
      <Jumbotron
        title="FLIP CITY"
        accent={PINK}
        width={4}
        lines={
          s.phase === "off"
            ? ["FLOOR", best ? `BEST ${best.toFixed(3)}` : "STEP UP"]
            : [
                judgesScore(s.routine).toFixed(3),
                s.phase === "over" ? "FINAL" : "ROUTINE",
              ]
        }
        position={[0, 4.6, FLOOR_BOUNDS.z0 - 2.3]}
      />
    </>
  );
}

/** Your routine: you run the floor's diagonals and flip at every element
 * you stick (a stumble when you miss), the camera wheeling round. */
function Routine({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const cheered = useRef(-1);

  useEffect(
    () => () => {
      leave();
      player.seat = null;
      if (cameraHold.by === "gym") cameraHold.by = null;
    },
    [player],
  );

  useFrame((_, dt) => {
    const now = performance.now();
    tick(now);
    const s = gym.get();
    cameraHold.by = s.phase !== "off" ? "gym" : null;
    if (s.phase === "off") {
      if (player.seat) player.seat = null;
      return;
    }
    const t = routineTime(now);
    // which leg of the lap she's on: one element per leg
    let i = ROUTINE.findIndex((e) => e.at > t);
    if (i < 0) i = ROUTINE.length - 1;
    const prev = i ? ROUTINE[i - 1].at : 0;
    const leg = Math.max(0, Math.min(1, (t - prev) / (ROUTINE[i].at - prev)));
    const [ax, az] = PATH[i % PATH.length];
    const [bx, bz] = PATH[(i + 1) % PATH.length];
    const x = ax + (bx - ax) * leg;
    const z = az + (bz - az) * leg;
    // the last 0.7 s of each leg is the element itself: a flip if stuck
    const mark = s.routine.marks[i];
    const air = Math.max(0, (leg - 0.65) / 0.35);
    const flips = s.phase === "routine" && mark && mark !== "miss" && !calm;
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(
      x,
      flips ? Math.sin(air * Math.PI) * 1.4 : 0.02,
      z,
    );
    player.seat.yaw = Math.atan2(bx - ax, bz - az);
    player.seat.flip = flips ? -air * Math.PI * 2 : 0;
    player.seat.sit = false;
    if (mark === "stuck" && cheered.current !== i) {
      cheered.current = i;
      crowd.cheer = 1;
    }
    eye.set(x * 0.4 + 6, 5, z * 0.4 + 9);
    look.set(x, 1, z);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2));
    camera.lookAt(look);
    if (s.phase === "over") player.seat.flip = 0;
  });
  return null;
}

/**
 * Flip City Gymnastics on the Fairground forecourt: a blue spring floor
 * under a pink neon sign, the beam and bars down one side, the vault and a
 * trampoline (with a gymnast twisting at every top) down the other, the
 * judges at their table under the scoreboard, and fans in the stands.
 * Perform the floor routine: tumble the diagonals and stick each element.
 */
export function Gym({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const calm = useReducedMotion();
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#0c0820"]} />
      <primitive object={dressing} />
      <fog attach="fog" args={["#140c2c", 16, 40]} />
      <hemisphereLight args={["#f4f0ff", "#4a3a6a", 1]} />
      <pointLight
        position={[0, 6.5, 0]}
        color="#fff4fa"
        intensity={8}
        distance={18}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, CZ]}
        color="#c8a888"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        mirror={0.2}
        low={{ metalness: 0, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.gym} color={PINK} />
      {/* the spring floor, a blue square edged in white */}
      <mesh
        position={[SPRING.x, 0.015, SPRING.z]}
        rotation-x={-Math.PI / 2}
        material={SPRING_FELT}
      >
        <planeGeometry args={[SPRING.half * 2, SPRING.half * 2]} />
      </mesh>
      <mesh position={[SPRING.x, 0.018, SPRING.z]} rotation-x={-Math.PI / 2}>
        <ringGeometry
          args={[SPRING.half * 1.38, SPRING.half * 1.42, 4, 1, Math.PI / 4]}
        />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {[
        [0, HEIGHT / 2, FLOOR_BOUNDS.z0 - 2.6, W + 10, HEIGHT, 0.2],
        [FLOOR_BOUNDS.x0 - 5, HEIGHT / 2, CZ, 0.2, HEIGHT, D],
        [FLOOR_BOUNDS.x1 + 5, HEIGHT / 2, CZ, 0.2, HEIGHT, D],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]} material={BLOCK}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}
      <NeonText
        text="Flip City"
        color={PINK}
        font={SCRIPT}
        width={5}
        k={3.8}
        position={[0, 6.9, FLOOR_BOUNDS.z0 - 2.48]}
      />
      {/* benches by the door */}
      {[-2.5, 2.5].map((x) => (
        <mesh key={x} position={[x, 0.42, BENCH_Z]} material={VINYL}>
          <boxGeometry args={[1.8, 0.08, 0.42]} />
        </mesh>
      ))}
      <Apparatus />
      <Trampolinist />
      <Judges />
      <Stands banks={BANKS} fill={0.7} seed={11} />
      <Sparkles
        count={calm ? 0 : 70}
        scale={[10, 4, 10]}
        position={[0, 3, 0]}
        size={2}
        speed={calm ? 0 : 0.2}
        color="#ffd1f0"
        opacity={0.6}
      />
      <Routine player={player} />
    </>
  );
}
