import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  AUDIENCE,
  FLOOR_BOUNDS,
  JUDGE_XS,
  JUDGE_Z,
  JUDGES,
  PROGRAM,
  PROGRAM_SECONDS,
  RUNWAY,
  strutAt,
} from "../../game/catwalk.ts";
import type { DialogueContext } from "../../game/dialogue/types.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Doll } from "../avatar/Doll.tsx";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import type { Player } from "../world/PlayerController.tsx";
import { placePlayer } from "../world/PlayerController.tsx";
import { runway } from "./catwalk/session.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { plant, poster } from "./shared/details.ts";
import { GOLD } from "./shared/materials.ts";
import { groundMaps, surface } from "../city/worldTexture.ts";

// velvet-draped walls, a lacquered judges' table
const DRAPE = surface("velour_velvet", { scale: 1.2, color: "#b070c8" });
const VELVET_PINK = surface("velour_velvet", { scale: 2, color: "#ff8ad0" });
const LACQUER_TOP = surface("leather_white", {
  scale: 2,
  color: "#2a2030",
  roughness: 0.3,
});
const CURTAIN_PILE = groundMaps("velour_velvet").normalMap;
CURTAIN_PILE.repeat.set(3, 3);

/** Brass stanchions and velvet rope down the runway, fashion week posters,
 * flowers at the runway's end. */
function buildDressing() {
  const b = new Batch();
  const post = new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8);
  const foot = new THREE.CylinderGeometry(0.14, 0.16, 0.04, 12);
  const knob = new THREE.SphereGeometry(0.05, 6, 4);
  const rope = new THREE.CylinderGeometry(0.022, 0.022, 1, 6);
  for (const side of [-1, 1]) {
    const x = side * (RUNWAY.half + 0.45);
    for (let z = RUNWAY.z0 + 1; z <= RUNWAY.z1; z += 2) {
      b.add(post, GOLD, { position: [x, 0.5, z] });
      b.add(foot, GOLD, { position: [x, 0.02, z] });
      b.add(knob, GOLD, { position: [x, 0.98, z] });
      if (z + 2 <= RUNWAY.z1)
        b.add(rope, VELVET_PINK, {
          position: [x, 0.82, z + 1],
          rotation: [Math.PI / 2, 0, 0],
          scale: [1, 2, 1],
        });
    }
  }
  [-7, -3, 1].forEach((z, i) => {
    poster(
      b,
      { x: FLOOR_BOUNDS.x0 + 0.02, y: 2.6, z, ry: Math.PI / 2 },
      [6, 4, 7][i] ?? 0,
      1.1,
      1.5,
      GOLD,
    );
    poster(
      b,
      { x: FLOOR_BOUNDS.x1 - 0.02, y: 2.6, z, ry: -Math.PI / 2 },
      [1, 3, 5][i] ?? 0,
      1.1,
      1.5,
      GOLD,
    );
  });
  for (const x of [-1.9, 1.9]) plant(b, { x, z: RUNWAY.z1 + 0.6 }, 1.2);
  return b.build();
}
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const PINK = "#ff4fb3";
const CONTEXT: DialogueContext = {
  venue: "catwalk",
  neighborhood: "arts-district",
};
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
const CZ = (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2;
const HEIGHT = 7;
const LENGTH = RUNWAY.z1 - RUNWAY.z0;
const MID = (RUNWAY.z0 + RUNWAY.z1) / 2;
/** Where she stands when she steps off: beside the runway's end. */
const OFF_SPOT: [number, number] = [2.4, 4.2];

const JUDGE_LOOKS: readonly Look[] = [
  {
    skin: "#e6b48e",
    hairStyle: "bob",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "blouse",
    outfitColor: "#141018",
    shadow: "#8a5a3c",
  },
  {
    skin: "#633c29",
    hairStyle: "ponytail",
    hairColor: "#1b1014",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "flares",
    outfitColor: "#ff2f9a",
    shadow: "#7b4dff",
  },
  {
    skin: "#94603f",
    hairStyle: "bob",
    hairColor: "#f1d78f",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    outfit: "blouse",
    outfitColor: "#e8e2ff",
    shadow: "#3fe0d0",
  },
];
const CROWD_LOOKS: readonly Look[] = [
  {
    skin: "#e6b48e",
    hairStyle: "long-straight",
    hairColor: "#4a2a1c",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    outfit: "flares",
    outfitColor: "#3fe0d0",
    shadow: "#2e7dff",
  },
  {
    skin: "#633c29",
    hairStyle: "waves",
    hairColor: "#ff4fb3",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "blouse",
    outfitColor: "#9b5cff",
    shadow: "#7b4dff",
  },
  {
    skin: "#94603f",
    hairStyle: "ponytail",
    hairColor: "#b77a3e",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "jeans",
    outfitColor: "#141018",
    shadow: "#3fe0d0",
  },
  {
    skin: "#e6b48e",
    hairStyle: "long-straight",
    hairColor: "#1b1014",
    lips: "lips-nude-pink-gloss",
    brows: "brows-y2k-thin",
    outfit: "blouse",
    outfitColor: "#ff2f9a",
    shadow: "#8a5a3c",
  },
];
const HOST_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "bob",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#7b4dff",
};

