// Glow Bowl, the blacklit bowling alley: four instanced lanes, the pin
// geometry, the player's ten-frame game on lane three and looping fake games on
// the other lanes. Lane positions come from game/bowlingAlley.ts; scratch
// objects keep useFrame allocation-free.

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
  HEADPIN_Z,
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
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted, plant, poster, shelf } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

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

// maple lanes, cosmic-painted walls, vinyl benches, laminate counters
const MAPLE = surface("wood_floor", {
  scale: 0.8,
  color: "#d8a878",
  roughness: 0.2,
});
const WALL = surface("concrete_wall_008", {
  scale: 0.5,
  color: "#5a4088",
  roughness: 0.9,
});
const VINYL = surface("leather_white", {
  scale: 2.5,
  color: "#9b4dff",
  roughness: 0.4,
});
const LAMINATE = surface("wood_veneer", {
  scale: 1.5,
  color: "#5a3a6a",
  roughness: 0.4,
});
const RETURN = surface("plastic", {
  scale: 1,
  color: "#6a4aa0",
  roughness: 0.3,
});
const BALL_COLORS = [PINK, CYAN, LIME, "#ffb02e", "#9b5cff", "#ff2f4f"];

/** A ball rack by the benches, shoe cubbies behind the counter, league
 * posters and plants. */
function buildDressing() {
  const b = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const ball = new THREE.SphereGeometry(0.11, 12, 8);
  // two-tier ball rack along the left wall, every ball a different color
  const rackX = -WALL_X + 0.35;
  for (const [tier, y] of [0.45, 0.85].entries()) {
    b.add(box, LAMINATE, {
      position: [rackX, y - 0.06, 6.6],
      scale: [0.4, 0.04, 2.6],
    });
    for (let k = 0; k < 10; k++)
      b.add(
        painted(ball, BALL_COLORS[(k * 3 + tier) % BALL_COLORS.length] ?? PINK),
        GLOSS,
        {
          position: [rackX, y + 0.07, 5.45 + k * 0.25],
        },
      );
  }
  for (const z of [5.35, 7.85])
    b.add(box, LAMINATE, {
      position: [rackX, 0.45, z],
      scale: [0.4, 0.9, 0.04],
    });
  // shoe cubbies on the wall behind the counter, a pair in every other one
  for (const y of [1.3, 1.65, 2.0])
    shelf(
      b,
      { x: WALL_X - 0.2, y, z: 8, ry: -Math.PI / 2 },
      1.8,
      LAMINATE,
      0.3,
    );
  const shoe = new THREE.BoxGeometry(0.1, 0.08, 0.26);
  for (const [r, y] of [1.3, 1.65, 2.0].entries())
    for (let k = 0; k < 5; k++)
      if ((k + r) % 2 === 0)
        for (const dz of [-0.06, 0.06])
          b.add(painted(shoe, k % 3 ? "#d8323a" : "#3a6ad8"), GLOSS, {
            position: [WALL_X - 0.2, y + 0.04, 7.3 + k * 0.35 + dz],
            rotation: [0, Math.PI / 2, 0],
          });
  [3.2, 4.6].forEach((z, i) =>
    poster(
      b,
      { x: -WALL_X + 0.12, y: 2.2, z, ry: Math.PI / 2 },
      i ? 5 : 0,
      0.7,
      0.95,
    ),
  );
  poster(b, { x: WALL_X - 0.12, y: 2.2, z: 4, ry: -Math.PI / 2 }, 4, 0.7, 0.95);
  plant(b, { x: -5.4, z: 9.6 }, 1.2);
  plant(b, { x: 5.4, z: 3 }, 1.2);
  return b.build();
}

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
            <primitive object={MAPLE} attach="material" />
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
        <mesh key={x} position={[x, 0.32, FOUL_Z - 0.6]} material={RETURN}>
          <boxGeometry args={[0.5, 0.42, 1]} />
        </mesh>
      ))}
    </>
  );
}

/** Seconds from one bowl to the next on the other lanes, the ball's roll
 * and how long the knocked pins lie before the sweep racks them again. */
