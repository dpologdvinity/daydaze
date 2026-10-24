// The Dome basketball arena: court texture, hoop, scoreboard, the arc's
// shooting spots and the Hot Shots shot animation with its follow camera. Court
// and hoop coordinates come from game/dome.ts and are mapped to room space with
// courtToRoom.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { playClick } from "../../audio/worldSounds.ts";
import { BENCH_X, COURT, courtToRoom, HOOP } from "../../game/dome.ts";
import {
  BALL_RADIUS,
  BOARD,
  RIM_RADIUS,
  RIM_Y,
  spotFor,
  SPOTS,
  type ShotResult,
} from "../../game/hoops.ts";
import { prizeDesk } from "../ui/prizeDesk.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import { DomeNpcs } from "./dome/Npcs.tsx";
import { aimAt, hoops, leave, tick, timeLeft } from "./dome/session.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted, plant, poster } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";
import { Jumbotron } from "./shared/Jumbotron.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Stands, type Bank } from "./shared/Stands.tsx";

const ORANGE = "#ff8a3d";
const COURT_W = COURT.x1 - COURT.x0;
const COURT_D = COURT.z1 - COURT.z0;
const COURT_CZ = (COURT.z0 + COURT.z1) / 2;

const BANKS: readonly Bank[] = [
  { at: [COURT.x0 - 0.6, 1.2], yaw: Math.PI / 2, length: 15, rows: 6 },
  { at: [COURT.x1 + 0.6, 1.2], yaw: -Math.PI / 2, length: 15, rows: 6 },
  { at: [0, COURT.z0 - 0.8], yaw: 0, length: 15, rows: 7 },
];

const BENCH = surface("wood_veneer", {
  scale: 1.5,
  color: "#c08a5a",
  roughness: 0.4,
});

/** A ball cart and water by the bench, banners round the bowl. */
function buildDressing() {
  const b = new Batch();
  const ball = new THREE.SphereGeometry(0.12, 12, 8);
  const box = new THREE.BoxGeometry(1, 1, 1);
  // a rolling ball cart: two rails of basketballs on a chrome frame
  const cart: [number, number] = [BENCH_X - 0.2, 6.4];
  for (const y of [0.35, 0.7]) {
    b.add(box, BENCH, {
      position: [cart[0], y - 0.08, cart[1]],
      scale: [0.5, 0.03, 1.1],
    });
    for (let k = 0; k < 4; k++)
      b.add(painted(ball, ORANGE), GLOSS, {
        position: [cart[0], y + 0.05, cart[1] - 0.39 + k * 0.26],
      });
  }
  // water bottles and towels along the bench
  for (let k = 0; k < 6; k++) {
    b.add(
      painted(
        new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8),
        k % 2 ? "#4fe3ff" : "#ff4fb3",
      ),
      GLOSS,
      {
        position: [BENCH_X + 0.3, 0.57, 2.4 + k * 0.5],
      },
    );
    b.add(painted(box, "#f4f0ff"), GLOSS, {
      position: [BENCH_X + 0.3, 0.47, 2.6 + k * 0.5],
      scale: [0.3, 0.02, 0.2],
    });
  }
  // championship banners hung round the bowl
  for (const [x, z, d] of [
    [-6, -8.2, 5],
    [-2, -8.6, 0],
    [2, -8.6, 4],
    [6, -8.2, 1],
  ] as const)
    poster(b, { x, y: 5.2, z }, d, 1, 1.6);
  plant(b, { x: 7.2, z: 8.4 }, 1.3);
  plant(b, { x: -7.2, z: 8.4 }, 1.3);
  return b.build();
}

