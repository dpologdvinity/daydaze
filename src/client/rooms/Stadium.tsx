import { Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playClick } from "../../audio/worldSounds.ts";
import type { Look } from "../../game/look.ts";
import { BAR_Y, goals, KICKS, POST_X } from "../../game/penalty.ts";
import { ROOMS } from "../../game/rooms.ts";
import { DUGOUT_X, GOAL, goalToRoom, PITCH, SPOT } from "../../game/stadium.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Jumbotron } from "./shared/Jumbotron.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Stands, type Bank } from "./shared/Stands.tsx";
import { StadiumNpcs } from "./stadium/Npcs.tsx";
import { directionAt, leave, penalties, tick } from "./stadium/session.ts";

const CYAN = "#4fe3ff";
const PITCH_W = PITCH.x1 - PITCH.x0;
const PITCH_D = PITCH.z1 - PITCH.z0;

const BANKS: readonly Bank[] = [
  { at: [PITCH.x0 - 0.8, 0.8], yaw: Math.PI / 2, length: 17, rows: 8 },
  { at: [PITCH.x1 + 0.8, 0.8], yaw: -Math.PI / 2, length: 17, rows: 8 },
  { at: [0, GOAL[1] - 4.2], yaw: 0, length: 26, rows: 9 },
];

const KEEPER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "low-pony",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "tracksuit-y2k",
  outfitColor: "#ffb02e",
  shadow: "#ffb02e",
};

/** The grass: mown in stripes, with the box, the arc and the spot. */
function pitchTexture() {
  const px = 24;
  return canvasTex(PITCH_W * px, PITCH_D * px, (ctx) => {
    const w = PITCH_W * px;
    const h = PITCH_D * px;
    for (let z = 0; z < h; z += 2 * px) {
      ctx.fillStyle = (z / (2 * px)) % 2 ? "#2f8a3e" : "#3a9a48";
      ctx.fillRect(0, z, w, 2 * px);
    }
    const at = (x: number, z: number): [number, number] => [
      (x - PITCH.x0) * px,
      (z - PITCH.z0) * px,
    ];
    ctx.strokeStyle = "#f4f4f0";
    ctx.lineWidth = 3;
    // the goal line, the six-yard and the eighteen-yard boxes
    const [gx0, gz] = at(PITCH.x0, GOAL[1]);
    ctx.beginPath();
    ctx.moveTo(gx0, gz);
    ctx.lineTo(w, gz);
    ctx.stroke();
    for (const [half, depth] of [
      [9.16, 5.5],
      [20.16, 16.5],
    ]) {
      const [x0, z0] = at(GOAL[0] - half, GOAL[1]);
      ctx.strokeRect(x0, z0, half * 2 * px, depth * px);
    }
    const [sx, sz] = at(SPOT[0], SPOT[1]);
    ctx.fillStyle = "#f4f4f0";
    ctx.beginPath();
    ctx.arc(sx, sz, 4, 0, Math.PI * 2);
    ctx.fill();
    const [ax, az] = at(GOAL[0], GOAL[1] + 11);
    ctx.beginPath();
    ctx.arc(ax, az, 9.15 * px, 0.93, Math.PI - 0.93);
    ctx.stroke();
  });
}

