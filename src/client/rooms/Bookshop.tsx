// Dog-Ear Books on Park Avenue: the wallpapered shell, instanced shelves of
// book spines, the fireplace, Ines the clerk, a reader and Marmalade the cat.
// Shelf rows and stack runs are fixed constants here.

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import * as THREE from "three";
import { playPurr } from "../../audio/worldSounds.ts";
import {
  ARMCHAIRS,
  BOUNDS,
  CAT,
  CLERK,
  COUNTER,
  FIRE,
  STACK_HALF,
  STACKS,
  WALL_SHELF,
} from "../../game/bookshop.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { plant, poster, rug } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { GOLD, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.4;
/** Shelf boards from the floor up, the top one under the ceiling. */
const ROWS = [0.12, 0.62, 1.12, 1.62, 2.12, 2.62, 3.12, 3.62];
const SHELF_TOP = 4;

const WALL = surface("wallpaper", { scale: 0.7, color: "#3a5a4a" });
const WOOD = surface("dark_wooden_planks", {
  scale: 1,
  color: "#6a4028",
  roughness: 0.6,
});
const BRICK = surface("brick_wall_13", { scale: 0.6, color: "#c87a5a" });
const LEATHER = surface("brown_leather", {
  scale: 1,
  color: "#7a3a1a",
  roughness: 0.5,
});
const FLAME = new THREE.MeshBasicMaterial({
  color: hdr("#ff8a2e", 3),
  toneMapped: false,
});
const SHADE = new THREE.MeshBasicMaterial({
  color: hdr("#3fbf6a", 1.4),
  toneMapped: false,
});
const SOOT = new THREE.MeshBasicMaterial({ color: "#120a08" });
const GLOBE = new THREE.MeshBasicMaterial({
  color: hdr("#ffe0b0", 1.8),
  toneMapped: false,
});
const FUR = new THREE.MeshStandardMaterial({
  color: "#e8903a",
  roughness: 0.95,
});
const FUR_LIGHT = new THREE.MeshStandardMaterial({
  color: "#f8e0c0",
  roughness: 0.95,
});

const CLERK_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "low-pony",
  hairColor: "#4a2a1c",
  lips: "lips-burgundy-cherry",
  brows: "brows-feathered-honey",
  outfit: "blouse",
  outfitColor: "#3a5a8a",
  shadow: "#8a5a3c",
};
const READER: Look = {
  ...CLERK_LOOK,
  skin: "#f3d4c4",
  hairStyle: "shag",
  hairColor: "#1b1014",
  outfit: "corset-maxi",
  outfitColor: "#6a1a2a",
  shadow: "#d23cff",
};

/** Every shelf run in the shop: where it starts and ends along the wall and
 * which way its books face. Built once; the books fill these. */
type Run = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  face: number;
  /** The run's height: wall shelves reach the ceiling, stacks don't. */
  top: number;
};
const STACK_TOP = 2.2;
const RUNS: readonly Run[] = [
  // the back wall
  {
    a: new THREE.Vector3(x0 + 0.5, 0, z0 + WALL_SHELF / 2),
    b: new THREE.Vector3(x1 - 0.5, 0, z0 + WALL_SHELF / 2),
    face: 0,
    top: SHELF_TOP,
  },
  // the west wall behind the fire, and the east wall
  {
    a: new THREE.Vector3(x0 + WALL_SHELF / 2, 0, z0 + 0.6),
    b: new THREE.Vector3(x0 + WALL_SHELF / 2, 0, FIRE.z0 - 0.5),
    face: Math.PI / 2,
    top: SHELF_TOP,
  },
  {
    a: new THREE.Vector3(x1 - WALL_SHELF / 2, 0, z0 + 0.6),
    b: new THREE.Vector3(x1 - WALL_SHELF / 2, 0, -0.1),
    face: -Math.PI / 2,
    top: SHELF_TOP,
  },
  // both faces of each stack
  ...STACKS.flatMap(({ x, z0: a, z1: b }) => [
    {
      a: new THREE.Vector3(x - STACK_HALF / 2, 0, a + 0.1),
      b: new THREE.Vector3(x - STACK_HALF / 2, 0, b - 0.1),
      face: -Math.PI / 2,
      top: STACK_TOP,
    },
    {
      a: new THREE.Vector3(x + STACK_HALF / 2, 0, a + 0.1),
      b: new THREE.Vector3(x + STACK_HALF / 2, 0, b - 0.1),
      face: Math.PI / 2,
      top: STACK_TOP,
    },
  ]),
];

