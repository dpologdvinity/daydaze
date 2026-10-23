import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DEFAULT_LOOK, type Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { DialogueContext } from "../../game/dialogue/types.ts";
import { Doll } from "../avatar/Doll.tsx";
import { PROGRAM } from "../../game/iceShow.ts";
import type { Player } from "../world/PlayerController.tsx";
import { placePlayer } from "../world/PlayerController.tsx";
import { cameraHold } from "../world/cameraHold.ts";
import { show } from "./icerink/session.ts";
import { curling } from "./icerink/curling.ts";
import { CurlingSheet } from "./icerink/CurlingSheet.tsx";
import { useReducedMotion } from "../motion.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { bunting, GLOSS, painted, plant, poster } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

// white dasher boards, a timber cocoa stand under a red awning
const BOARDS = surface("plastic", {
  scale: 1,
  color: "#f4f7ff",
  roughness: 0.4,
});
// the boards are one open ring, seen from both sides (this color is theirs alone)
BOARDS.side = THREE.DoubleSide;
const TIMBER = surface("wood_plank_wall", { scale: 0.9, color: "#d08a5a" });
const AWNING = surface("plastic", {
  scale: 1,
  color: "#d94f4f",
  roughness: 0.6,
});

/** Cocoa mugs on the stand, pennants over it, benches of rental skates,
 * evergreens and posters. */
function buildDressing() {
  const b = new Batch();
  const mug = new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10);
  for (let k = 0; k < 6; k++)
    b.add(painted(mug, k % 2 ? "#ff2f9a" : "#f4f0ea"), GLOSS, {
      position: [6.7 + k * 0.35, 1.16, 6.1],
    });
  bunting(
    b,
    [6.3, 2.35, 5.8],
    [8.9, 2.35, 5.8],
    10,
    ["#9ad8ff", "#ffffff", "#ff4fb3"],
    0.15,
    0.16,
  );
  // a bench of rental skates by the door
  const box = new THREE.BoxGeometry(1, 1, 1);
  b.add(box, TIMBER, { position: [-7.4, 0.42, 6.6], scale: [2.4, 0.08, 0.5] });
  for (let k = 0; k < 6; k++)
    b.add(painted(box, k % 2 ? "#f4f4f8" : "#2a2a34"), GLOSS, {
      position: [-8.4 + k * 0.4, 0.52, 6.6],
      scale: [0.1, 0.14, 0.26],
    });
  for (const [x, z] of [
    [-10, -7],
    [10, -7],
    [-10, 7],
  ] as const)
    plant(b, { x, z }, 1.8);
  poster(b, { x: 7.6, y: 1.7, z: 6.84, ry: Math.PI }, 7, 0.8, 0.5);
  return b.build();
}
import { PortalPads } from "./shared/PortalPads.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { Bulbs } from "./amusementpark/Bulbs.tsx";

const CONTEXT: DialogueContext = { venue: "ice-rink", neighborhood: "uptown" };

/** The ice: an ellipse with these half-widths, centered on the hall. */
const RINK = { rx: 8.4, rz: 5 };

// skaters lap the ice in a loose line, each in her own lane and pace
const SKATERS: readonly {
  look: Look;
  lane: number;
  speed: number;
  at: number;
}[] = [
  {
    look: {
      ...DEFAULT_LOOK,
      outfit: "fur",
      outfitColor: "#e8e2ff",
      hairStyle: "long-straight",
    },
    lane: 0.82,
    speed: 0.32,
    at: 0,
  },
  {
    look: {
      ...DEFAULT_LOOK,
      outfit: "jeans",
      outfitColor: "#ff2f9a",
      hairStyle: "ponytail",
      hairColor: "#1b1014",
      skin: "#633c29",
    },
    lane: 0.7,
    speed: 0.36,
    at: 1.6,
  },
  {
    look: {
      ...DEFAULT_LOOK,
      outfit: "flares",
      outfitColor: "#3fe0d0",
      hairStyle: "buns",
      hairColor: "#ff4fb3",
    },
    lane: 0.6,
    speed: 0.28,
    at: 3.4,
  },
  {
    look: {
      ...DEFAULT_LOOK,
      outfit: "blouse",
      outfitColor: "#9b5cff",
      hairStyle: "mid-curly",
      hairColor: "#4a2a1c",
      skin: "#94603f",
    },
    lane: 0.76,
    speed: 0.4,
    at: 4.8,
  },
];

const GLIDE = { current: { speed: 1.1 } };
/** Half the boards' opening at the front, radians either side of +z. */
const BOARD_GAP = 0.2;
const LIGHT_COLORS = ["#ffe9b0", "#9ad8ff", "#ffe9b0"];

function Skater({
  look,
  lane,
  speed,
  at,
  seed,
}: (typeof SKATERS)[number] & { seed: number }) {
  const calm = useReducedMotion();
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    // they clear the ice for a curling end
    g.current.visible = curling.get().phase === "off";
    const a = at + clock.elapsedTime * speed * (calm ? 0.3 : 1);
    const x = Math.cos(a) * RINK.rx * lane;
    const z = Math.sin(a) * RINK.rz * lane;
    g.current.position.set(x, 0.06, z);
    // facing along the lap (anticlockwise seen from above), leaning in
    g.current.rotation.set(
      0,
      Math.atan2(-Math.sin(a) * RINK.rx, Math.cos(a) * RINK.rz),
      0,
    );
  });
  return (
    <group ref={g}>
      <Doll look={look} mood="idle" walk={GLIDE} seed={seed} />
    </group>
  );
}

