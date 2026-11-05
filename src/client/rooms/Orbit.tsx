// Orbit 9, a club on a space station: one wall is a window onto a ringed
// planet and the stars (a CC-BY planet and star sphere, public/models/space-*),
// the DJ plays from a stage in front of it, LED tiles pulse on the floor, the
// soda bar and the lounge are built from Quaternius' CC0 Sci-Fi Essentials
// props. Layout comes from src/game/orbit.ts. The bartender's tap pours a
// mocktail (drink() is a toast at 13+).

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROOMS } from "../../game/rooms.ts";
import {
  BAR,
  CABINET,
  DANCE,
  JUKEBOX,
  LOUNGE_CHAIRS,
  LOUNGE_TABLES,
  STAGE,
  STOOL_X,
  STOOL_ZS,
  WINDOW_Z,
} from "../../game/orbit.ts";
import { drink } from "../effects/drunk.ts";
import { useReducedMotion } from "../motion.ts";
import { surface } from "../city/worldTexture.ts";
import { type Beam, Beams } from "./shared/Beams.tsx";
import { BarStools } from "./shared/BarStools.tsx";
import { Batch } from "./shared/batch.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { LedFloor } from "./shared/LedFloor.tsx";
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Prop } from "./shared/Prop.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { OrbitNpcs } from "./orbit/Npcs.tsx";

const WALL_X = 8;
const FRONT_Z = 7.2;
const HEIGHT = 6.4;
const VIOLET = "#9b7bff";
const CYAN = "#4fe3ff";
const PINK = "#ff4fb3";
/** The window in the back wall: its half-width and its sill and head heights. */
const WINDOW = { half: 6.6, y0: 0.9, y1: 4.7 } as const;

// lit enough to read in the dark: the station's panels glow faintly blue
const HULL = surface("metal_plate", {
  scale: 1.2,
  color: "#6a7498",
  metalness: 0.3,
  roughness: 0.6,
  emissive: "#2a3668",
  emissiveIntensity: 0.7,
});
const COUNTER = surface("brushed_concrete", {
  scale: 1,
  color: "#8e98bc",
  metalness: 0.3,
  roughness: 0.45,
  emissive: "#2c3868",
  emissiveIntensity: 0.6,
});
const BEAMS: readonly Beam[] = [
  { position: [-4.5, 5.6, -1.5], color: VIOLET, phase: 0 },
  { position: [4.5, 5.6, -1.5], color: CYAN, phase: 2 },
  { position: [0, 5.8, 2.5], color: PINK, phase: 4 },
];
const NEON = {
  cyan: new THREE.MeshBasicMaterial({ color: hdr(CYAN, 3), toneMapped: false }),
  violet: new THREE.MeshBasicMaterial({
    color: hdr(VIOLET, 3),
    toneMapped: false,
  }),
  pink: new THREE.MeshBasicMaterial({ color: hdr(PINK, 3), toneMapped: false }),
};
const BOX = new THREE.BoxGeometry(1, 1, 1);

/** Walls, the window's frame and struts, the stage, the bar and the neon
 * trim: every box of one material merged into one mesh. */
