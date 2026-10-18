import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { DialogueContext } from "../../game/dialogue/types.ts";
import type { Look } from "../../game/look.ts";
import {
  BENCH_Z,
  COUNTER,
  DJ,
  FLOOR_BOUNDS,
  RENTAL,
  RINK,
} from "../../game/rollerRink.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Doll } from "../avatar/Doll.tsx";
import { useReducedMotion } from "../motion.ts";
import { setSkates } from "../world/skates.ts";
import { MirrorBall } from "./pulse/Decor.tsx";
import { type Beam, Beams } from "./shared/Beams.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { LedFloor } from "./shared/LedFloor.tsx";
import { Batch } from "./shared/batch.ts";
import { plant, poster, stringLights } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

// midnight-painted block, carpeted booth, vinyl benches
const BLOCK = surface("concrete_wall_008", {
  scale: 0.4,
  color: "#4a3878",
  roughness: 0.9,
});
const BOOTH = surface("carpet", { scale: 2, color: "#5a4a90" });
const VINYL = surface("leather_white", {
  scale: 2.5,
  color: "#ff4fb3",
  roughness: 0.45,
});
const COUNTER_TOP = surface("terrazzo_tiles", {
  scale: 1.2,
  color: "#d8c8ff",
  roughness: 0.3,
});

/** Retro posters, bulbs looping over the rink, plants by the door. */
function buildDressing() {
  const b = new Batch();
  [-6, -3, 3, 6].forEach((x, i) =>
    poster(
      b,
      { x, y: 2.4, z: FLOOR_BOUNDS.z0 + 0.03 },
      [4, 1, 5, 7][i] ?? 0,
      1,
      1.3,
    ),
  );
  [-4, -1, 2].forEach((z, i) =>
    poster(
      b,
      { x: FLOOR_BOUNDS.x1 - 0.03, y: 2.4, z, ry: -Math.PI / 2 },
      i * 2,
      0.9,
      1.2,
    ),
  );
  for (const [a, c] of [
    [[-10.8, 5.2, -7.8], PINK],
    [[10.8, 5.2, -7.8], CYAN],
  ] as const)
    stringLights(b, a, [0, 5.4, 7.2], 30, c, 0.8);
  plant(b, { x: -4.2, z: 7.1 }, 1.3);
  plant(b, { x: 10.4, z: 7.1 }, 1.3);
  return b.build();
}
import { canvasTex, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const PINK = "#ff4fb3";
const CYAN = "#4fe3ff";
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
const CZ = (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2;
const HEIGHT = 6;
const CONTEXT: DialogueContext = {
  venue: "roller-rink",
  neighborhood: "beachside",
};

const BEAMS: readonly Beam[] = [
  { position: [-7, 5.5, -6], color: PINK, phase: 0 },
  { position: [7, 5.5, -6], color: CYAN, phase: 2 },
  { position: [-7, 5.5, 4.6], color: "#ffd84f", phase: 1 },
  { position: [7, 5.5, 4.6], color: "#b06bff", phase: 3 },
];

// the rink's maple, lane-striped with a pink border
const MAPLE = canvasTex(
  256,
  256,
  (ctx) => {
    ctx.fillStyle = "#d8a066";
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = x % 16 ? "rgba(120,60,20,0.1)" : "rgba(255,230,200,0.08)";
      ctx.fillRect(x, 0, 4, 256);
    }
  },
  [5, 3],
);

const SKATER_LOOKS: readonly Look[] = [
  {
    skin: "#f3d4c4",
    hairStyle: "pigtails",
    hairColor: "#ff4fb3",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "shorts",
    outfitColor: "#3fe0d0",
    shadow: "#3fe0d0",
  },
  {
    skin: "#633c29",
    hairStyle: "afro",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "flares",
    outfitColor: "#ffb02e",
    shadow: "#ffb02e",
  },
  {
    skin: "#e6b48e",
    hairStyle: "ponytail",
    hairColor: "#f1d78f",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    outfit: "baby-tee-mini",
    outfitColor: "#ff2f9a",
    shadow: "#ff2f9a",
  },
  {
    skin: "#94603f",
    hairStyle: "coils",
    hairColor: "#7b4dff",
    lips: "lips-90s-caramel-ombre",
    brows: "brows-fox-snatched",
    outfit: "tracksuit-y2k",
    outfitColor: "#9b5cff",
    shadow: "#7b4dff",
  },
];

const GLIDING = { current: { speed: 0.6 } };

/** A skater doing laps, a lane of her own out from the rail. */
function Skater({
  look,
  lane,
  phase,
  pace,
}: {
  look: Look;
  lane: number;
  phase: number;
  pace: number;
}) {
  const calm = useReducedMotion();
  const ref = useRef<THREE.Group>(null);
  const rx = RINK.rx - 1.2 - lane;
  const rz = RINK.rz - 1 - lane * 0.7;
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    // counter-clockwise, as rinks skate
    const a = phase - (calm ? 0 : clock.elapsedTime * pace);
    g.position.set(RINK.x + Math.sin(a) * rx, 0.06, RINK.z + Math.cos(a) * rz);
    g.rotation.y = Math.atan2(-Math.cos(a) * rx, Math.sin(a) * rz);
    // leaning into the turn
    g.rotation.z = calm ? 0 : 0.08;
  });
  return (
    <group ref={ref}>
      <Doll
        look={look}
        mood="idle"
        walk={GLIDING}
        seed={Math.round(phase * 97)}
      />
    </group>
  );
}

