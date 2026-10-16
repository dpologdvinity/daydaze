import { Environment, Html, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  newPose,
  parseRide,
  RIDES,
  RIDE_IDS,
  COASTER_TRACK,
  STARLIGHT_TRACK,
  rideProgress,
  rideStep,
  seatPose,
  type RideEvent,
  type RideId,
  type RideState,
} from "../../game/amusementPark.ts";
import { areaOf } from "../../game/area.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { Vec2 } from "../../game/walk.ts";
import { useReducedMotion } from "../motion.ts";
import { walkTo, type Player } from "../world/PlayerController.tsx";
import { Bulbs } from "./amusementpark/Bulbs.tsx";
import { Fairground } from "./amusementpark/Fairground.tsx";
import { Midway } from "./amusementpark/Midway.tsx";
import { PARK_NPCS, ParkNpc } from "./amusementpark/Npcs.tsx";
import { ENTRANCE_Z } from "./amusementpark/layout.ts";
import {
  Carousel,
  Coaster,
  Starlight,
  coasterRiders,
  DropTower,
  FerrisWheel,
  SwingRide,
  Teacups,
} from "./amusementpark/Rides.tsx";
import { Arch } from "./shared/Arch.tsx";
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

// How close the doll must walk to its ring before it is seated.
const ARRIVE_METRES = 0.3;

function Ring({
  at,
  color,
  label,
  onBoard,
}: {
  at: readonly [number, number];
  color: string;
  label: string;
  onBoard: () => void;
}) {
  return (
    <>
      {/* the ride's name over its ring, a button too (keyboard, tests) */}
      <Html position={[at[0], 2.3, at[1]]} center zIndexRange={[10, 0]}>
        <button type="button" className="ride-sign" onClick={onBoard}>
          {label}
        </button>
      </Html>
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
    </>
  );
}

/**
 * The Amusement Park: a night midway with a ferris wheel, carousel, coaster,
 * drop tower, swing ride and teacups. The ferris wheel and coaster board from
 * their rings. Riding is a small state machine (idle, boarding, riding,
 * exiting); the seat position is a pure function of time.
 */
const RING_COLORS = ["#3fe0d0", "#ff2f9a", "#ffb02e", "#9b5cff", "#3dff9a"];

export function AmusementPark({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const clock = useThree((s) => s.clock);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
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
  const ride = useRef<RideState>({ phase: "idle" });
  // The walk target that means "still walking to the ring"; a new target cancels.
  const boardTarget = useRef<Vec2 | null>(null);
  const arriveNow = useRef(false);
  const seat = useMemo(newPose, []);
  const cabin = useRef<THREE.Group>(null);

  const dispatch = (event: RideEvent) => {
    const next = rideStep(ride.current, event);
    if (next.phase !== ride.current.phase) {
      // tests and screenshots wait on this instead of a fixed delay
      gl.domElement.dataset.rideState = next.phase;
    }
    ride.current = next;
  };

  const board = (id: RideId) => {
    if (ride.current.phase !== "idle") return;
    walkTo(player, areaOf(ROOMS["amusement-park"]), RIDES[id].spot);
    boardTarget.current = player.walk.target;
    dispatch({ type: "board", ride: id });
  };

  useEffect(() => {
    // the lazy-loaded scene mounts after the startup frames, so ask for a frame
    // to let the environment map render in still mode
    invalidate();
    gl.domElement.dataset.rideState = ride.current.phase;
    // `?ride=coaster` boards straight away, for screenshots and tests
    const id = parseRide(
      new URLSearchParams(window.location.search).get("ride"),
    );
    if (!id) return;
    // no teleport: the camera follows the seat once the seat pose takes over
    dispatch({ type: "board", ride: id });
    // the ride starts on the first frame drawn, not at mount: on a slow
    // machine the first frame can come long after
    arriveNow.current = true;
    // runs once per visit to the park
  }, []);

  useFrame(() => {
    const now = clock.elapsedTime;
    if (arriveNow.current) {
      arriveNow.current = false;
      dispatch({ type: "arrive", now, calm });
    }
    const current = ride.current;
    if (current.phase === "boarding") {
      const [sx, sz] = RIDES[current.ride].spot;
      if (Math.hypot(player.pos.x - sx, player.pos.z - sz) < ARRIVE_METRES) {
        dispatch({ type: "arrive", now, calm });
      } else if (player.walk.target !== boardTarget.current) {
        dispatch({ type: "cancel" });
      }
    }
    dispatch({ type: "tick", now });
    const phase = ride.current;
    // a coaster's lead car carries the rider: tell its train where she is
    delete coasterRiders.coaster;
    delete coasterRiders.starlight;
    if (
      phase.phase === "riding" &&
      (phase.ride === "coaster" || phase.ride === "starlight")
    ) {
      const track = phase.ride === "coaster" ? COASTER_TRACK : STARLIGHT_TRACK;
      coasterRiders[phase.ride] =
        rideProgress(now - phase.start, phase.seconds) * track.length;
    }
    const at = seatPose(phase, now, calm, seat);
    if (!at) {
      player.seat = null;
      if (cabin.current) cabin.current.visible = false;
      return;
    }
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(at.x, at.y, at.z);
    player.seat.yaw = at.yaw;
    // horses, cups and chairs sit her down until she steps off
    const seated = phase.phase !== "idle" && RIDES[phase.ride].seated;
    const standing = phase.phase !== "idle" && phase.ride === "ferris-wheel";
    player.seat.sit = seated && phase.phase === "riding";
    if (cabin.current) {
      // the car is only shown while the doll is strapped in, not while stepping off
      cabin.current.visible = phase.phase === "riding" && standing;
      cabin.current.position.copy(player.seat.position);
      cabin.current.rotation.y = at.yaw;
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
      <Bulbs points={STARS} colors={STAR_COLORS} radius={0.1} detail={[5, 4]} />
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
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -30]}>
        <planeGeometry args={[70, 60]} />
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
      <Fairground />
      <FerrisWheel />
      <Carousel />
      <Coaster />
      <Starlight />
      <DropTower />
      <SwingRide />
      <Teacups />
      {RIDE_IDS.map((id, i) => (
        <Ring
          key={id}
          at={RIDES[id].spot}
          color={RING_COLORS[i % RING_COLORS.length]}
          label={RIDES[id].label}
          onBoard={() => board(id)}
        />
      ))}
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
