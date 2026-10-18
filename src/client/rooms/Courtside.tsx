import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playClick } from "../../audio/worldSounds.ts";
import {
  BENCH_X,
  COURT,
  FLOOR_BOUNDS,
  PRO,
  YOU,
} from "../../game/courtside.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { sideOf } from "../../game/tennis.ts";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "../world/PlayerController.tsx";
import { placePlayer } from "../world/PlayerController.tsx";
import { cameraHold } from "../world/cameraHold.ts";
import { CourtsideNpcs } from "./courtside/Npcs.tsx";
import { leave, OUTGOING, tennis, tick } from "./courtside/session.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted, plant } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

const TEAK = surface("wood_veneer", { scale: 1.5, color: "#c89a6a" });

/** The umpire's chair at the net, a ball hopper, towels and water by the
 * bench, and planters at the corners. */
function buildDressing() {
  const b = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const leg = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6);
  const ux = COURT.doubles + 1.3;
  for (const dx of [-0.25, 0.25])
    for (const dz of [-0.25, 0.25])
      b.add(painted(leg, "#e8e8f0"), GLOSS, {
        position: [ux + dx, 0.9, dz],
        rotation: [dz * 0.2, 0, -dx * 0.2],
      });
  b.add(box, TEAK, { position: [ux, 1.85, 0], scale: [0.55, 0.06, 0.55] });
  b.add(box, TEAK, {
    position: [ux + 0.25, 2.15, 0],
    scale: [0.05, 0.6, 0.55],
  });
  for (let k = 0; k < 5; k++)
    b.add(box, TEAK, {
      position: [ux - 0.35, 0.3 + k * 0.32, 0],
      scale: [0.05, 0.03, 0.4],
    });
  // a wire hopper of balls
  const ball = new THREE.SphereGeometry(0.034, 8, 6);
  for (let k = 0; k < 16; k++)
    b.add(painted(ball, LIME), GLOSS, {
      position: [
        BENCH_X - 0.6 + (k % 4) * 0.07,
        0.75 + Math.floor(k / 8) * 0.06,
        4.4 + (Math.floor(k / 4) % 2) * 0.07,
      ],
    });
  b.add(
    painted(
      new THREE.CylinderGeometry(0.16, 0.12, 0.7, 10, 1, true),
      "#3a3a48",
    ),
    GLOSS,
    {
      position: [BENCH_X - 0.5, 0.4, 4.43],
    },
  );
  for (let k = 0; k < 4; k++) {
    b.add(painted(box, k % 2 ? "#ff4fb3" : "#f4f4f0"), GLOSS, {
      position: [BENCH_X + 0.15, 0.47, 5 + k * 0.9],
      scale: [0.35, 0.02, 0.3],
    });
    b.add(
      painted(
        new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8),
        k % 2 ? LIME : "#4fe3ff",
      ),
      GLOSS,
      {
        position: [BENCH_X + 0.15, 0.57, 5.4 + k * 0.9],
      },
    );
  }
  for (const sx of [-1, 1])
    for (const z of [FLOOR_BOUNDS.z0 + 0.6, FLOOR_BOUNDS.z1 - 0.6])
      plant(b, { x: sx * 8.4, z }, 1.5);
  return b.build();
}
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Stands, type Bank } from "./shared/Stands.tsx";

const LIME = "#c6ff4f";
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
const CZ = (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2;

const BANKS: readonly Bank[] = [
  { at: [FLOOR_BOUNDS.x0 - 0.5, 0], yaw: Math.PI / 2, length: 22, rows: 6 },
];

const PRO_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "top-knot",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "baby-tee-mini",
  outfitColor: "#e8e2ff",
  shadow: "#3fe0d0",
};