/** The photographers' pit either side of the runway's end. */
const PHOTOGRAPHERS: readonly [number, number][] = [
  [-1.9, 3.9],
  [1.9, 3.9],
];
/** Camera flashes: the photographers', then phones along the rope. */
const FLASHES: readonly [number, number, number][] = [
  ...PHOTOGRAPHERS.map(([x, z]): [number, number, number] => [
    x * 0.88,
    1.55,
    z - 0.35,
  ]),
  ...AUDIENCE.map(([x, z]): [number, number, number] => [
    x * 0.88,
    1.45,
    z + 0.2,
  ]),
];
/** Set by the show when a cue is stuck: every camera goes off at once. */
const burst = { until: 0 };

/** Faces from (x, z) towards (tx, tz); yaw 0 faces +z. */
const facing = (x: number, z: number, tx: number, tz: number) =>
  Math.atan2(tx - x, tz - z);

/** The cameras and phones going off: each flash pops on now and then,
 * and all of them together when you stick a cue. */
function Flashes() {
  const calm = useReducedMotion();
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        color: hdr("#ffffff", 6),
        toneMapped: false,
        depthWrite: false,
      }),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const all = performance.now() < burst.until;
    refs.current.forEach((s, i) => {
      if (!s) return;
      const tick = Math.floor(t * 9);
      const r = Math.sin(tick * 12.9898 + i * 78.233) * 43758.5453;
      s.visible =
        !calm && (all ? (tick + i) % 2 === 0 : r - Math.floor(r) > 0.94);
    });
  });
  return (
    <>
      {FLASHES.map((p, i) => (
        <sprite
          key={i}
          ref={(s) => {
            refs.current[i] = s;
          }}
          position={p}
          scale={0.32}
          material={mat}
          visible={false}
        />
      ))}
    </>
  );
}

/** Your walk: down the runway, poses at its end, back to the middle and
 * down again; a stuck cue gets its flourish (a hip sway, a shoulder
 * turned to the cameras, a twirl) and the flashes go off. */
