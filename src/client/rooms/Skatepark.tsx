import { Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { FLAT, HALF_WIDTH, LIP_Y, RADIUS, riderAt } from "../../game/skate.ts";
import {
  BLEACHER_SEATS,
  BLEACHER_Z,
  BOWL,
  FLOOR_BOUNDS,
  FUNBOX,
  PIPE,
  pipeToRoom,
} from "../../game/skatepark.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import type { Player } from "../world/PlayerController.tsx";
import { bail, runTime, skate, tick } from "./skatepark/session.ts";
import { Doll } from "../avatar/Doll.tsx";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted, plant } from "./shared/details.ts";
import { groundMaps, surface } from "../city/worldTexture.ts";

// smooth-troweled concrete ramps, a darker dish, aluminum bleachers
const RAMP = surface("brushed_concrete", {
  scale: 0.5,
  color: "#c8c4d0",
  roughness: 0.8,
});
const DISH = surface("brushed_concrete", {
  scale: 0.5,
  color: "#8a8694",
  roughness: 0.85,
});
const PLANKS = surface("metal_plate", {
  scale: 1.5,
  color: "#8a8a9a",
  metalness: 0.6,
  roughness: 0.5,
});
// the graffiti on a real block wall
const WALL_RELIEF = groundMaps("concrete_wall_008").normalMap;
WALL_RELIEF.repeat.set(10, 1.2);

/** Traffic cones, a trash can, spare boards and planters round the park. */
function buildDressing() {
  const b = new Batch();
  const cone = new THREE.ConeGeometry(0.14, 0.45, 10);
  const base = new THREE.BoxGeometry(0.3, 0.03, 0.3);
  for (const [x, z] of [
    [4.2, -1],
    [4.6, 6],
    [-4.8, -1.4],
    [12.4, -3],
  ] as const) {
    b.add(painted(cone, "#ff7a1f"), GLOSS, { position: [x, 0.25, z] });
    b.add(painted(base, "#ff7a1f"), GLOSS, { position: [x, 0.015, z] });
  }
  const can = new THREE.CylinderGeometry(0.3, 0.28, 0.9, 12);
  b.add(painted(can, "#2e7d4a"), GLOSS, { position: [-4.4, 0.45, 7.8] });
  b.add(painted(can, "#3a5ad8"), GLOSS, { position: [4.4, 0.45, 7.8] });
  // decks leaning on the bleachers
  const deck = new THREE.BoxGeometry(0.21, 0.8, 0.02);
  ["#ff4fb3", LIME, "#ffd84f", "#4fe3ff"].forEach((c, i) =>
    b.add(painted(deck, c), GLOSS, {
      position: [-3.2 + i * 0.3, 0.4, BLEACHER_Z - 0.32],
      rotation: [-0.25, 0, 0],
    }),
  );
  for (const [x, z] of [
    [-13.2, -8.6],
    [13.2, -8.6],
    [13.2, 5],
  ] as const)
    plant(b, { x, z }, 1.5);
  return b.build();
}
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const LIME = "#7dff6b";
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
const CZ = (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2;

// sprayed tags along the back wall
const GRAFFITI = canvasTex(
  512,
  128,
  (ctx) => {
    ctx.fillStyle = "#3a3a44";
    ctx.fillRect(0, 0, 512, 128);
    const colors = [
      "#ff4fb3",
      "#4fe3ff",
      "#ffd84f",
      "#7dff6b",
      "#b06bff",
      "#ff8a3d",
    ];
    const words = ["WAVE", "SK8", "DAZE", "RIP", "GRIND", "<3"];
    ctx.textAlign = "center";
    words.forEach((w, i) => {
      ctx.save();
      ctx.translate(48 + i * 84, 70 + (i % 2) * 14);
      ctx.rotate((i % 3) * 0.08 - 0.08);
      ctx.font = "900 52px sans-serif";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#14051f";
      ctx.strokeText(w, 0, 0);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillText(w, 0, 0);
      ctx.restore();
    });
  },
  [2, 1],
);

/** The half-pipe's concrete: its cross-section (decks, walls, flat)
 * extruded along its depth. */
function pipeGeometry() {
  const shape = new THREE.Shape();
  const deck = HALF_WIDTH + 1.2;
  shape.moveTo(-deck, 0);
  shape.lineTo(-deck, LIP_Y);
  shape.lineTo(-HALF_WIDTH, LIP_Y);
  for (let i = 1; i <= 16; i++) {
    const a = (Math.PI / 2) * (i / 16);
    shape.lineTo(
      -FLAT / 2 - Math.cos(a) * RADIUS,
      RADIUS - Math.sin(a) * RADIUS,
    );
  }
  shape.lineTo(FLAT / 2, 0);
  for (let i = 1; i <= 16; i++) {
    const a = (Math.PI / 2) * (i / 16);
    shape.lineTo(
      FLAT / 2 + Math.sin(a) * RADIUS,
      RADIUS - Math.cos(a) * RADIUS,
    );
  }
  shape.lineTo(deck, LIP_Y);
  shape.lineTo(deck, 0);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: PIPE.depth,
    bevelEnabled: false,
  });
  g.translate(0, 0, -PIPE.depth / 2);
  return g;
}