/** The hard court: blue inside the lines, green round it, white lines. */
function courtTexture() {
  const px = 24;
  return canvasTex(W * px, D * px, (ctx) => {
    const x = (m: number) => (m - FLOOR_BOUNDS.x0) * px;
    const z = (m: number) => (m - FLOOR_BOUNDS.z0) * px;
    ctx.fillStyle = "#2f7a4e";
    ctx.fillRect(0, 0, W * px, D * px);
    ctx.fillStyle = "#2a5fa8";
    ctx.fillRect(
      x(-COURT.doubles),
      z(-COURT.baseline),
      COURT.doubles * 2 * px,
      COURT.baseline * 2 * px,
    );
    ctx.strokeStyle = "#f4f4f0";
    ctx.lineWidth = 0.06 * px;
    const line = (x0: number, z0: number, x1: number, z1: number) => {
      ctx.beginPath();
      ctx.moveTo(x(x0), z(z0));
      ctx.lineTo(x(x1), z(z1));
      ctx.stroke();
    };
    for (const side of [-1, 1]) {
      line(
        side * COURT.doubles,
        -COURT.baseline,
        side * COURT.doubles,
        COURT.baseline,
      );
      line(
        side * COURT.half,
        -COURT.baseline,
        side * COURT.half,
        COURT.baseline,
      );
      line(
        -COURT.doubles,
        side * COURT.baseline,
        COURT.doubles,
        side * COURT.baseline,
      );
      line(-COURT.half, side * 6.4, COURT.half, side * 6.4);
    }
    line(0, -6.4, 0, 6.4);
  });
}

/** Where the ball is `f` (0..1) of the way between two players: up over
 * the net, a bounce at 70%, then up to the hitter's racket. */
function arc(
  from: THREE.Vector3,
  to: THREE.Vector3,
  f: number,
  out: THREE.Vector3,
) {
  out.lerpVectors(from, to, f);
  out.y =
    f < 0.7
      ? 1 + (0.05 - 1) * (f / 0.7) + Math.sin((f / 0.7) * Math.PI) * 1.7
      : 0.05 + Math.sin(((f - 0.7) / 0.3) * (Math.PI / 2)) * 0.95;
  return out;
}

/** The rally: the ball, the pro chasing it along her baseline, you at
 * yours, and the camera over your shoulder. */
