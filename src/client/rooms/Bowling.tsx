import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  BALL_RADIUS,
  frameTotals,
  type Roll,
  type Snapshot,
  GUTTER_HALF_WIDTH,
  LANE_HALF_WIDTH,
  marks,
  PIN_SPOTS,
} from "../../game/bowling.ts";
import {
  BENCH_XS,
  BENCH_Z,
  COUNTER,
  FOUL_Z,
  LANE_XS,
  laneToRoom,
  PINS_Z,
  PIT_END_Z,
  PLAY_LANE,
} from "../../game/bowlingAlley.ts";
import { ROOMS } from "../../game/rooms.ts";
import { playBowlRoll, playPinCrash } from "../../audio/worldSounds.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import { BowlingNpcs } from "./bowling/Npcs.tsx";
import {
  aimAt,
  getLane,
  leaveLane,
  settle,
  useLane,
} from "./bowling/session.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";

const WALL_X = 6;
const FRONT_Z = 10.4;
const BACK_Z = PIT_END_Z - 1.2;
const LANE_LEN = FOUL_Z - PIT_END_Z;
const HEIGHT = 4.2;
const PINK = "#ff4fb3";
const CYAN = "#4fe3ff";
const LIME = "#b6ff4f";
const PLAY_X = LANE_XS[PLAY_LANE];

/** A pin: belly, neck and head turned on a lathe, 38 cm tall. */
function pinGeometry() {
  const profile: [number, number][] = [
    [0, 0],
    [0.026, 0],
    [0.05, 0.06],
    [0.06, 0.12],
    [0.055, 0.18],
    [0.03, 0.26],
    [0.022, 0.29],
    [0.03, 0.33],
    [0.028, 0.37],
    [0, 0.381],
  ];
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    14,
  );
}

const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(1, 1, 1),
  axis: new THREE.Vector3(),
  eye: new THREE.Vector3(),
  look: new THREE.Vector3(),
};

// the dark maple of a cosmic lane: its boards in faint stripes
const LANE_TEX = canvasTex(
  64,
  256,
  (ctx) => {
    ctx.fillStyle = "#3a2420";
    ctx.fillRect(0, 0, 64, 256);
    for (let x = 0; x < 64; x += 4) {
      ctx.fillStyle = x % 8 ? "#43291f" : "#33201c";
      ctx.fillRect(x, 0, 2, 256);
    }
  },
  [1, 6],
);

/** The lanes: decks, gutters, the dividers between them, the arrows and
 * dots that glow under the blacklight, and the pinsetters' hood. */
function Lanes() {
  const marksAt = useMemo(() => {
    // the target arrows 4.6 m down, and the guide dots at 2 m
    const out: [number, number, number][] = [];
    for (const lx of LANE_XS)
      for (let k = -3; k <= 3; k++) {
        out.push([lx + k * 0.13, 0.012, FOUL_Z - 4.6 - Math.abs(k) * 0.12]);
        out.push([lx + k * 0.13, 0.012, FOUL_Z - 2]);
      }
    return out;
  }, []);
  return (
    <>
      {LANE_XS.map((lx) => (
        <group key={lx}>
          <mesh
            position={[lx, 0.005, FOUL_Z - LANE_LEN / 2]}
            rotation-x={-Math.PI / 2}
          >
            <planeGeometry args={[LANE_HALF_WIDTH * 2, LANE_LEN]} />
            <meshStandardMaterial
              map={LANE_TEX}
              roughness={0.18}
              metalness={0.1}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[
                lx + side * (LANE_HALF_WIDTH + GUTTER_HALF_WIDTH) * 0.5,
                -0.02,
                FOUL_Z - LANE_LEN / 2,
              ]}
              rotation-x={-Math.PI / 2}
            >
              <planeGeometry
                args={[GUTTER_HALF_WIDTH - LANE_HALF_WIDTH + 0.04, LANE_LEN]}
              />
              <meshStandardMaterial color="#120a18" roughness={0.4} />
            </mesh>
          ))}
          {/* the foul line */}
          <mesh position={[lx, 0.014, FOUL_Z]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[LANE_HALF_WIDTH * 2, 0.025]} />
            <meshBasicMaterial color={hdr(PINK, 2.5)} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* dividers between and outside the lanes, edged in neon */}
      {[-4.4, -2.2, 0, 2.2, 4.4].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.08, FOUL_Z - LANE_LEN / 2]}>
            <boxGeometry args={[0.24, 0.16, LANE_LEN]} />
            <meshStandardMaterial color="#1a0f24" roughness={0.6} />
          </mesh>
          <mesh position={[x, 0.165, FOUL_Z - LANE_LEN / 2]}>
            <boxGeometry args={[0.03, 0.01, LANE_LEN]} />
            <meshBasicMaterial color={hdr(CYAN, 2.2)} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <instancedMesh
        ref={(m) => {
          if (!m) return;
          const { m: mat, q, p, s } = scratch;
          q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
          marksAt.forEach(([x, y, z], i) =>
            m.setMatrixAt(i, mat.compose(p.set(x, y, z), q, s.set(1, 1, 1))),
          );
          m.instanceMatrix.needsUpdate = true;
          m.computeBoundingSphere();
        }}
        args={[undefined, undefined, marksAt.length]}
      >
        <circleGeometry args={[0.025, 3]} />
        <meshBasicMaterial color={hdr(LIME, 2.4)} toneMapped={false} />
      </instancedMesh>
      {/* the pinsetters' hood across all four lanes, its name in neon */}
      <mesh position={[0, 2.1, PINS_Z - 0.6]}>
        <boxGeometry args={[WALL_X * 2, 1.4, 0.3]} />
        <meshStandardMaterial color="#160b22" roughness={0.7} />
      </mesh>
      <NeonText
        text="GLOW BOWL"
        color={PINK}
        font={MARQUEE}
        width={5}
        k={3.6}
        position={[0, 2.15, PINS_Z - 0.44]}
      />
      {/* the pit behind the pins */}
      <mesh position={[0, 0.6, BACK_Z]}>
        <boxGeometry args={[WALL_X * 2, 1.2, 0.2]} />
        <meshStandardMaterial color="#050308" />
      </mesh>
      {/* ball returns, between the lanes just past the foul line */}
      {[-2.2, 0, 2.2].map((x) => (
        <mesh key={x} position={[x, 0.32, FOUL_Z - 0.6]}>
          <boxGeometry args={[0.5, 0.42, 1]} />
          <meshStandardMaterial color="#2a1840" roughness={0.4} />
        </mesh>
      ))}
    </>
  );
}