function useRoom() {
  return useMemo(() => {
    const b = new Batch();
    // green wallpaper above the shelves, wood shelving and boards
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    for (const run of RUNS) {
      const len = run.a.distanceTo(run.b) + 0.3;
      const mid = run.a.clone().add(run.b).multiplyScalar(0.5);
      const along = Math.abs(run.b.x - run.a.x) > 0.01;
      const top = run.top;
      for (const y of ROWS.filter((y) => y < top))
        b.add(
          new THREE.BoxGeometry(along ? len : 0.36, 0.03, along ? 0.36 : len),
          WOOD,
          { position: [mid.x, y, mid.z] },
        );
      for (const end of [-1, 1])
        b.add(
          new THREE.BoxGeometry(along ? 0.05 : 0.4, top, along ? 0.4 : 0.05),
          WOOD,
          {
            position: [
              mid.x + (along ? (end * len) / 2 : 0),
              top / 2,
              mid.z + (along ? 0 : (end * len) / 2),
            ],
          },
        );
    }
    // a backboard down the middle of each stack, and a sign on top
    for (const { x, z0: a, z1: c } of STACKS)
      b.add(new THREE.BoxGeometry(0.04, STACK_TOP, c - a), WOOD, {
        position: [x, STACK_TOP / 2, (a + c) / 2],
      });
    // the rolling ladder on the back wall: brass rail, two rails, rungs
    b.add(new THREE.CylinderGeometry(0.02, 0.02, W - 1, 8), GOLD, {
      position: [0, 3.9, z0 + WALL_SHELF + 0.05],
      rotation: [0, 0, Math.PI / 2],
    });
    for (const dx of [-0.25, 0.25])
      b.add(new THREE.BoxGeometry(0.05, 4, 0.05), WOOD, {
        position: [-3.2 + dx, 2, z0 + WALL_SHELF + 0.5],
        rotation: [-0.12, 0, 0],
      });
    for (let y = 0.4; y < 3.8; y += 0.4)
      b.add(new THREE.BoxGeometry(0.5, 0.04, 0.04), WOOD, {
        position: [-3.2, y, z0 + WALL_SHELF + 0.5 + (3.9 - y) * 0.12 - 0.47],
      });
    // the fireplace: brick breast, a mantel, a fire in the grate
    const fz = (FIRE.z0 + FIRE.z1) / 2;
    const fd = FIRE.z1 - FIRE.z0;
    b.add(new THREE.BoxGeometry(0.8, 1.3, fd), BRICK, {
      position: [x0 + 0.4, 0.65, fz],
    });
    b.add(new THREE.BoxGeometry(0.6, 2.9, fd - 0.6), BRICK, {
      position: [x0 + 0.3, 2.85, fz],
    });
    b.add(new THREE.BoxGeometry(1, 0.1, fd + 0.3), WOOD, {
      position: [x0 + 0.5, 1.35, fz],
    });
    b.add(new THREE.BoxGeometry(0.1, 0.7, 1.1), SOOT, {
      position: [x0 + 0.82, 0.45, fz],
    });
    for (let i = 0; i < 4; i++)
      b.add(new THREE.ConeGeometry(0.1, 0.36 + (i % 2) * 0.14, 6), FLAME, {
        position: [x0 + 0.62, 0.3, fz - 0.3 + i * 0.2],
      });
    poster(b, { x: x0 + 0.62, y: 2.5, z: fz, ry: Math.PI / 2 }, 3, 0.9, 0.7);
    // two wingback armchairs either side of the hearth, a rug, a side table
    for (const {
      at: [x, z],
      dir,
    } of ARMCHAIRS) {
      b.add(new THREE.BoxGeometry(0.8, 0.42, 0.75), LEATHER, {
        position: [x, 0.21, z - dir * 0.18],
      });
      b.add(new THREE.BoxGeometry(0.85, 1.1, 0.18), LEATHER, {
        position: [x, 0.75, z - dir * 0.5],
      });
      for (const dx of [-0.4, 0.4])
        b.add(new THREE.BoxGeometry(0.12, 0.28, 0.7), LEATHER, {
          position: [x + dx, 0.55, z - dir * 0.15],
        });
    }
    rug(b, { x: -5.8, z: fz }, 2.4, 3.2, "#8a2a2a");
    b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16), WOOD, {
      position: [-4.9, 0.6, fz],
    });
    b.add(new THREE.CylinderGeometry(0.04, 0.06, 0.58, 8), WOOD, {
      position: [-4.9, 0.3, fz],
    });
    // the counter, with a banker's lamp and a till
    const cw = COUNTER.x1 - COUNTER.x0;
    const cd = COUNTER.z1 - COUNTER.z0;
    const cx = (COUNTER.x0 + COUNTER.x1) / 2;
    const cz = (COUNTER.z0 + COUNTER.z1) / 2;
    b.add(new THREE.BoxGeometry(cw, 1, cd), WOOD, {
      position: [cx, 0.5, cz],
    });
    b.add(new THREE.BoxGeometry(cw + 0.1, 0.05, cd + 0.1), LEATHER, {
      position: [cx, 1.02, cz],
    });
    b.add(new THREE.CylinderGeometry(0.08, 0.1, 0.04, 12), GOLD, {
      position: [cx, 1.07, COUNTER.z0 + 0.4],
    });
    b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), GOLD, {
      position: [cx, 1.22, COUNTER.z0 + 0.4],
    });
    b.add(
      new THREE.CylinderGeometry(0.06, 0.14, 0.12, 12, 1, true, 0, Math.PI),
      SHADE,
      {
        position: [cx, 1.4, COUNTER.z0 + 0.4],
        rotation: [0, 0, Math.PI / 2],
      },
    );
    b.add(new THREE.BoxGeometry(0.4, 0.25, 0.35), GOLD, {
      position: [cx, 1.17, COUNTER.z0 + 1.2],
    });
    // globe pendants over the side aisles
    for (const x of [-4.4, 4.6])
      for (const z of [-3, 0])
        b.add(new THREE.SphereGeometry(0.2, 14, 10), GLOBE, {
          position: [x, H - 0.9, z],
        });
    for (const [x, z] of [
      [x1 - 0.6, z1 - 0.8],
      [x0 + 0.6, z1 - 0.8],
      [x1 - 0.6, 0.6],
    ] as const)
      plant(b, { x, z }, 1.5);
    return b.build();
  }, []);
}