function Rally({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const ball = useRef<THREE.Mesh>(null);
  const pro = useRef<THREE.Group>(null);
  const v = useMemo(
    () => ({
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      eye: new THREE.Vector3(),
      look: new THREE.Vector3(),
    }),
    [],
  );
  const heard = useRef(0);
  useEffect(
    () => () => {
      leave();
      player.seat = null;
      if (cameraHold.by === "courtside") cameraHold.by = null;
    },
    [player],
  );
  useFrame((_, dt) => {
    const now = performance.now();
    tick(now);
    const s = tennis.get();
    cameraHold.by = s.phase !== "off" ? "courtside" : null;
    const b = ball.current;
    const p = pro.current;
    if (!b || !p) return;
    const point = s.match.points.length;
    const side = sideOf(point, s.match.rally);
    // the pro shuffles across to where she'll hit from
    const proX = s.phase === "outgoing" ? side * 2.2 : 0;
    p.position.x += (proX - p.position.x) * Math.min(1, dt * 3);
    if (s.phase === "off") {
      if (player.seat) {
        player.seat = null;
        placePlayer(player, YOU[0], YOU[1]);
      }
      b.visible = false;
      return;
    }
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(YOU[0], 0.02, YOU[1]);
    player.seat.yaw = Math.PI;
    player.seat.sit = false;
    b.visible = s.phase === "incoming" || s.phase === "outgoing";
    v.a.set(p.position.x, 0, PRO[1] + 0.6);
    v.b.set(YOU[0] + side * 0.9, 0, YOU[1] - 0.6);
    if (s.phase === "incoming") {
      const total = s.arrives - s.since;
      // past you if you don't swing
      const f = (now - s.since) / total;
      arc(v.a, v.b, Math.min(f, 1.15), b.position);
    } else if (s.phase === "outgoing") {
      if (heard.current !== s.since) {
        heard.current = s.since;
        playClick();
      }
      const f = Math.min(1, (now - s.since) / (OUTGOING * 1000));
      arc(v.b, v.a.set(side * 2.2, 0, PRO[1] + 0.6), f, b.position);
    }
    v.eye.set(YOU[0] + 1.2, 3.2, YOU[1] + 5.2);
    v.look.set(0, 0.6, -3);
    camera.position.lerp(v.eye, calm ? 1 : 1 - Math.exp(-dt * 2.5));
    camera.lookAt(v.look);
  });
  return (
    <>
      <mesh ref={ball} visible={false}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshBasicMaterial color={hdr(LIME, 1.6)} toneMapped={false} />
      </mesh>
      <group ref={pro} position={[0, 0, PRO[1]]}>
        <CrowdFigure look={PRO_LOOK} seed={261} />
      </group>
    </>
  );
}

/**
 * The Courtside Club on Park Avenue: one floodlit hard court, blue inside
 * green, under the night sky, a stand of members down the west side and
 * benches on the east. Play seven points against the club pro.
 */
export function Courtside({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const court = useMemo(courtTexture, []);
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#071226"]} />
      <fog attach="fog" args={["#0c1a33", 30, 90]} />
      <hemisphereLight args={["#e8f0ff", "#1a3a2a", 1.1]} />
      <pointLight
        position={[0, 9, 0]}
        color="#f4f8ff"
        intensity={10}
        distance={30}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, CZ]}
        color="#ffffff"
        map={court}
        texture={{ id: "brushed_concrete", scale: 0.4 }}
        low={{ metalness: 0, roughness: 0.8 }}
        onPick={onPick}
      />
      <primitive object={dressing} />
      <PortalPads room={ROOMS.courtside} color={LIME} />
      {/* the net and its posts */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[COURT.doubles * 2 + 0.8, 0.9, 0.03]} />
        <meshStandardMaterial
          color="#1a1a24"
          transparent
          opacity={0.75}
          roughness={1}
        />
      </mesh>
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[COURT.doubles * 2 + 0.8, 0.06, 0.05]} />
        <meshStandardMaterial color="#f4f4f0" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (COURT.doubles + 0.4), 0.55, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.1, 8]} />
          <meshStandardMaterial color="#d8d8e0" metalness={0.5} />
        </mesh>
      ))}
      {/* the fence round the court, and its floodlights */}
      {[FLOOR_BOUNDS.z0, FLOOR_BOUNDS.z1 + 0.2].map((z) => (
        <mesh key={z} position={[0, 1.6, z]}>
          <boxGeometry args={[W, 3.2, 0.05]} />
          <meshStandardMaterial color="#1c3a2a" transparent opacity={0.55} />
        </mesh>
      ))}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * 8.6, 0, sz * 13]}>
            <mesh position-y={4}>
              <cylinderGeometry args={[0.08, 0.1, 8, 6]} />
              <meshStandardMaterial color="#3a3a48" />
            </mesh>
            <mesh position-y={8.1}>
              <boxGeometry args={[1.4, 0.6, 0.2]} />
              <meshBasicMaterial
                color={hdr("#f4f8ff", 2.4)}
                toneMapped={false}
              />
            </mesh>
          </group>
        )),
      )}
      <Stands banks={BANKS} fill={0.7} seed={29} />
      {[5.5, 7.5].map((z) => (
        <mesh key={z} position={[BENCH_X + 0.15, 0.42, z]} material={TEAK}>
          <boxGeometry args={[0.45, 0.08, 1.8]} />
        </mesh>
      ))}
      <NeonText
        text="COURTSIDE CLUB"
        color={LIME}
        font={MARQUEE}
        width={5}
        k={3.2}
        position={[0, 4.2, FLOOR_BOUNDS.z0 + 0.1]}
      />
      <CourtsideNpcs />
      <Rally player={player} />
    </>
  );
}