/** The static racks on the other three lanes, one draw call. */
function OtherRacks({ geometry }: { geometry: THREE.BufferGeometry }) {
  const spots = useMemo(
    () =>
      LANE_XS.flatMap((_, lane) =>
        lane === PLAY_LANE ? [] : PIN_SPOTS.map((s) => laneToRoom(lane, s)),
      ),
    [],
  );
  return (
    <instancedMesh
      ref={(m) => {
        if (!m) return;
        const { m: mat, q, p, s } = scratch;
        spots.forEach(([x, z], i) =>
          m.setMatrixAt(
            i,
            mat.compose(p.set(x, 0, z), q.identity(), s.set(1, 1, 1)),
          ),
        );
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }}
      args={[geometry, undefined, spots.length]}
    >
      <meshStandardMaterial
        color="#f4f0ff"
        emissive="#c9b7ff"
        emissiveIntensity={0.35}
        roughness={0.3}
      />
    </instancedMesh>
  );
}

/** The scoreboard monitor over your lane: your frames and running totals. */
function Monitor() {
  const lane = useLane();
  const tex = useMemo(() => canvasTex(512, 128, () => undefined), []);
  useEffect(() => {
    const canvas = tex.image;
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0614";
    ctx.fillRect(0, 0, 512, 128);
    const shown = marks(lane.game);
    const totals = frameTotals(lane.game);
    ctx.textAlign = "center";
    for (let f = 0; f < 10; f++) {
      const x = 4 + f * 50.4;
      ctx.strokeStyle = "#4fe3ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 30, 48, 92);
      ctx.fillStyle = "#4fe3ff";
      ctx.font = "700 18px sans-serif";
      ctx.fillText(String(f + 1), x + 24, 22);
      ctx.fillStyle = "#ffd1f0";
      ctx.font = "700 20px sans-serif";
      ctx.fillText((shown[f] ?? []).join(" "), x + 24, 60);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 24px sans-serif";
      ctx.fillText(String(totals[f] ?? ""), x + 24, 104);
    }
    tex.needsUpdate = true;
  }, [lane.game, tex]);
  return (
    <group position={[PLAY_X, 3.1, FOUL_Z + 0.6]} rotation-x={0.35}>
      <mesh position-z={-0.03}>
        <boxGeometry args={[2.2, 0.62, 0.05]} />
        <meshStandardMaterial color="#120a18" />
      </mesh>
      <mesh>
        <planeGeometry args={[2.1, 0.52]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Your lane: the rack, the ball and the aim arrow, played from the shared
 * session. While a game is on, this holds the camera: behind the foul line
 * to aim, riding behind the ball as it rolls, and over the pins as they go.
 */
function PlayLane({ geometry }: { geometry: THREE.BufferGeometry }) {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const pins = useRef<THREE.InstancedMesh>(null);
  const ball = useRef<THREE.Mesh>(null);
  const arrow = useRef<THREE.Group>(null);
  const spin = useRef(0);
  // which roll the sounds have played for: its rumble, then its crash
  const heard = useRef<{ roll: Roll | null; crashed: boolean }>({
    roll: null,
    crashed: false,
  });

  // walking out ends the game and hands the camera back
  useEffect(
    () => () => {
      leaveLane();
      if (cameraHold.by === "bowling") cameraHold.by = null;
    },
    [],
  );

  useFrame((_, dt) => {
    const lane = getLane();
    const now = performance.now();
    const playing = lane.phase !== "off";
    cameraHold.by = playing ? "bowling" : null;
    const r = lane.roll;
    const elapsed = r ? (now - lane.sweepAt) / 1000 : 0;
    // the playback frame for now (the last one once it has all played)
    let frame: Snapshot | null = null;
    if (r) {
      let i = 0;
      while (i < r.frames.length - 1 && r.frames[i].t < elapsed) i++;
      frame = r.frames[i];
      const h = heard.current;
      if (h.roll !== r) {
        h.roll = r;
        h.crashed = false;
        const pinsAt = r.frames.findIndex((f) => f.pins.some((p) => p[2] > 0));
        playBowlRoll(pinsAt >= 0 ? r.frames[pinsAt].t : 2.6);
      }
      let falling = false;
      for (const p of frame.pins) if (p[2] > 0) falling = true;
      if (!h.crashed && falling) {
        h.crashed = true;
        playPinCrash(r.knocked.length);
      }
      if (elapsed > r.frames[r.frames.length - 1].t + 0.9) settle();
    }

    // the rack: pins down from earlier balls are cleared away; pins hit by
    // this ball topple the way they're thrown
    const mesh = pins.current;
    if (mesh) {
      const { m, q, p, s, axis } = scratch;
      for (let i = 0; i < PIN_SPOTS.length; i++) {
        const [sx, sz] = PIN_SPOTS[i];
        const at = frame ? frame.pins[i] : null;
        const lx = at ? at[0] : sx;
        const lz = at ? at[1] : sz;
        const fall = at ? at[2] : 0;
        // the way it's travelling, in the room (down the lane is -z)
        const dx = lx - sx;
        const dz = -(lz - sz);
        const len = Math.hypot(dx, dz);
        if (len > 1e-4) axis.set(dz / len, 0, -dx / len);
        else axis.set(-1, 0, 0);
        q.setFromAxisAngle(axis, (fall * Math.PI) / 2);
        s.setScalar(lane.standing[i] ? 1 : 0);
        p.set(PLAY_X + lx, fall * 0.05, FOUL_Z - lz);
        mesh.setMatrixAt(i, m.compose(p, q, s));
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // the ball: at the foul line until bowled, then down the lane
    const b = ball.current;
    if (b) {
      b.visible = playing;
      const bx = frame ? frame.ball[0] : lane.offset;
      const bz = frame ? frame.ball[1] : -0.4;
      b.position.set(
        PLAY_X + bx,
        BALL_RADIUS + (frame?.gutter ? -0.06 : 0),
        FOUL_Z - bz,
      );
      if (frame && !calm) spin.current += dt * 18;
      b.rotation.x = -spin.current;
    }

    // the aim arrow, from placing the ball until it's bowled
    const a = arrow.current;
    if (a) {
      a.visible =
        lane.phase === "place" ||
        lane.phase === "aim" ||
        lane.phase === "power";
      a.position.set(PLAY_X + lane.offset, 0.02, FOUL_Z - 0.1);
      a.rotation.y = -(lane.phase === "aim"
        ? aimAt(now, lane.sweepAt)
        : lane.angle);
    }

    if (!playing) return;
    // the shot: behind the foul line to aim, then riding behind the ball
    const { eye, look } = scratch;
    if (frame && !frame.gutter) {
      const ballZ = FOUL_Z - frame.ball[1];
      eye.set(
        PLAY_X,
        1.3,
        Math.max(PINS_Z + 4.5, Math.min(ballZ + 3.2, FOUL_Z + 3.2)),
      );
      look.set(PLAY_X, 0.2, PINS_Z - 0.4);
    } else {
      eye.set(PLAY_X, 1.7, FOUL_Z + 3.2);
      look.set(PLAY_X, 0.15, FOUL_Z - 14);
    }
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 4));
    camera.lookAt(look);
  });

  return (
    <>
      <instancedMesh
        ref={pins}
        args={[geometry, undefined, PIN_SPOTS.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#ffffff"
          emissive="#d8c8ff"
          emissiveIntensity={0.4}
          roughness={0.25}
        />
      </instancedMesh>
      <mesh ref={ball} visible={false}>
        <sphereGeometry args={[BALL_RADIUS, 24, 16]} />
        <meshStandardMaterial
          color="#ff4fb3"
          emissive="#7a1060"
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.12}
        />
      </mesh>
      <group ref={arrow} visible={false}>
        <mesh position={[0, 0, -2]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.04, 4]} />
          <meshBasicMaterial
            color={hdr(LIME, 2)}
            toneMapped={false}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    </>
  );
}

function Concourse() {
  return (
    <>
      {BENCH_XS.map((x) => (
        <mesh key={x} position={[x, 0.22, BENCH_Z]}>
          <boxGeometry args={[1.8, 0.44, 0.42]} />
          <meshStandardMaterial color="#7b2dbd" roughness={0.35} />
        </mesh>
      ))}
      {/* the shoe counter, its cubbies glowing behind it */}
      <mesh
        position={[
          (COUNTER.x0 + COUNTER.x1) / 2,
          0.55,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ]}
      >
        <boxGeometry
          args={[COUNTER.x1 - COUNTER.x0, 1.1, COUNTER.z1 - COUNTER.z0]}
        />
        <meshStandardMaterial color="#1c1030" roughness={0.5} />
      </mesh>
      <mesh
        position={[
          (COUNTER.x0 + COUNTER.x1) / 2,
          1.12,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ]}
      >
        <boxGeometry args={[COUNTER.x1 - COUNTER.x0 + 0.1, 0.04, 0.9]} />
        <meshBasicMaterial color={hdr(CYAN, 1.6)} toneMapped={false} />
      </mesh>
      <NeonText
        text="SHOES"
        color={LIME}
        font={MARQUEE}
        width={1.8}
        k={3.2}
        position={[WALL_X - 0.06, 2.5, (COUNTER.z0 + COUNTER.z1) / 2 + 0.6]}
        rotation-y={-Math.PI / 2}
      />
    </>
  );
}

function Shell() {
  const wall = <meshStandardMaterial color="#140a24" roughness={0.9} />;
  const depth = FRONT_Z - BACK_Z;
  return (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * WALL_X, HEIGHT / 2, (FRONT_Z + BACK_Z) / 2]}
        >
          <boxGeometry args={[0.2, HEIGHT, depth]} />
          {wall}
        </mesh>
      ))}
      <mesh position={[0, HEIGHT / 2, BACK_Z - 0.1]}>
        <boxGeometry args={[WALL_X * 2, HEIGHT, 0.2]} />
        {wall}
      </mesh>
      {/* planets glowing under the blacklight, hung over the lanes */}
      {(
        [
          [-3.2, 3.4, -6, 0.6, PINK],
          [2.6, 3.6, -11, 0.9, CYAN],
          [0.4, 3.3, -2, 0.4, LIME],
        ] as const
      ).map(([x, y, z, r, c]) => (
        <mesh key={z} position={[x, y, z]}>
          <sphereGeometry args={[r, 20, 14]} />
          <meshBasicMaterial color={hdr(c, 0.9)} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Glow Bowl, behind Suburbia's strip mall: four lanes under blacklight,
 * glowing arrows and pins, planets over the lanes and stars on the ceiling,
 * benches on the concourse and the shoe counter by the door. You bowl a
 * full ten-frame game on lane three; the others are mid-game.
 */
export function Bowling({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  const pin = useMemo(pinGeometry, []);
  return (
    <>
      <color attach="background" args={["#05030c"]} />
      <fog attach="fog" args={["#10061e", 14, 40]} />
      <hemisphereLight args={["#7a4dff", "#2a0a40", 0.5]} />
      <pointLight
        position={[0, 3.2, 6]}
        color="#ffb0e0"
        intensity={3}
        distance={10}
      />
      <pointLight
        position={[0, 2.6, PINS_Z + 1.5]}
        color="#e8e2ff"
        intensity={4}
        distance={8}
      />
      <Floor
        width={WALL_X * 2}
        depth={FRONT_Z - FOUL_Z}
        center={[0, (FRONT_Z + FOUL_Z) / 2]}
        color="#2a1440"
        mirror={0.2}
        low={{ metalness: 0, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.bowling} color={PINK} />
      <Shell />
      <Lanes />
      <OtherRacks geometry={pin} />
      <PlayLane geometry={pin} />
      <Monitor />
      <Concourse />
      <Sparkles
        count={calm ? 0 : 120}
        scale={[11, 0.6, 26]}
        position={[0, HEIGHT - 0.3, -4]}
        size={2}
        speed={calm ? 0 : 0.1}
        color="#e8e2ff"
        opacity={0.8}
      />
      <BowlingNpcs />
    </>
  );
}