function buildShell() {
  const b = new Batch();
  const wall = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => b.add(BOX, HULL, { position: [x, y, z], scale: [w, h, d] });
  // back wall round the window: sill, head and the two end bays
  wall(0, WINDOW.y0 / 2, WINDOW_Z, 16, WINDOW.y0, 0.4);
  wall(0, (WINDOW.y1 + HEIGHT) / 2, WINDOW_Z, 16, HEIGHT - WINDOW.y1, 0.4);
  for (const s of [-1, 1])
    wall(
      s * (WINDOW.half + (WALL_X - WINDOW.half) / 2),
      HEIGHT / 2,
      WINDOW_Z,
      WALL_X - WINDOW.half,
      HEIGHT,
      0.4,
    );
  // side walls; the front stays open to the camera, like every room
  const depth = FRONT_Z - WINDOW_Z;
  for (const s of [-1, 1]) {
    wall(
      s * (WALL_X + 0.15),
      HEIGHT / 2,
      (FRONT_Z + WINDOW_Z) / 2,
      0.3,
      HEIGHT,
      depth,
    );
  }
  // struts across the window
  for (const x of [-3.3, 0, 3.3])
    wall(
      x,
      (WINDOW.y0 + WINDOW.y1) / 2,
      WINDOW_Z + 0.02,
      0.16,
      WINDOW.y1 - WINDOW.y0,
      0.24,
    );
  // the DJ stage
  const sw = STAGE.x1 - STAGE.x0;
  const sd = STAGE.z1 - STAGE.z0;
  b.add(BOX, COUNTER, {
    position: [0, STAGE.height / 2, (STAGE.z0 + STAGE.z1) / 2],
    scale: [sw, STAGE.height, sd],
  });
  // the soda bar: a steel front and a lit top
  const bw = BAR.back - BAR.front;
  const bl = BAR.z1 - BAR.z0;
  b.add(BOX, COUNTER, {
    position: [(BAR.front + BAR.back) / 2, 0.52, (BAR.z0 + BAR.z1) / 2],
    scale: [bw, 1.04, bl],
  });
  b.add(BOX, HULL, {
    position: [(BAR.front + BAR.back) / 2 - 0.05, 1.07, (BAR.z0 + BAR.z1) / 2],
    scale: [bw + 0.1, 0.05, bl + 0.1],
  });
  // neon: round the window, the stage's front, the bar's foot and the airlock
  const trim = (
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => b.add(BOX, mat, { position: [x, y, z], scale: [w, h, d] });
  trim(
    NEON.cyan,
    0,
    WINDOW.y1 - 0.04,
    WINDOW_Z + 0.22,
    WINDOW.half * 2,
    0.05,
    0.04,
  );
  trim(
    NEON.cyan,
    0,
    WINDOW.y0 + 0.04,
    WINDOW_Z + 0.22,
    WINDOW.half * 2,
    0.05,
    0.04,
  );
  trim(NEON.violet, 0, STAGE.height + 0.02, STAGE.z1 + 0.01, sw, 0.04, 0.04);
  trim(
    NEON.pink,
    BAR.front - 0.02,
    0.06,
    (BAR.z0 + BAR.z1) / 2,
    0.04,
    0.05,
    bl,
  );
  // the airlock's threshold
  trim(NEON.cyan, 0, 0.04, FRONT_Z - 0.02, 2.6, 0.05, 0.04);
  return b.build();
}

function Shell() {
  const shell = useMemo(buildShell, []);
  return <primitive object={shell} />;
}

/** The planet and the stars outside the window. They hold still under
 * reduced motion; otherwise the planet turns very slowly. */
function Outside() {
  const planet = useGLTF("/models/space-planet.glb");
  const stars = useGLTF("/models/space-stars.glb");
  const calm = useReducedMotion();
  const turn = useRef<THREE.Group>(null);
  const sphere = useMemo(() => {
    const out = stars.scene.clone(true);
    out.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.frustumCulled = false;
        const m = o.material;
        if (m instanceof THREE.MeshStandardMaterial) {
          const lit = m.clone();
          lit.side = THREE.DoubleSide;
          lit.fog = false;
          lit.depthWrite = false;
          o.material = lit;
        }
      }
    });
    return out;
  }, [stars]);
  const world = useMemo(() => {
    const out = planet.scene.clone(true);
    out.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.frustumCulled = false;
      const m = o.material;
      if (m instanceof THREE.MeshStandardMaterial) {
        // lit from within, so the far side of the window glows
        const lit = m.clone();
        lit.fog = false;
        lit.emissive = new THREE.Color("#ffffff");
        lit.emissiveMap = lit.map;
        lit.emissiveIntensity = 0.7;
        o.material = lit;
      }
    });
    return out;
  }, [planet]);
  useEffect(
    () => () => {
      for (const root of [sphere, world])
        root.traverse((o) => {
          if (o instanceof THREE.Mesh && o.material instanceof THREE.Material)
            o.material.dispose();
        });
    },
    [sphere, world],
  );
  useFrame((_, dt) => {
    if (turn.current && !calm) turn.current.rotation.y += dt * 0.02;
  });
  return (
    <>
      <group position={[0, 0, -20]} scale={90}>
        <primitive object={sphere} />
      </group>
      <group position={[2.5, 4.2, -42]} scale={1.5} rotation={[0.4, 0, -0.35]}>
        <group ref={turn}>
          <primitive object={world} />
        </group>
      </group>
    </>
  );
}

function Bar() {
  const stools = useMemo(
    () => STOOL_ZS.map((z) => [STOOL_X, 0, z, Math.PI / 2] as const),
    [],
  );
  const cz = (BAR.z0 + BAR.z1) / 2;
  return (
    <>
      <BarStools at={stools} color="#2b6bff" />
      <NeonText
        text="SODA BAR"
        color={CYAN}
        font={MARQUEE}
        width={2.6}
        k={3.4}
        position={[WALL_X - 0.02, 3.3, cz]}
        rotation-y={-Math.PI / 2}
      />
      <Suspense fallback={null}>
        <Prop
          model="scifi-shelves-widetall"
          width={0.5}
          depth={4.4}
          height={2.6}
          position={[BAR.back + 0.2, 0, cz]}
        />
        {[-0.5, 0.6, 1.7].map((dz) => (
          <Prop
            key={dz}
            model="scifi-mug"
            width={0.14}
            depth={0.14}
            height={0.14}
            position={[(BAR.front + BAR.back) / 2, 1.1, cz + dz]}
          />
        ))}
      </Suspense>
    </>
  );
}