function HalfPipe() {
  const geo = useMemo(pipeGeometry, []);
  return (
    <group position={[PIPE.x, 0, PIPE.z]}>
      <mesh geometry={geo} material={RAMP} />
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * HALF_WIDTH, LIP_Y, 0]}
          rotation-x={Math.PI / 2}
        >
          <cylinderGeometry args={[0.05, 0.05, PIPE.depth, 10]} />
          <meshStandardMaterial
            color="#e8e8f0"
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
      ))}
      {/* a neon strip down each wall's edge */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            side * (HALF_WIDTH + 1.19),
            LIP_Y / 2,
            PIPE.depth / 2 + 0.01,
          ]}
        >
          <planeGeometry args={[0.06, LIP_Y]} />
          <meshBasicMaterial color={hdr(LIME, 2.4)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** A skateboard: a kicked-up deck on four glowing wheels. */
function Board({ color }: { color: string }) {
  return (
    <group>
      <mesh position-y={0.09}>
        <boxGeometry args={[0.8, 0.03, 0.22]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {[-0.26, 0.26].flatMap((x) =>
        [-0.08, 0.08].map((z) => (
          <mesh
            key={`${x}${z}`}
            position={[x, 0.04, z]}
            rotation-x={Math.PI / 2}
          >
            <cylinderGeometry args={[0.035, 0.035, 0.03, 10]} />
            <meshBasicMaterial color={hdr("#fff1c8", 1.6)} toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Locals up in the bleachers watching the pipe: row, x, look. */
const SPECTATORS: readonly { row: 1 | 2; x: number; look: Look }[] = (
  [
    [1, -2.4, "#f3d4c4", "shag", "#ff4fb3", "jeans", "#141018"],
    [1, -0.6, "#94603f", "coils", "#1b1014", "shorts", "#3fe0d0"],
    [1, 1.8, "#e6b48e", "top-knot", "#b77a3e", "baby-tee-mini", "#9b5cff"],
    [2, -1.4, "#633c29", "afro", "#1b1014", "tracksuit-y2k", "#ffb02e"],
    [2, 0.8, "#c48d68", "pigtails", "#7ee8a2", "jeans", "#ff2f9a"],
    [2, 2.6, "#f3d4c4", "pixie", "#f1d78f", "shorts", "#e8e2ff"],
  ] as const
).map(([row, x, skin, hairStyle, hairColor, outfit, outfitColor]) => ({
  row,
  x,
  look: {
    skin,
    hairStyle,
    hairColor,
    outfit,
    outfitColor,
    lips: "lips-90s-caramel-ombre",
    brows: "brows-feathered-honey",
    shadow: "#3fe0d0",
  },
}));

const LOCALS: readonly Look[] = [
  {
    skin: "#633c29",
    hairStyle: "braids",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "jeans",
    outfitColor: "#141018",
    shadow: "#8a5a3c",
  },
  {
    skin: "#f3d4c4",
    hairStyle: "shag",
    hairColor: "#ff4fb3",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "shorts",
    outfitColor: "#3fe0d0",
    shadow: "#3fe0d0",
  },
];

/** A local carving laps of the bowl, rising up its sides. */
function BowlSkater() {
  const calm = useReducedMotion();
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const a = calm ? 0 : clock.elapsedTime * 0.9;
    const r = BOWL.r - 0.9;
    g.position.set(
      BOWL.x + Math.sin(a) * r,
      0.6 + Math.sin(a * 2) * 0.35,
      BOWL.z + Math.cos(a) * r,
    );
    g.rotation.y = a + Math.PI / 2;
  });
  return (
    <group ref={ref}>
      <group rotation-y={Math.PI / 2}>
        <Board color="#ff4fb3" />
      </group>
      <group position-y={0.1}>
        <CrowdFigure look={LOCALS[0]} seed={211} />
      </group>
    </group>
  );
}

/** A local ollieing the funbox, up and over and round again. */
function FunboxSkater() {
  const calm = useReducedMotion();
  const ref = useRef<THREE.Group>(null);
  const board = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = calm ? 0 : (clock.elapsedTime * 0.35) % 1;
    const x = FUNBOX.x0 - 1 + t * (FUNBOX.x1 - FUNBOX.x0 + 2);
    const over = Math.max(
      0,
      Math.sin(((x - FUNBOX.x0) / (FUNBOX.x1 - FUNBOX.x0)) * Math.PI),
    );
    g.position.set(x, 0.55 * over + 0.02, (FUNBOX.z0 + FUNBOX.z1) / 2);
    if (board.current)
      board.current.rotation.x =
        over > 0.5 && !calm ? (t * 40) % (Math.PI * 2) : 0;
  });
  return (
    <group ref={ref} rotation-y={Math.PI / 2}>
      <group ref={board} rotation-y={Math.PI / 2}>
        <Board color="#4fe3ff" />
      </group>
      <group position-y={0.1}>
        <CrowdFigure look={LOCALS[1]} seed={212} />
      </group>
    </group>
  );
}

/** Your run: your doll on a board, carried by the run's pose, and the
 * camera side-on to the pipe. */
function Ride({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const board = useRef<THREE.Group>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useEffect(
    () => () => {
      bail();
      player.seat = null;
      if (cameraHold.by === "skatepark") cameraHold.by = null;
    },
    [player],
  );

  useFrame((_, dt) => {
    const now = performance.now();
    tick(now);
    const s = skate.get();
    const riding = s.phase === "riding";
    cameraHold.by = s.phase !== "off" ? "skatepark" : null;
    const b = board.current;
    if (!riding) {
      if (player.seat && s.phase === "off") player.seat = null;
      if (b) b.visible = false;
      if (s.phase !== "off") {
        camera.position.lerp(eye.set(0, 3.2, PIPE.z + 10), 0.05);
        camera.lookAt(look.set(0, 1.2, PIPE.z));
      }
      return;
    }
    const pose = riderAt(runTime(now));
    const [rx, rz] = pipeToRoom(pose.x);
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(rx, pose.y + 0.12, rz);
    // she rides sideways on the board, chest to the camera, as skaters do
    player.seat.yaw = 0;
    player.seat.sit = false;
    if (b) {
      b.visible = true;
      b.position.set(rx, pose.y, rz);
      // the board follows the wall's tilt, and flips through a trick in the air
      const trick =
        s.run.last &&
        s.run.used.includes(pose.lip) &&
        s.run.last.grade !== "bail";
      b.rotation.set(
        trick && pose.air !== null && !calm ? pose.air * Math.PI * 2 : 0,
        0,
        pose.pitch,
      );
    }
    eye.set(rx * 0.3, 3.6, PIPE.z + 13);
    look.set(rx * 0.4, 1.7, PIPE.z);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
  });

  return (
    <group ref={board} visible={false}>
      <Board color="#ffd84f" />
    </group>
  );
}

/**
 * Concrete Wave, the open-air skatepark on Beachside: a half-pipe under the
 * stars with steel coping and neon edges, a bowl where a local carves laps,
 * a funbox another ollies over and over, graffiti down the back wall,
 * bleachers to sit on and palms beyond. Drop in for a half-pipe trick run.
 */
export function Skatepark({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const calm = useReducedMotion();
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#08081e"]} />
      <primitive object={dressing} />
      <fog attach="fog" args={["#12102c", 22, 60]} />
      <Stars
        radius={70}
        depth={10}
        count={800}
        factor={3}
        fade
        speed={calm ? 0 : 0.3}
      />
      <hemisphereLight args={["#c8d0ff", "#3a2a40", 0.9]} />
      <pointLight
        position={[0, 9, -2]}
        color="#f4f8ff"
        intensity={8}
        distance={26}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, CZ]}
        color="#8a8690"
        texture={{ id: "brushed_concrete", scale: 0.4 }}
        low={{ metalness: 0, roughness: 0.9 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.skatepark} color={LIME} />
      <HalfPipe />
      {/* the bowl: a ring of coping round a sunken concrete dish */}
      <group position={[BOWL.x, 0, BOWL.z]}>
        <mesh position-y={0.01} rotation-x={-Math.PI / 2} material={DISH}>
          <circleGeometry args={[BOWL.r, 40]} />
        </mesh>
        <mesh position-y={0.05} rotation-x={Math.PI / 2}>
          <torusGeometry args={[BOWL.r, 0.06, 8, 48]} />
          <meshStandardMaterial
            color="#e8e8f0"
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
        <mesh position-y={0.04} rotation-x={Math.PI / 2}>
          <torusGeometry args={[BOWL.r - 0.4, 0.03, 6, 48]} />
          <meshBasicMaterial color={hdr("#ff4fb3", 2)} toneMapped={false} />
        </mesh>
      </group>
      {/* the funbox and its rail */}
      <mesh
        position={[
          (FUNBOX.x0 + FUNBOX.x1) / 2,
          0.3,
          (FUNBOX.z0 + FUNBOX.z1) / 2,
        ]}
      >
        <boxGeometry
          args={[FUNBOX.x1 - FUNBOX.x0, 0.6, FUNBOX.z1 - FUNBOX.z0]}
        />
        <primitive object={RAMP} attach="material" />
      </mesh>
      <mesh
        position={[(FUNBOX.x0 + FUNBOX.x1) / 2, 0.85, FUNBOX.z1 - 0.3]}
        rotation-z={Math.PI / 2}
      >
        <cylinderGeometry args={[0.04, 0.04, FUNBOX.x1 - FUNBOX.x0, 8]} />
        <meshStandardMaterial
          color="#e8e8f0"
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>
      {/* the graffiti wall behind the pipe, and the park's name */}
      <mesh position={[0, 1.6, FLOOR_BOUNDS.z0 - 0.1]}>
        <planeGeometry args={[W, 3.2]} />
        <meshStandardMaterial
          map={GRAFFITI}
          normalMap={WALL_RELIEF}
          roughness={0.9}
        />
      </mesh>
      <NeonText
        text="CONCRETE WAVE"
        color={LIME}
        font={MARQUEE}
        width={6}
        k={3.6}
        position={[0, 4.2, FLOOR_BOUNDS.z0]}
      />
      {/* bleachers, three steps up */}
      {[0, 1, 2].map((row) => (
        <mesh
          key={row}
          position={[0, 0.22 + row * 0.35, BLEACHER_Z + row * 0.5]}
        >
          <boxGeometry args={[6.8, 0.44 + row * 0.7, 0.5]} />
          <primitive object={PLANKS} attach="material" />
        </mesh>
      ))}
      <group
        position={[BLEACHER_SEATS[4][0] + 0.7, 0.35, BLEACHER_Z + 0.5]}
        rotation-y={Math.PI}
      >
        <CrowdFigure look={LOCALS[1]} seed={213} />
      </group>
      {SPECTATORS.map((sp, i) => (
        <group
          key={i}
          // a row's top, less where a sitting doll's thighs come to
          position={[
            sp.x,
            0.44 + sp.row * 0.7 - 0.48,
            BLEACHER_Z + sp.row * 0.5,
          ]}
          rotation-y={Math.PI}
        >
          <Doll look={sp.look} mood="sit" seed={221 + i} />
        </group>
      ))}
      <Palm position={[-13, 0, 8]} />
      <Palm position={[13, 0, 8]} scale={0.9} />
      <BowlSkater />
      <FunboxSkater />
      <Ride player={player} />
    </>
  );
}