/** The court's paint: maple boards with the key, the arc and the spots. */
function courtTexture() {
  const px = 40;
  return canvasTex(COURT_W * px, COURT_D * px, (ctx) => {
    const w = COURT_W * px;
    const h = COURT_D * px;
    ctx.fillStyle = "#c98a4e";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 12) {
      ctx.fillStyle = x % 24 ? "rgba(90,40,10,0.08)" : "rgba(255,230,190,0.08)";
      ctx.fillRect(x, 0, 6, h);
    }
    // court space to canvas: x across, z down the texture from the far end
    const at = (x: number, z: number): [number, number] => [
      (HOOP[0] + x - COURT.x0) * px,
      (HOOP[1] + z - COURT.z0) * px,
    ];
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    // the key
    ctx.fillStyle = "rgba(255,79,179,0.55)";
    const [kx, kz] = at(-2.45, -1.2);
    ctx.fillRect(kx, kz, 4.9 * px, 5.8 * px);
    ctx.strokeRect(kx, kz, 4.9 * px, 5.8 * px);
    // the free-throw circle and the three-point arc
    const [cx, cz] = at(0, 4.6);
    ctx.beginPath();
    ctx.arc(cx, cz, 1.8 * px, 0, Math.PI * 2);
    ctx.stroke();
    const [rx, rz] = at(0, 0);
    ctx.beginPath();
    ctx.arc(rx, rz, 6.75 * px, 0.1, Math.PI - 0.1);
    ctx.stroke();
    // the center circle at the near end
    const [mx, mz] = at(0, 12.6);
    ctx.beginPath();
    ctx.arc(mx, mz, 1.8 * px, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** The hoop: stanchion, arm, glass board with its square, the orange rim
 * and a net. */
function Hoop() {
  const [x, z] = HOOP;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.5, -1.5]}>
        <boxGeometry args={[0.6, 3, 0.5]} />
        <meshStandardMaterial color="#1a1428" roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.3, (-1.5 + BOARD.z) / 2]}>
        <boxGeometry args={[0.15, 0.15, 1.5 + BOARD.z]} />
        <meshStandardMaterial color="#2a2440" metalness={0.6} />
      </mesh>
      <mesh position={[0, (BOARD.y0 + BOARD.y1) / 2, BOARD.z - 0.03]}>
        <boxGeometry args={[BOARD.x * 2, BOARD.y1 - BOARD.y0, 0.04]} />
        <meshStandardMaterial
          color="#cfe8ff"
          transparent
          opacity={0.35}
          roughness={0.05}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, RIM_Y + 0.25, BOARD.z - 0.005]}>
        <planeGeometry args={[0.6, 0.45]} />
        <meshBasicMaterial
          color={hdr(ORANGE, 1.2)}
          toneMapped={false}
          wireframe
        />
      </mesh>
      <mesh position={[0, RIM_Y, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[RIM_RADIUS, 0.012, 8, 32]} />
        <meshStandardMaterial color={ORANGE} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, RIM_Y - 0.22, 0]}>
        <cylinderGeometry
          args={[RIM_RADIUS, RIM_RADIUS * 0.6, 0.42, 16, 3, true]}
        />
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

/** Rings on the floor at each shooting spot; the money spot's in gold, and
 * the spot you're on next glows. */