/** The books on every shelf: one instanced mesh, every spine its own size
 * and color. */
function Books() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const slots = useMemo(() => {
    const out: { x: number; y: number; z: number; ry: number; h: number }[] =
      [];
    let k = 0;
    for (const run of RUNS) {
      const len = run.a.distanceTo(run.b);
      const rows = ROWS.filter((y) => y < run.top - 0.4);
      for (const y of rows) {
        let t = 0.05;
        while (t < len - 0.05) {
          k++;
          const w = 0.035 + ((k * 37) % 5) * 0.012;
          // a gap now and then, where someone took a book
          if (k % 23 === 0) {
            t += 0.12;
            continue;
          }
          const p = run.a.clone().lerp(run.b, (t + w / 2) / len);
          out.push({
            x: p.x,
            y: y + 0.015,
            z: p.z,
            ry: run.face,
            h: 0.26 + ((k * 13) % 7) * 0.025,
          });
          t += w + 0.004;
        }
      }
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const colors = [
      "#7a1a1a",
      "#1a3a2a",
      "#2a2a5a",
      "#c8a050",
      "#3a1a3a",
      "#e8dcc0",
      "#1a1a1a",
      "#a84a2a",
      "#2a5a6a",
    ];
    slots.forEach((s, i) => {
      o.position.set(s.x, s.y + s.h / 2, s.z);
      o.rotation.set(0, s.ry, 0);
      o.scale.set(1, s.h, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(colors[(i * 7) % colors.length] ?? "#7a1a1a"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [slots]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, slots.length]}>
      <boxGeometry args={[0.04, 1, 0.22]} />
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
}

/** Marmalade, curled up asleep on the counter. Tap her for a purr. */
function Cat() {
  const calm = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const [purring, setPurring] = useState(false);
  useEffect(() => {
    if (!purring) return;
    const id = window.setTimeout(() => setPurring(false), 2600);
    return () => window.clearTimeout(id);
  }, [purring]);
  useFrame(({ clock }) => {
    // her breathing, a slow swell
    if (body.current && !calm)
      body.current.scale.y = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.04;
  });
  const pet = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    playPurr(2.5);
    setPurring(true);
  };
  const tail = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.16, 0.05, 0),
          new THREE.Vector3(-0.12, 0.04, 0.14),
          new THREE.Vector3(0.04, 0.04, 0.18),
          new THREE.Vector3(0.16, 0.05, 0.1),
        ]),
        12,
        0.025,
        6,
      ),
    [],
  );
  return (
    <group position={[CAT[0], 1.045, CAT[1]]} rotation-y={0.4} onClick={pet}>
      <group ref={body}>
        <mesh material={FUR} scale={[0.2, 0.09, 0.14]} position-y={0.08}>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
      </group>
      <mesh material={FUR} position={[0.15, 0.1, -0.06]} scale={0.08}>
        <sphereGeometry args={[1, 12, 10]} />
      </mesh>
      <mesh material={FUR_LIGHT} position={[0.21, 0.08, -0.06]} scale={0.04}>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      {[-0.04, 0.04].map((dz) => (
        <mesh
          key={dz}
          material={FUR}
          position={[0.15, 0.18, -0.06 + dz]}
          scale={[0.03, 0.05, 0.03]}
        >
          <coneGeometry args={[1, 1, 4]} />
        </mesh>
      ))}
      <mesh material={FUR} geometry={tail} />
      {purring && (
        <Html position={[0, 0.5, 0]} center zIndexRange={[20, 10]}>
          <p className="bubble npc-bubble">Prrrrrr…</p>
        </Html>
      )}
    </group>
  );
}

