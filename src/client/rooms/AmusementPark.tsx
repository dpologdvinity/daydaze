import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  ferrisSeat,
  parseRide,
  rideProgress,
  rideSeconds,
  trackPose,
  type RideId,
} from "../../game/amusementPark.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { Vec2 } from "../../game/walk.ts";
import { walkTo, type Player } from "../world/PlayerController.tsx";
import { useReducedMotion } from "../motion.ts";
import { PARK_NPCS, ParkNpc } from "./amusementpark/Npcs.tsx";
import { Midway } from "./amusementpark/Midway.tsx";
import {
  COASTER_SPOT,
  COASTER_TRACK,
  ENTRANCE_Z,
  FERRIS,
  FERRIS_SPOT,
} from "./amusementpark/layout.ts";
import {
  Carousel,
  Coaster,
  DropTower,
  FerrisWheel,
  SwingRide,
  Teacups,
} from "./amusementpark/Rides.tsx";
import { Arch } from "./shared/Arch.tsx";
import { Bulbs } from "./amusementpark/Bulbs.tsx";
import { Beams, type Beam } from "./shared/Beams.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";

// A starfield over the back of the park, fixed so the scene never reshuffles.
const STARS: [number, number, number][] = Array.from(
  { length: 180 },
  (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12345.6789;
    const x = (a - Math.floor(a)) * 90 - 45;
    const y = 11 + (b - Math.floor(b)) * 20;
    return [x, y, -44];
  },
);
const STAR_COLORS = ["#ffffff", "#fff1c8", "#bff6ff"];

const BEAMS: readonly Beam[] = [
  { position: [-8.5, 0.1, 6.5], color: "#ff2f9a", phase: 0, length: 30 },
  { position: [8.5, 0.1, 6.5], color: "#3fe0d0", phase: 2.1, length: 30 },
];

// Where a doll stands to board each ride.
const SPOTS: Record<RideId, readonly [number, number]> = {
  "ferris-wheel": FERRIS_SPOT,
  coaster: COASTER_SPOT,
};