function Spots() {
  const s = hoops.use();
  const next = s.phase === "off" ? -1 : s.game.shots % SPOTS.length;
  return (
    <>
      {SPOTS.map(({ at, points }, i) => {
        const [x, z] = courtToRoom(at);
        return (
          <mesh key={i} position={[x, 0.02, z]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.24, 0.32, 24]} />
            <meshBasicMaterial
              color={hdr(
                points === 3 ? "#ffd84f" : "#ffffff",
                i === next ? 2.6 : 0.9,
              )}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

/** The hanging scoreboard: score and clock while you play. */
function Board() {
  const s = hoops.use();
  const best = prizeDesk.use().bests.hoops;
  // the clock face only shows whole seconds: re-read it four times a second
  const [, setBeat] = useState(0);
  const running = s.phase !== "off" && s.phase !== "over";
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setBeat((b) => b + 1), 250);
    return () => window.clearInterval(id);
  }, [running]);
  const seconds = Math.ceil(timeLeft(performance.now()));
  return (
    <Jumbotron
      title="HOT SHOTS"
      accent={ORANGE}
      width={4.4}
      lines={
        s.phase === "off"
          ? ["THE DOME", `BEST ${best ?? 0}`]
          : [
              `${s.game.points} PTS`,
              s.phase === "over"
                ? "FINAL"
                : `0:${String(seconds).padStart(2, "0")}`,
            ]
      }
      position={[0, 7.2, HOOP[1] + 4]}
      rotation={[0.2, 0, 0]}
    />
  );
}

/** The ball and the camera while a game is on. */
function Play() {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const ball = useRef<THREE.Mesh>(null);
  const heard = useRef<ShotResult | null>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useEffect(
    () => () => {
      leave();
      if (cameraHold.by === "dome") cameraHold.by = null;
    },
    [],
  );

  useFrame((_, dt) => {
    const now = performance.now();
    tick(now);
    const s = hoops.get();
    const playing = s.phase !== "off";
    cameraHold.by = playing ? "dome" : null;
    const spot = spotFor(s.game).at;
    const [sx, sz] = courtToRoom(spot);
    const b = ball.current;
    if (b) {
      b.visible = playing;
      if (s.phase === "flying" && s.shot) {
        if (heard.current !== s.shot) {
          heard.current = s.shot;
          playClick();
        }
        const k = Math.min(
          s.shot.frames.length - 1,
          Math.floor(((now - s.since) / 1000) * 30),
        );
        const [x, y, z] = s.shot.frames[k];
        const [rx, rz] = courtToRoom([x, z]);
        b.position.set(rx, y, rz);
        b.rotation.x -= dt * 8;
      } else {
        // in the shooter's hands at the spot
        b.position.set(sx, 1.4, sz - 0.3);
      }
    }
    if (!playing) return;
    // behind the spot, looking up at the rim; aiming swings the view a touch
    const sweep = s.phase === "aim" ? aimAt(now, s.since) : s.aim;
    const back = Math.atan2(spot[0], spot[1]) + sweep * 3;
    eye.set(sx + Math.sin(back) * 2.6, 2.4, sz + Math.cos(back) * 2.6);
    look.set(HOOP[0], RIM_Y - 0.3, HOOP[1]);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
  });

  return (
    <mesh ref={ball} visible={false}>
      <sphereGeometry args={[BALL_RADIUS, 20, 14]} />
      <meshStandardMaterial color="#e2652a" roughness={0.7} />
    </mesh>
  );
}

/**
 * The Dome, the basketball arena on the Fairground forecourt: a maple court
 * painted pink in the key, one hoop under a hanging scoreboard, stands
 * packed down both sides and behind the basket, and a courtside bench.
 * Play Hot Shots: sixty seconds, shooting from spots round the arc.
 */
export function Dome({ onPick }: { onPick: PickHandler }) {
  const floor = useMemo(courtTexture, []);
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#08061a"]} />
      <fog attach="fog" args={["#0e0a24", 18, 46]} />
      <hemisphereLight args={["#d8d0ff", "#3a2a40", 0.9]} />
      <pointLight
        position={[0, 8, -1]}
        color="#fff4e0"
        intensity={8}
        distance={22}
      />
      <pointLight
        position={[0, 6, 6]}
        color="#ffd8b0"
        intensity={4}
        distance={16}
      />
      <Floor
        width={COURT_W}
        depth={COURT_D}
        center={[(COURT.x0 + COURT.x1) / 2, COURT_CZ]}
        color="#ffffff"
        map={floor}
        texture={{ id: "wood_floor", scale: 0.8 }}
        mirror={0.25}
        low={{ metalness: 0, roughness: 0.45 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.dome} color={ORANGE} />
      {/* the roof: a dark bowl overhead, ringed with light */}
      <mesh position={[0, 0, 0]} scale={[16, 12, 16]}>
        <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#120c28"
          side={THREE.BackSide}
          roughness={1}
        />
      </mesh>
      <mesh position={[0, 9.5, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[9, 0.06, 8, 64]} />
        <meshBasicMaterial color={hdr(ORANGE, 2.4)} toneMapped={false} />
      </mesh>
      <Hoop />
      <Spots />
      <Board />
      <Stands banks={BANKS} fill={0.8} seed={3} />
      <NeonText
        text="THE DOME"
        color={ORANGE}
        font={MARQUEE}
        width={5}
        k={3.6}
        position={[0, 6.6, COURT.z0 - 5]}
      />
      {/* the courtside bench */}
      <mesh position={[BENCH_X + 0.3, 0.42, 3.8]} material={BENCH}>
        <boxGeometry args={[0.45, 0.08, 3.4]} />
      </mesh>
      <primitive object={dressing} />
      <Play />
      <DomeNpcs />
    </>
  );
}