/**
 * Dog-Ear Books on Park Avenue: green wallpaper over floor-to-ceiling
 * shelves of spines with a brass rolling ladder, two freestanding stacks,
 * leather wingbacks by a crackling fireplace, a banker's lamp on the
 * counter, Ines at the till and Marmalade asleep beside her.
 */
export function Bookshop({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const room = useRoom();
  const fire = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (calm || !fire.current) return;
    const t = clock.elapsedTime;
    fire.current.intensity = 6 + Math.sin(t * 8) * 0.8 + Math.sin(t * 19) * 0.4;
  });
  return (
    <>
      <color attach="background" args={["#140c08"]} />
      <hemisphereLight args={["#ffe8c8", "#3a2418", 1.6]} />
      <pointLight
        ref={fire}
        position={[x0 + 1.4, 0.8, (FIRE.z0 + FIRE.z1) / 2]}
        color="#ff8a3d"
        intensity={6}
        distance={8}
      />
      <pointLight
        position={[0.3, 3.2, -1]}
        color="#ffe0b0"
        intensity={8}
        distance={14}
      />
      <Floor
        width={W}
        depth={D}
        color="#a07858"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.bookshop} color="#ffe0b0" />
      <primitive object={room} />
      <Books />
      <Cat />
      <NeonText
        text="dog-ear books"
        color="#ffe0b0"
        font={SCRIPT}
        width={2.8}
        k={2}
        position={[2.4, 4.15, z0 + 0.05]}
      />
      <TalkingNpc
        name="Ines"
        role="cashier"
        look={CLERK_LOOK}
        mood="idle"
        at={[CLERK[0], 0, CLERK[1]]}
        rot={-Math.PI / 2}
        seed={541}
        greet
        context={{ venue: "bookshop", neighborhood: "uptown" }}
      />
      <group position={[0.3, 0, -2.4]} rotation-y={Math.PI / 2}>
        <CrowdFigure look={READER} seed={542} />
      </group>
    </>
  );
}