/** The rail round the rink: posts and a glowing top, with two gaps to skate
 * on and off by the benches. */
function Rail() {
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      // the gaps, both on the south side
      if (
        Math.abs(a - Math.PI * 0.86) < 0.12 ||
        Math.abs(a - Math.PI * 1.14) < 0.12
      )
        continue;
      out.push([
        RINK.x + Math.sin(a) * RINK.rx,
        RINK.z + Math.cos(a) * RINK.rz,
      ]);
    }
    return out;
  }, []);
  return (
    <>
      <instancedMesh
        ref={(m) => {
          if (!m) return;
          const o = new THREE.Object3D();
          posts.forEach(([x, z], i) => {
            o.position.set(x, 0.5, z);
            o.updateMatrix();
            m.setMatrixAt(i, o.matrix);
          });
          m.instanceMatrix.needsUpdate = true;
          m.computeBoundingSphere();
        }}
        args={[undefined, undefined, posts.length]}
      >
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshStandardMaterial color="#e8e2ff" metalness={0.7} roughness={0.3} />
      </instancedMesh>
      <mesh
        position={[RINK.x, 1, RINK.z]}
        rotation-x={Math.PI / 2}
        scale={[RINK.rx, RINK.rz, 1]}
      >
        <torusGeometry args={[1, 0.006, 6, 96]} />
        <meshBasicMaterial color={hdr(PINK, 2.6)} toneMapped={false} />
      </mesh>
    </>
  );
}

function Rental(): JSX.Element {
  const look: Look = {
    skin: "#c48d68",
    hairStyle: "bob",
    hairColor: "#1b1014",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "baby-tee-mini",
    outfitColor: "#3fe0d0",
    shadow: "#3fe0d0",
  };
  return (
    <>
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
        <primitive object={COUNTER_TOP} attach="material" />
      </mesh>
      {/* cubbies of skates on the wall behind */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={i}
          position={[
            FLOOR_BOUNDS.x0 + 0.12,
            1.4 + (i % 2) * 0.45,
            COUNTER.z0 + 0.3 + Math.floor(i / 2) * 0.7,
          ]}
        >
          <boxGeometry args={[0.2, 0.18, 0.4]} />
          <meshBasicMaterial
            color={hdr([PINK, CYAN, "#ffd84f", "#7dff6b"][i % 4], 1.2)}
            toneMapped={false}
          />
        </mesh>
      ))}
      <NeonText
        text="Skate Rental"
        color={CYAN}
        font={SCRIPT}
        width={2.4}
        k={3.2}
        position={[FLOOR_BOUNDS.x0 + 0.06, 2.8, (COUNTER.z0 + COUNTER.z1) / 2]}
        rotation-y={Math.PI / 2}
      />
      <TalkingNpc
        name="Roxy"
        role="cashier"
        look={look}
        mood="idle"
        at={[RENTAL[0], 0, RENTAL[1]]}
        rot={Math.PI / 2}
        seed={201}
        greet
        context={CONTEXT}
        onTap={() => setSkates(true)}
      />
    </>
  );
}