function Lounge() {
  return (
    <Suspense fallback={null}>
      {LOUNGE_TABLES.map(([x, z], i) => (
        <Prop
          key={`t${i}`}
          model="scifi-desk-medium"
          width={0.9}
          depth={0.9}
          height={0.5}
          position={[x, 0, z]}
        />
      ))}
      {LOUNGE_CHAIRS.map(({ at, table }, i) => {
        const [tx, tz] = LOUNGE_TABLES[table];
        return (
          <Prop
            key={`c${i}`}
            model="scifi-chair"
            width={0.6}
            depth={0.6}
            height={0.95}
            position={[at[0], 0, at[1]]}
            yaw={Math.atan2(tx - at[0], tz - at[1])}
          />
        );
      })}
      <Prop
        model="scifi-crate"
        width={0.9}
        depth={0.9}
        height={0.9}
        position={[-7.1, 0, 6.2]}
      />
    </Suspense>
  );
}

function Lights() {
  const calm = useReducedMotion();
  const cyan = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (cyan.current)
      cyan.current.intensity =
        6 + (calm ? 0 : Math.sin(clock.elapsedTime * 3.1) * 1.5);
  });
  return (
    <>
      <hemisphereLight args={["#8a96d8", "#2a1a50", 1.5]} />
      <pointLight
        ref={cyan}
        position={[DANCE[0], 3.8, DANCE[1]]}
        color={CYAN}
        intensity={6}
        distance={11}
      />
      <pointLight
        position={[0, 2.4, -6.6]}
        color={VIOLET}
        intensity={4}
        distance={7}
      />
      <pointLight
        position={[BAR.front - 1, 2.6, 1.3]}
        color={PINK}
        intensity={2.5}
        distance={6}
      />
    </>
  );
}

const orderSoda = () => drink("cocktail");

/**
 * Orbit 9, the space-station club behind Gallery Row: a wall-wide window onto
 * a ringed planet and the stars, the DJ's stage in front of it, an LED dance
 * floor, a soda bar and a lounge. Bassline plays at the decks and Star Siege
 * on the cabinet.
 */
export function Orbit({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#05030c"]} />
      <Lights />
      <Beams beams={BEAMS} aim={DANCE} aimY={0} />
      <Floor
        width={WALL_X * 2}
        depth={FRONT_Z - WINDOW_Z}
        center={[0, (FRONT_Z + WINDOW_Z) / 2]}
        color="#3a4470"
        texture={{ id: "floor_tiles_06", scale: 0.8 }}
        mirror={0.3}
        low={{ metalness: 0.15, roughness: 0.5 }}
        onPick={onPick}
      />
      <LedFloor
        center={DANCE}
        cols={12}
        rows={9}
        colors={[VIOLET, CYAN, PINK, "#3a6bff"]}
      />
      <PortalPads room={ROOMS.orbit} color={CYAN} />
      <Shell />
      <Suspense fallback={null}>
        <Outside />
      </Suspense>
      <NeonText
        text="ORBIT 9"
        color={VIOLET}
        font={MARQUEE}
        width={4.6}
        k={3.6}
        position={[0, 5.6, WINDOW_Z + 0.25]}
      />
      <Bar />
      <Lounge />
      <Suspense fallback={null}>
        <Prop
          model="dj-booth"
          width={2.2}
          depth={0.9}
          height={1.1}
          position={[0, STAGE.height, -6.9]}
        />
        <Prop
          model="jukebox"
          width={0.9}
          depth={0.6}
          height={1.7}
          position={[JUKEBOX[0], 0, JUKEBOX[1]]}
        />
        <Prop
          model="scifi-arcade"
          width={0.9}
          depth={0.8}
          height={1.8}
          position={[CABINET[0], 0, CABINET[1]]}
        />
      </Suspense>
      {/* glitter drifting in the station's low gravity */}
      <Sparkles
        count={calm ? 0 : 70}
        scale={[15, 5, 14]}
        position={[0, 2.8, -0.5]}
        size={1.8}
        speed={calm ? 0 : 0.12}
        color="#cfd8ff"
        opacity={0.4}
      />
      <OrbitNpcs onDrink={orderSoda} />
    </>
  );
}