function RunwayShow({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const stuck = useRef(0);
  useEffect(
    () => () => {
      runway.leave();
      player.seat = null;
      if (cameraHold.by === "catwalk") cameraHold.by = null;
    },
    [player],
  );
  useFrame((_, dt) => {
    const now = performance.now();
    runway.tick(now);
    const s = runway.store.get();
    cameraHold.by = s.phase !== "off" ? "catwalk" : null;
    if (s.phase === "off") {
      stuck.current = 0;
      if (player.seat) {
        player.seat = null;
        placePlayer(player, OFF_SPOT[0], OFF_SPOT[1]);
      }
      return;
    }
    const t = s.phase === "over" ? PROGRAM_SECONDS : runway.routineTime(now);
    const hits = s.routine.marks.filter((m) => m === "stuck").length;
    if (hits > stuck.current) burst.until = now + 700;
    stuck.current = hits;
    const at = strutAt(t);
    let turn = 0;
    PROGRAM.forEach((e, i) => {
      if (s.routine.marks[i] !== "stuck" || calm) return;
      const f = (t - (e.at - 0.35)) / 0.7;
      if (f < 0 || f > 1) return;
      if (e.kind === "twirl") turn = f * Math.PI * 2;
      else if (e.kind === "pose") turn = Math.sin(f * Math.PI) * 0.9;
      else turn = Math.sin(f * Math.PI * 2) * 0.3;
    });
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(0, RUNWAY.height, at.z);
    player.seat.yaw = at.yaw + turn;
    player.seat.sit = false;
    player.seat.stride = at.stride && s.phase === "routine";
    // from past the judges, looking up the runway at her
    eye.set(2.6, 3.4, Math.min(at.z + 7, 11.5));
    look.set(0, 1.3, at.z);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2));
    camera.lookAt(look);
  });
  return null;
}

/**
 * The Catwalk on Gallery Row: a long glossy runway edged in pink LEDs down
 * the middle of a dark hall, spotlights down its length, backstage under
 * the neon sign at the far end, and the judges' table past the near end
 * with the photographers' pit in front of it. Walk the runway for the
 * judges: strut, pose and twirl on the cues.
 */