/**
 * The Starlite Roller Disco on Beachside: a maple oval inside a glowing
 * rail, an LED square at its heart under the mirror ball, beams sweeping,
 * skaters doing laps to disco, a DJ at the north end, and the rental
 * counter where Roxy hands out skates (or put on your own from the dock).
 */
export function RollerRink({ onPick }: { onPick: PickHandler }) {
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#0c0418"]} />
      <fog attach="fog" args={["#1c0a30", 12, 34]} />
      <hemisphereLight args={["#b08cff", "#ff8fb0", 0.6]} />
      <pointLight
        position={[0, 5, -0.6]}
        color={PINK}
        intensity={6}
        distance={16}
      />
      <pointLight
        position={[0, 4, 5]}
        color="#ffd8b0"
        intensity={3}
        distance={10}
      />
      <Beams beams={BEAMS} aim={[RINK.x, RINK.z]} />
      <Floor
        width={W}
        depth={D}
        center={[0, CZ]}
        color="#ffffff"
        map={MAPLE}
        texture={{ id: "wood_floor", scale: 0.8 }}
        mirror={0.35}
        low={{ metalness: 0.05, roughness: 0.35 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["roller-rink"]} color={CYAN} />
      {/* the walls, in midnight with a pink neon band */}
      {[
        [0, HEIGHT / 2, FLOOR_BOUNDS.z0 - 0.1, W, HEIGHT, 0.2],
        [FLOOR_BOUNDS.x0 - 0.1, HEIGHT / 2, CZ, 0.2, HEIGHT, D],
        [FLOOR_BOUNDS.x1 + 0.1, HEIGHT / 2, CZ, 0.2, HEIGHT, D],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]} material={BLOCK}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}
      <primitive object={dressing} />
      <NeonText
        text="Roller Disco"
        color={PINK}
        font={SCRIPT}
        width={6}
        k={3.8}
        flicker
        position={[0, 4.3, FLOOR_BOUNDS.z0 + 0.06]}
      />
      <Rail />
      <LedFloor
        center={[RINK.x, RINK.z]}
        cols={6}
        rows={4}
        colors={[PINK, CYAN, "#ffd84f", "#b06bff"]}
      />
      <group position={[RINK.x, 1.6, RINK.z - 1.2]}>
        <MirrorBall />
      </group>
      {/* the DJ's booth at the north end */}
      <mesh position={[DJ[0], 0.55, DJ[1]]} material={BOOTH}>
        <boxGeometry args={[2.2, 1.1, 1]} />
      </mesh>
      <mesh position={[DJ[0], 1.12, DJ[1] + 0.51]}>
        <boxGeometry args={[2.2, 0.04, 0.02]} />
        <meshBasicMaterial color={hdr(CYAN, 2.4)} toneMapped={false} />
      </mesh>
      {/* benches along the south wall */}
      {[3.5, 6.5].map((x) => (
        <mesh key={x} position={[x, 0.42, BENCH_Z]} material={VINYL}>
          <boxGeometry args={[1.8, 0.08, 0.42]} />
        </mesh>
      ))}
      <Rental />
      {SKATER_LOOKS.map((look, i) => (
        <Skater
          key={i}
          look={look}
          lane={i % 2}
          phase={i * 1.6}
          pace={0.32 + (i % 3) * 0.05}
        />
      ))}
    </>
  );
}