const OTHER_EVERY = 9;
const OTHER_ROLL = 2.4;
const OTHER_DOWN = 3;

/** The other three lanes, bowled by the regulars: a ball rolls down every
 * few seconds and knocks some pins flat, then the rack comes back. Pins and
 * balls are one draw call each. */
function OtherRacks({ geometry }: { geometry: THREE.BufferGeometry }) {
  const calm = useReducedMotion();
  const pins = useRef<THREE.InstancedMesh>(null);
  const balls = useRef<THREE.InstancedMesh>(null);
  const lanes = useMemo(
    () => LANE_XS.map((_, lane) => lane).filter((l) => l !== PLAY_LANE),
    [],
  );
  useFrame(({ clock }) => {
    const pm = pins.current;
    const bm = balls.current;
    if (!pm || !bm) return;
    const { m, q, p, s, axis } = scratch;
    const t = clock.elapsedTime;
    lanes.forEach((lane, li) => {
      const k = (t + li * 3.1) / OTHER_EVERY;
      const into = calm ? OTHER_EVERY : (k % 1) * OTHER_EVERY;
      // how many this bowl takes down, the same all cycle long
      const n = Math.floor(k) * 3 + li;
      const knocked = 4 + ((n * 7) % 7);
      const roll = Math.min(1, into / OTHER_ROLL);
      const [bx, bz] = laneToRoom(lane, [
        Math.sin(n) * 0.08 * roll,
        roll * HEADPIN_Z + 0.4,
      ]);
      const gone = into > OTHER_ROLL + 0.3;
      bm.setMatrixAt(
        li,
        m.compose(
          p.set(bx, gone ? -1 : BALL_RADIUS, bz),
          q.identity(),
          s.set(1, 1, 1),
        ),
      );
      const fall = Math.min(1, Math.max(0, (into - OTHER_ROLL) / 0.35));
      const swept = into > OTHER_ROLL + OTHER_DOWN;
      PIN_SPOTS.forEach((spot, i) => {
        const [x, z] = laneToRoom(lane, spot);
        const down = !swept && (i * 5 + n) % 10 < knocked ? fall : 0;
        axis.set(Math.cos(i + n), 0, Math.sin(i + n)).normalize();
        q.setFromAxisAngle(axis, down * Math.PI * 0.5);
        m.compose(
          p.set(x + axis.z * down * 0.2, 0, z - axis.x * down * 0.2),
          q,
          s.set(1, 1, 1),
        );
        pm.setMatrixAt(li * PIN_SPOTS.length + i, m);
      });
    });
    pm.instanceMatrix.needsUpdate = true;
    bm.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh
        ref={pins}
        args={[geometry, undefined, lanes.length * PIN_SPOTS.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#f4f0ff"
          emissive="#c9b7ff"
          emissiveIntensity={0.35}
          roughness={0.3}
        />
      </instancedMesh>
      <instancedMesh
        ref={balls}
        args={[undefined, undefined, lanes.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[BALL_RADIUS, 20, 14]} />
        <meshStandardMaterial
          color="#7b4dff"
          emissive="#ff2f9a"
          emissiveIntensity={0.4}
          roughness={0.2}
        />
      </instancedMesh>
    </>
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
        // the way it's traveling, in the room (down the lane is -z)
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
        <mesh key={x} position={[x, 0.22, BENCH_Z]} material={VINYL}>
          <boxGeometry args={[1.8, 0.44, 0.42]} />
        </mesh>
      ))}
      {/* the shoe counter, its cubbies glowing behind it */}
      <mesh
        position={[
          (COUNTER.x0 + COUNTER.x1) / 2,
          0.55,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ]}
        material={LAMINATE}
      >
        <boxGeometry
          args={[COUNTER.x1 - COUNTER.x0, 1.1, COUNTER.z1 - COUNTER.z0]}
        />
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
  const wall = <primitive object={WALL} attach="material" />;
  const depth = FRONT_Z - BACK_Z;
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <primitive object={dressing} />
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
        color="#a080d0"
        texture={{ id: "carpet", scale: 0.6 }}
        mirror={0.2}
        low={{ metalness: 0, roughness: 0.9 }}
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