/** Your program on the ice: a lap of the rink on the music; a stuck jump
 * lifts you into turns in the air, a stuck spin spins you on the spot,
 * and the camera follows from the middle of the ice. */
function IceShow({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const skating = useRef(false);
  const camera = useThree((st) => st.camera);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      show.leave();
      if (skating.current) player.seat = null;
      if (cameraHold.by === "ice-rink") cameraHold.by = null;
    },
    [player],
  );
  useFrame((_, dt) => {
    const now = performance.now();
    show.tick(now);
    const s = show.store.get();
    // let go only of what the show held: curling shares the ice
    if (s.phase === "off") {
      if (cameraHold.by === "ice-rink") cameraHold.by = null;
      if (skating.current) {
        skating.current = false;
        player.seat = null;
        placePlayer(player, 0, RINK.rz * 0.55);
      }
      return;
    }
    cameraHold.by = "ice-rink";
    skating.current = true;
    const t = show.routineTime(now);
    const a = Math.PI / 2 + (t / 18) * Math.PI * 2;
    const x = Math.cos(a) * RINK.rx * 0.55;
    const z = Math.sin(a) * RINK.rz * 0.55;
    let lift = 0;
    let turn = 0;
    PROGRAM.forEach((e, i) => {
      if (s.routine.marks[i] !== "stuck" || calm) return;
      const f = (t - (e.at - 0.35)) / 0.7;
      if (f < 0 || f > 1) return;
      if (e.kind === "jump") {
        lift = Math.sin(f * Math.PI) * 0.7;
        turn = f * Math.PI * 2 * (e.difficulty >= 0.3 ? 3 : 2);
      } else if (e.kind === "spin") turn = f * Math.PI * 6;
    });
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(x, 0.06 + lift, z);
    // facing along the lap, plus any turns in the air
    player.seat.yaw =
      Math.atan2(-Math.sin(a) * RINK.rx, Math.cos(a) * RINK.rz) + turn;
    player.seat.sit = false;
    eye.set(x * 0.25, 4.5, z * 0.25 + 9);
    look.set(x, 0.8, z);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2));
    camera.lookAt(look);
  });
  return null;
}

/**
 * The Park Ice Rink: a white oval of ice under string lights, rink boards
 * round it, snow drifting down, skaters gliding laps and a hot cocoa stand by
 * the door. The player walks the ice like anyone else.
 */
export function IceRink({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const calm = useReducedMotion();
  const dressing = useMemo(buildDressing, []);
  const lights = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i): [number, number, number] => {
        const a = (i / 28) * Math.PI * 2;
        return [
          Math.cos(a) * (RINK.rx + 0.3),
          3.4 + Math.sin(i * 1.7) * 0.15,
          Math.sin(a) * (RINK.rz + 0.3),
        ];
      }),
    [],
  );
  return (
    <>
      <color attach="background" args={["#0b1230"]} />
      <fog attach="fog" args={["#1a2550", 14, 40]} />
      <hemisphereLight args={["#cfe3ff", "#2a3060", 1.3]} />
      <pointLight
        position={[0, 6, 0]}
        color="#e8f2ff"
        intensity={8}
        distance={22}
      />
      <Floor
        width={22}
        depth={16}
        center={[0, 0]}
        color="#8a9ad8"
        texture={{ id: "rubber_tiles", scale: 0.8 }}
        low={{ metalness: 0, roughness: 0.8 }}
        onPick={onPick}
      />
      <primitive object={dressing} />
      {/* the ice itself, glossy and pale, a hair over the hall floor */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.02, 0]}
        scale={[RINK.rx, RINK.rz, 1]}
        raycast={() => {}}
      >
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial
          color="#e9f4ff"
          roughness={0.08}
          metalness={0.1}
          emissive="#6f8fb5"
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* the rink boards: one low wall round the ice, a gap facing the door */}
      <mesh position={[0, 0.5, 0]} scale={[RINK.rx + 0.3, 1, RINK.rz + 0.3]}>
        <cylinderGeometry
          args={[1, 1, 1, 64, 1, true, BOARD_GAP, Math.PI * 2 - BOARD_GAP * 2]}
        />
        <primitive object={BOARDS} attach="material" />
      </mesh>
      <Bulbs points={lights} colors={LIGHT_COLORS} radius={0.09} />
      <Sparkles
        count={calm ? 0 : 120}
        scale={[20, 6, 14]}
        position={[0, 3, 0]}
        size={2.5}
        speed={calm ? 0 : 0.15}
        color="#ffffff"
        opacity={0.8}
      />
      {SKATERS.map((s, i) => (
        <Skater key={i} {...s} seed={70 + i} />
      ))}
      {/* the hot cocoa stand, right of the door */}
      <mesh position={[7.6, 0.55, 6.4]} material={TIMBER}>
        <boxGeometry args={[2.4, 1.1, 0.9]} />
      </mesh>
      <mesh position={[7.6, 2.4, 6.4]} material={AWNING}>
        <boxGeometry args={[2.6, 0.12, 1.2]} />
      </mesh>
      <TalkingNpc
        name="Noelle"
        role="snack-cashier"
        look={{
          ...DEFAULT_LOOK,
          outfit: "fur",
          outfitColor: "#ff2f9a",
          hairStyle: "bob",
          hairColor: "#f1d78f",
        }}
        mood="idle"
        at={[7.6, 0, 5.6]}
        rot={0}
        seed={77}
        greet
        situation="greeting-first"
        context={CONTEXT}
      />
      <PortalPads room={ROOMS["ice-rink"]} color="#9ad8ff" />
      <IceShow player={player} />
      <CurlingSheet player={player} />
    </>
  );
}