function Ring({
  at,
  color,
  onBoard,
}: {
  at: readonly [number, number];
  color: string;
  onBoard: () => void;
}) {
  return (
    <mesh
      position={[at[0], 0.03, at[1]]}
      rotation-x={-Math.PI / 2}
      onClick={(e) => {
        e.stopPropagation();
        onBoard();
      }}
    >
      <ringGeometry args={[0.62, 0.9, 48]} />
      <meshBasicMaterial
        color={hdr(color, 3)}
        toneMapped={false}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

/**
 * The Amusement Park: a night midway with a ferris wheel, carousel, coaster,
 * drop tower, swing ride and teacups. The ferris wheel and coaster can be
 * boarded from their rings; the doll then rides the ride's path and steps off.
 */
export function AmusementPark({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const clock = useThree((s) => s.clock);
  const calm = useReducedMotion();
  const tiles = useMemo(
    () =>
      canvasTex(
        256,
        256,
        (ctx) => {
          ctx.fillStyle = "#34124c";
          ctx.fillRect(0, 0, 256, 256);
          ctx.fillStyle = "#55207a";
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              if ((x + y) % 2 === 0) ctx.fillRect(x * 32, y * 32, 32, 32);
            }
          }
        },
        [6, 5],
      ),
    [],
  );
  // The ride being taken and, while the doll walks to the ring, the boarding request.
  const ride = useRef<{ id: RideId; start: number; seconds: number } | null>(
    null,
  );
  const pending = useRef<{ id: RideId; target: Vec2 | null } | null>(null);
  const cabin = useRef<THREE.Group>(null);

  const start = (id: RideId) => {
    pending.current = null;
    player.target = null;
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    ride.current = {
      id,
      start: clock.elapsedTime,
      seconds: rideSeconds(id, calm),
    };
  };
  const board = (id: RideId) => {
    if (ride.current) return;
    walkTo(player, ROOMS["amusement-park"], SPOTS[id]);
    pending.current = { id, target: player.target };
  };

  useEffect(() => {
    // `?ride=coaster` boards straight away, for screenshots and tests
    const id = parseRide(
      new URLSearchParams(window.location.search).get("ride"),
    );
    if (!id) return;
    player.pos.set(SPOTS[id][0], 0, SPOTS[id][1]);
    start(id);
  }, []);

  useFrame(() => {
    const p = pending.current;
    if (p && !ride.current) {
      const [sx, sz] = SPOTS[p.id];
      if (Math.hypot(player.pos.x - sx, player.pos.z - sz) < 0.3) start(p.id);
      // a click elsewhere on the floor cancels the boarding walk
      else if (player.target !== p.target) pending.current = null;
    }
    const r = ride.current;
    const seat = player.seat;
    if (!r || !seat) {
      if (cabin.current) cabin.current.visible = false;
      return;
    }
    const elapsed = clock.elapsedTime - r.start;
    if (elapsed >= r.seconds) {
      ride.current = null;
      player.seat = null;
      if (cabin.current) cabin.current.visible = false;
      return;
    }
    const progress = rideProgress(elapsed, r.seconds);
    const pose =
      r.id === "ferris-wheel"
        ? ferrisSeat(FERRIS, progress)
        : trackPose(COASTER_TRACK, progress * COASTER_TRACK.length);
    seat.position.set(...pose.position);
    seat.yaw = pose.yaw;
    if (cabin.current) {
      cabin.current.visible = true;
      cabin.current.position.copy(seat.position);
      cabin.current.rotation.y = seat.yaw;
    }
  });

  return (
    <>
      <color attach="background" args={["#060214"]} />
      <fog attach="fog" args={["#1a0838", 24, 80]} />
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          color="#ff2f9a"
          intensity={3}
          position={[0, 4, -12]}
          scale={[24, 4, 1]}
        />
        <Lightformer
          form="rect"
          color="#3fe0d0"
          intensity={2}
          position={[-10, 6, 4]}
          scale={[8, 3, 1]}
        />
        <Lightformer
          form="rect"
          color="#ffb02e"
          intensity={2}
          position={[10, 6, 4]}
          scale={[8, 3, 1]}
        />
      </Environment>
      <ambientLight color="#5a2c7a" intensity={0.7} />
      <hemisphereLight args={["#4a3aa0", "#ff2f9a", 0.6]} />
      <Bulbs points={STARS} colors={STAR_COLORS} radius={0.1} />
      <Floor
        width={18}
        depth={15.5}
        center={[0, -0.25]}
        color="#3d1656"
        map={tiles}
        mirror={0.5}
        onPick={onPick}
      />
      {/* the fairground beyond the rides' back fence */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -22]}>
        <planeGeometry args={[70, 40]} />
        <meshStandardMaterial color="#0e0519" roughness={0.9} />
      </mesh>
      <Beams beams={BEAMS} aim={[0, -12]} aimY={12} spread={[14, 4]} />
      <PortalPads room={ROOMS["amusement-park"]} color="#ffb02e" />
      <Arch sign="THE MIDWAY" position={[0, 0, ENTRANCE_Z]} />
      <Arch
        sign="DAYDAZE CARNIVAL"
        width={9}
        position={[0, 0, -30]}
        color="#ff2f9a"
        accent="#3fe0d0"
      />
      <Midway />
      <FerrisWheel />
      <Carousel />
      <Coaster />
      <DropTower />
      <SwingRide />
      <Teacups />
      <Ring
        at={FERRIS_SPOT}
        color="#3fe0d0"
        onBoard={() => board("ferris-wheel")}
      />
      <Ring
        at={COASTER_SPOT}
        color="#ff2f9a"
        onBoard={() => board("coaster")}
      />
      {PARK_NPCS.map((npc, i) => (
        <ParkNpc key={npc.id} npc={npc} seed={i + 3} />
      ))}
      {/* the rider's car, shown only while a ride is running */}
      <group ref={cabin} visible={false}>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[1.3, 2.3, 1.2]} />
          <meshStandardMaterial
            color="#bff6ff"
            transparent
            opacity={0.16}
            roughness={0.1}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[1.3, 0.14, 1.2]} />
          <meshStandardMaterial color="#2b1238" />
        </mesh>
        <mesh position={[0, 2.35, 0]}>
          <boxGeometry args={[1.5, 0.12, 1.4]} />
          <meshStandardMaterial
            color="#ff2f9a"
            emissive="#ff2f9a"
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>
    </>
  );
}