export function Catwalk({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const dressing = useMemo(buildDressing, []);
  const led = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: hdr(PINK, 3), toneMapped: false }),
    [],
  );
  const beam = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffe9f6",
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  return (
    <>
      <color attach="background" args={["#08040e"]} />
      <fog attach="fog" args={["#100818", 16, 40]} />
      <hemisphereLight args={["#f4eaff", "#2a1838", 0.9]} />
      <pointLight
        position={[0, 6, -3]}
        color="#fff2fa"
        intensity={9}
        distance={20}
      />
      <pointLight
        position={[0, 4, 4]}
        color={PINK}
        intensity={4}
        distance={10}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, CZ]}
        color="#6a5a7a"
        texture={{ id: "marble_tiles", scale: 0.35 }}
        low={{ metalness: 0.2, roughness: 0.5 }}
        onPick={onPick}
      />
      <primitive object={dressing} />
      <PortalPads room={ROOMS.catwalk} color={PINK} />
      {/* the runway: a raised glossy slab, LED strips down both edges */}
      <mesh position={[0, RUNWAY.height / 2, MID]}>
        <boxGeometry args={[RUNWAY.half * 2, RUNWAY.height, LENGTH]} />
        <meshStandardMaterial
          color="#f6f0fa"
          roughness={0.08}
          metalness={0.2}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (RUNWAY.half + 0.03), RUNWAY.height - 0.03, MID]}
          material={led}
        >
          <boxGeometry args={[0.06, 0.06, LENGTH]} />
        </mesh>
      ))}
      <mesh
        position={[0, RUNWAY.height - 0.03, RUNWAY.z1 + 0.03]}
        material={led}
      >
        <boxGeometry args={[RUNWAY.half * 2 + 0.12, 0.06, 0.06]} />
      </mesh>
      {/* spotlights down the runway: glowing cones, not real lights */}
      {[-7.5, -3.5, 0.5].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position-y={HEIGHT / 2 + 0.3} material={beam}>
            <coneGeometry args={[1.3, HEIGHT - 0.6, 20, 1, true]} />
          </mesh>
          <mesh position-y={HEIGHT - 0.4}>
            <cylinderGeometry args={[0.18, 0.24, 0.4, 10]} />
            <meshStandardMaterial color="#1c1424" metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* the walls, backstage's curtain and its LED arch */}
      {[
        [0, HEIGHT / 2, FLOOR_BOUNDS.z0 - 0.1, W, HEIGHT, 0.2],
        [FLOOR_BOUNDS.x0 - 0.1, HEIGHT / 2, CZ, 0.2, HEIGHT, D],
        [FLOOR_BOUNDS.x1 + 0.1, HEIGHT / 2, CZ, 0.2, HEIGHT, D],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]} material={DRAPE}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}
      <mesh position={[0, 1.7, FLOOR_BOUNDS.z0 + 0.05]}>
        <planeGeometry args={[3, 3.4]} />
        <meshStandardMaterial
          color="#3a0f3a"
          emissive="#5a1050"
          emissiveIntensity={0.6}
          normalMap={CURTAIN_PILE}
        />
      </mesh>
      {[
        [-1.55, 1.75, 0.08, 3.5],
        [1.55, 1.75, 0.08, 3.5],
        [0, 3.45, 3.18, 0.08],
      ].map(([x, y, w, h]) => (
        <mesh
          key={`${x}${y}`}
          position={[x, y, FLOOR_BOUNDS.z0 + 0.08]}
          material={led}
        >
          <boxGeometry args={[w, h, 0.06]} />
        </mesh>
      ))}
      <NeonText
        text="THE CATWALK"
        color={PINK}
        font={MARQUEE}
        width={6}
        k={3.4}
        flicker
        position={[0, 5, FLOOR_BOUNDS.z0 + 0.06]}
      />
      {/* the judges' table, a pink strip down its front, and the judges */}
      <mesh position={[0, 0.38, (JUDGES.z0 + JUDGES.z1) / 2]}>
        <boxGeometry
          args={[JUDGES.x1 - JUDGES.x0, 0.76, JUDGES.z1 - JUDGES.z0]}
        />
        <primitive object={LACQUER_TOP} attach="material" />
      </mesh>
      <mesh position={[0, 0.7, JUDGES.z0 - 0.01]} material={led}>
        <boxGeometry args={[JUDGES.x1 - JUDGES.x0, 0.04, 0.02]} />
      </mesh>
      {JUDGE_XS.map((x, i) => (
        <group key={x} position={[x, 0, JUDGE_Z]} rotation-y={Math.PI}>
          <mesh position-y={0.25} material={VELVET_PINK}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
          </mesh>
          {/* a chair's height, less where a sitting doll's thighs come to */}
          <group position-y={0.5 - 0.48}>
            <Doll look={JUDGE_LOOKS[i]} mood="sit" seed={300 + i} />
          </group>
        </group>
      ))}
      {/* the audience along the runway, the photographers at its end */}
      {AUDIENCE.map(([x, z], i) => (
        <group
          key={i}
          position={[x, 0, z]}
          rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}
        >
          <CrowdFigure
            look={CROWD_LOOKS[i % CROWD_LOOKS.length]}
            seed={310 + i}
          />
        </group>
      ))}
      {PHOTOGRAPHERS.map(([x, z], i) => (
        <group
          key={i}
          position={[x, 0, z]}
          rotation-y={facing(x, z, 0, RUNWAY.z1 - 1)}
        >
          <CrowdFigure
            look={CROWD_LOOKS[(i + 2) % CROWD_LOOKS.length]}
            seed={320 + i}
          />
          <mesh position={[0, 1.52, 0.3]}>
            <boxGeometry args={[0.22, 0.15, 0.14]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      ))}
      <Flashes />
      <TalkingNpc
        name="Sloane"
        role="coat-check"
        look={HOST_LOOK}
        mood="pose"
        at={[4.6, 0, 7.6]}
        rot={-Math.PI / 2}
        seed={330}
        greet
        context={CONTEXT}
      />
      <RunwayShow player={player} />
    </>
  );
}