/** The goal: white posts and bar, the net hung back from them. */
function Goal() {
  const [x, z] = GOAL;
  const white = (
    <meshStandardMaterial color="#f8f8f8" roughness={0.3} metalness={0.2} />
  );
  return (
    <group position={[x, 0, z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * POST_X, BAR_Y / 2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, BAR_Y, 10]} />
          {white}
        </mesh>
      ))}
      <mesh position={[0, BAR_Y, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, POST_X * 2 + 0.12, 10]} />
        {white}
      </mesh>
      {/* the net: back, roof and sides */}
      {(
        [
          [
            [0, BAR_Y / 2, -1.8],
            [POST_X * 2, BAR_Y],
            [0, 0, 0],
          ],
          [
            [0, BAR_Y, -0.9],
            [POST_X * 2, 1.8],
            [Math.PI / 2, 0, 0],
          ],
          [
            [-POST_X, BAR_Y / 2, -0.9],
            [1.8, BAR_Y],
            [0, Math.PI / 2, 0],
          ],
          [
            [POST_X, BAR_Y / 2, -0.9],
            [1.8, BAR_Y],
            [0, Math.PI / 2, 0],
          ],
        ] as const
      ).map(([p, size, r], i) => (
        <mesh key={i} position={[...p]} rotation={[...r]}>
          <planeGeometry args={[size[0], size[1], 24, 10]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Floodlight towers at the corners: a mast and a bank of glowing lamps. */
function Floodlights() {
  const corners: [number, number][] = [
    [PITCH.x0 - 6, GOAL[1] - 7],
    [PITCH.x1 + 6, GOAL[1] - 7],
    [PITCH.x0 - 6, PITCH.z1 + 4],
    [PITCH.x1 + 6, PITCH.z1 + 4],
  ];
  return (
    <>
      {corners.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position-y={9}>
            <cylinderGeometry args={[0.18, 0.3, 18, 8]} />
            <meshStandardMaterial color="#2a2440" metalness={0.5} />
          </mesh>
          <mesh
            position-y={18.4}
            rotation-y={Math.atan2(-x, GOAL[1] + 4 - z)}
            rotation-x={-0.4}
          >
            <boxGeometry args={[3, 1.6, 0.3]} />
            <meshBasicMaterial color={hdr("#f4f8ff", 2.4)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** The scoreboard over the end stand: goals so far out of the kicks. */
function Board() {
  const s = penalties.use();
  const taken = s.game.results.length;
  return (
    <Jumbotron
      title="SEASIDE STADIUM"
      accent={CYAN}
      width={6}
      lines={
        s.phase === "off"
          ? ["PENALTIES", "STEP UP TO THE SPOT"]
          : [
              `${goals(s.game)} - ${taken - goals(s.game)}`,
              `KICK ${Math.min(taken + 1, KICKS)} OF ${KICKS}`,
            ]
      }
      position={[0, 9.5, GOAL[1] - 10]}
    />
  );
}

/** The keeper, the ball and the camera while you're taking kicks. */
function Play() {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const keeper = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Mesh>(null);
  const heard = useRef<unknown>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useEffect(
    () => () => {
      leave();
      if (cameraHold.by === "stadium") cameraHold.by = null;
    },
    [],
  );

  useFrame((_, dt) => {
    const now = performance.now();
    tick(now);
    const s = penalties.get();
    const playing = s.phase !== "off";
    cameraHold.by = playing ? "stadium" : null;
    const k = keeper.current;
    const b = ball.current;
    const elapsed = (now - s.since) / 1000;
    if (s.phase === "flying" && s.kick) {
      if (heard.current !== s.kick) {
        heard.current = s.kick;
        playClick();
      }
      const i = Math.min(s.kick.frames.length - 1, Math.floor(elapsed * 30));
      const [x, y, z] = s.kick.frames[i];
      const [rx, rz] = goalToRoom([x, z]);
      if (b) {
        b.position.set(rx, 0.11 + y, rz);
        b.rotation.x -= dt * 14;
      }
      // the keeper leaves her line and dives the way she guessed
      if (k) {
        const t = calm
          ? 1
          : Math.min(1, Math.max(0, (elapsed - s.kick.dive.at) / 0.35));
        const { x: dx, y: dy } = s.kick.dive;
        k.position.set(
          GOAL[0] + dx * t * 0.9,
          Math.max(0, dy - 0.9) * t,
          GOAL[1] + 0.4,
        );
        k.rotation.z = -Math.sign(dx) * t * 1.25;
      }
    } else {
      if (b) b.position.set(SPOT[0], 0.11, SPOT[1]);
      if (k) {
        // bouncing on her toes on the line
        k.position.set(
          GOAL[0],
          calm ? 0 : Math.abs(Math.sin(now / 260)) * 0.06,
          GOAL[1] + 0.4,
        );
        k.rotation.z = 0;
      }
    }
    if (!playing) return;
    // behind the spot, looking at the goal; aiming swings the view a touch
    const sweep = s.phase === "aim" ? directionAt(now, s.since) : s.direction;
    eye.set(SPOT[0] - sweep * 0.6, 1.9, SPOT[1] + 4.2);
    look.set(GOAL[0] + sweep * 1.2, 1.1, GOAL[1]);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
  });

  return (
    <>
      <group ref={keeper} position={[GOAL[0], 0, GOAL[1] + 0.4]}>
        <CrowdFigure look={KEEPER_LOOK} seed={160} />
      </group>
      <mesh ref={ball} position={[SPOT[0], 0.11, SPOT[1]]}>
        <icosahedronGeometry args={[0.11, 1]} />
        <meshStandardMaterial color="#f8f8f8" roughness={0.5} flatShading />
      </mesh>
    </>
  );
}

/**
 * Seaside Stadium, the football ground on the Fairground forecourt: the
 * penalty end under floodlights and the stars, a goal with its net, stands
 * packed round three sides and a scoreboard over the end. Take five
 * penalties against the keeper.
 */
export function Stadium({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  const grass = useMemo(pitchTexture, []);
  return (
    <>
      <color attach="background" args={["#060818"]} />
      <fog attach="fog" args={["#0a0e24", 30, 80]} />
      <Stars
        radius={80}
        depth={10}
        count={700}
        factor={3}
        fade
        speed={calm ? 0 : 0.3}
      />
      <hemisphereLight args={["#e8f0ff", "#1a3a1a", 1.1]} />
      <pointLight
        position={[0, 14, -2]}
        color="#f4f8ff"
        intensity={10}
        distance={34}
      />
      <Floor
        width={PITCH_W}
        depth={PITCH_D}
        center={[(PITCH.x0 + PITCH.x1) / 2, (PITCH.z0 + PITCH.z1) / 2]}
        color="#ffffff"
        map={grass}
        low={{ metalness: 0, roughness: 0.95 }}
        onPick={onPick}
      />
      {/* grass beyond the walkable pitch, under the stands */}
      <mesh position={[0, -0.01, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1f5a2a" roughness={1} />
      </mesh>
      <PortalPads room={ROOMS.stadium} color={CYAN} />
      <Goal />
      <Floodlights />
      <Stands banks={BANKS} fill={0.85} seed={7} />
      <Board />
      {/* the dugout's bench, under a perspex roof */}
      <mesh position={[DUGOUT_X - 0.35, 0.42, 0]}>
        <boxGeometry args={[0.45, 0.08, 3.4]} />
        <meshStandardMaterial color="#2e7dff" />
      </mesh>
      <mesh position={[DUGOUT_X - 0.4, 2, 0]}>
        <boxGeometry args={[1, 0.06, 3.8]} />
        <meshStandardMaterial color="#cfe8ff" transparent opacity={0.4} />
      </mesh>
      <Play />
      <StadiumNpcs />
    </>
  );
}
