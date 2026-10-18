import { Suspense, useMemo } from "react";
import { Prop } from "../shared/Prop.tsx";
import * as THREE from "three";
import { surface } from "../../city/worldTexture.ts";
import { BarStools } from "../shared/BarStools.tsx";
import { Batch } from "../shared/batch.ts";
import { Bottles, type ShelfRow } from "../shared/Bottles.tsx";
import { plant, poster, rug, shelf, stringLights } from "../shared/details.ts";
import { canvasTex, GOLD, neonMat } from "../shared/materials.ts";
import { MARQUEE, NeonText, SCRIPT } from "../shared/Neon.tsx";
import {
  BACK_Z,
  BAR_CENTER_X,
  BAR_LENGTH,
  BAR_Z,
  CORNER_TABLE,
  HEIGHT,
  POOL_TABLE,
  WALL_X,
} from "./layout.ts";

// a damask wallcovering tinted violet, over a walnut wainscot
const WALL = surface("quatrefoil_jacquard_fabric", {
  scale: 1.2,
  color: "#c890f0",
  roughness: 0.9,
});
const FELT = surface("leather_white", {
  scale: 2,
  color: "#1f8a6e",
  roughness: 1,
});
const WOOD = surface("wood_veneer", {
  scale: 1.2,
  color: "#8a4a2a",
  roughness: 0.5,
});
const BAR_TOP = surface("marble_01", {
  scale: 0.8,
  color: "#4a3a48",
  roughness: 0.3,
});
const SHELF_GLASS = new THREE.MeshStandardMaterial({
  color: "#ffe0c8",
  metalness: 0.4,
  roughness: 0.05,
});
const SHELVES = [1.6, 2.2];
const ROWS: readonly ShelfRow[] = SHELVES.map((y) => ({
  x0: -5.2,
  x1: 0.6,
  y: y + 0.03,
  z: BACK_Z + 0.3,
  count: 14,
}));
const STOOLS = [-4.6, -3.5, -2.4, -1.3, -0.2].map(
  (x) => [x, 0, BAR_Z + 0.65, Math.PI] as const,
);

/** Wainscot, rails, more posters, plants, a rug and bulbs over the bar. */
function buildDressing() {
  const b = new Batch();
  for (const [x, z, w, ry] of [
    [0, BACK_Z + 0.11, WALL_X * 2, 0],
    [-WALL_X + 0.11, 0, WALL_X * 2, Math.PI / 2],
    [WALL_X - 0.11, 0, WALL_X * 2, -Math.PI / 2],
  ] as const) {
    b.add(new THREE.BoxGeometry(w, 1.1, 0.04), WOOD, {
      position: [x, 0.55, z],
      rotation: [0, ry, 0],
    });
    b.add(new THREE.BoxGeometry(w, 0.05, 0.07), GOLD, {
      position: [x, 1.12, z],
      rotation: [0, ry, 0],
    });
    b.add(new THREE.BoxGeometry(w, 0.12, 0.06), WOOD, {
      position: [x, HEIGHT - 0.2, z],
      rotation: [0, ry, 0],
    });
  }
  for (const y of SHELVES)
    shelf(b, { x: -2.3, y, z: BACK_Z + 0.3 }, 6, SHELF_GLASS, 0.32);
  // a gallery wall of gig bills and art by the pool table and the sofa
  [
    [-1.2, 1.9, 0.5],
    [-2.0, 2.15, 0.4],
    [-2.8, 1.85, 0.55],
  ].forEach(([z, y, s], i) =>
    poster(
      b,
      { x: -WALL_X + 0.14, y, z, ry: Math.PI / 2 },
      i + 4,
      s,
      s * 1.3,
      GOLD,
    ),
  );
  [
    [0.4, 1.9, 0.55],
    [1.3, 2.2, 0.45],
    [2.1, 1.8, 0.5],
  ].forEach(([z, y, s], i) =>
    poster(
      b,
      { x: WALL_X - 0.14, y, z, ry: -Math.PI / 2 },
      i,
      s,
      s * 1.3,
      GOLD,
    ),
  );
  plant(b, { x: 0.9, z: BACK_Z + 0.5 }, 1.2);
  plant(b, { x: -5.4, z: 1.7 }, 1);
  plant(b, { x: 5.4, z: 1.2 }, 1.1);
  rug(b, { x: CORNER_TABLE.x + 0.4, z: CORNER_TABLE.z }, 2.2, 3, "#e0a0c8");
  rug(b, { x: POOL_TABLE.x, z: POOL_TABLE.z }, 3.6, 2.6, "#c8a0e8");
  // warm bulbs swagged along the back wall and across to the pool table
  stringLights(
    b,
    [-5.8, 3.6, BACK_Z + 0.3],
    [5.8, 3.6, BACK_Z + 0.3],
    22,
    "#ffcf8a",
    0.3,
  );
  stringLights(b, [-5.8, 3.7, -1], [5.8, 3.7, 3], 18, "#ffb0d8", 0.5);
  return b.build();
}

/** The pride and lesbian sunset flags, as flat cloth on the back wall. */
const PRIDE_STRIPES = [
  "#e40303",
  "#ff8c00",
  "#ffed00",
  "#008026",
  "#24408e",
  "#732982",
];
const SUNSET_STRIPES = [
  "#d52d00",
  "#ef7627",
  "#ff9a56",
  "#ffffff",
  "#d162a4",
  "#b55690",
  "#a30262",
];

function stripeTexture(stripes: readonly string[]) {
  return canvasTex(64, 96, (ctx) => {
    const h = 96 / stripes.length;
    stripes.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * h, 64, h + 1);
    });
  });
}

/** A poster on a dark frame, with a line of handwritten-style type. */
function posterTexture(title: string, tag: string, accent: string) {
  return canvasTex(192, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#3a0f4a");
    g.addColorStop(1, "#140420");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 192, 256);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 172, 236);
    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.font = "700 30px Georgia, serif";
    ctx.fillText(title, 96, 118);
    ctx.font = "italic 16px Georgia, serif";
    ctx.fillText(tag, 96, 150);
  });
}

/** The walls, their pink and violet trim, and the neon signs and puns. */
export function Walls() {
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <primitive object={dressing} />
      <mesh position={[0, HEIGHT / 2, BACK_Z]} material={WALL}>
        <boxGeometry args={[WALL_X * 2, HEIGHT, 0.2]} />
      </mesh>
      <mesh position={[-WALL_X, HEIGHT / 2, 0]} material={WALL}>
        <boxGeometry args={[0.2, HEIGHT, WALL_X * 2]} />
      </mesh>
      <mesh position={[WALL_X, HEIGHT / 2, 0]} material={WALL}>
        <boxGeometry args={[0.2, HEIGHT, WALL_X * 2]} />
      </mesh>
      <mesh
        position={[0, HEIGHT - 0.08, BACK_Z + 0.12]}
        material={neonMat("#ff8fd6", 3)}
      >
        <boxGeometry args={[WALL_X * 2, 0.05, 0.04]} />
      </mesh>
      <NeonText
        text="The Violet Hour"
        color="#c58cff"
        font={SCRIPT}
        width={3.6}
        k={3.6}
        position={[0, 3.1, BACK_Z + 0.25]}
      />
      <NeonText
        text="sip sappho sip"
        color="#ffb070"
        font={SCRIPT}
        width={2.4}
        k={3}
        position={[-3.6, 2.35, BACK_Z + 0.25]}
      />
      <NeonText
        text="sappy hour"
        color="#ff8a5c"
        font={MARQUEE}
        width={2.8}
        k={3}
        position={[-WALL_X + 0.25, 2.9, 1]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <NeonText
        text="hold her hand"
        color="#ff6fb5"
        font={SCRIPT}
        width={2.6}
        k={3}
        position={[WALL_X - 0.25, 2.7, -2.4]}
        rotation={[0, -Math.PI / 2, 0]}
      />
    </>
  );
}

const PRIDE_TEX = stripeTexture(PRIDE_STRIPES);
const SUNSET_TEX = stripeTexture(SUNSET_STRIPES);
const LEFT_POSTER = posterTexture(
  "SAPPHO SUNDAYS",
  "brunch, then dancing",
  "#ffb070",
);
const RIGHT_POSTER = posterTexture(
  "PURR NIGHT",
  "every tuesday, all welcome",
  "#c58cff",
);

/** The pride and lesbian sunset flags, pinned high on the back wall. */
export function Flags() {
  return (
    <>
      <mesh position={[2.1, 2.3, BACK_Z + 0.14]}>
        <planeGeometry args={[0.9, 1.35]} />
        <meshBasicMaterial map={PRIDE_TEX} toneMapped={false} />
      </mesh>
      <mesh position={[3.4, 2.3, BACK_Z + 0.14]}>
        <planeGeometry args={[0.9, 1.35]} />
        <meshBasicMaterial map={SUNSET_TEX} toneMapped={false} />
      </mesh>
    </>
  );
}

/** Two framed posters, one on each side wall. */
export function Posters() {
  return (
    <>
      <mesh position={[-WALL_X + 0.12, 2, 0.6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.9, 1.2]} />
        <meshBasicMaterial map={LEFT_POSTER} toneMapped={false} />
      </mesh>
      <mesh position={[WALL_X - 0.12, 2, -2.2]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[0.9, 1.2]} />
        <meshBasicMaterial map={RIGHT_POSTER} toneMapped={false} />
      </mesh>
    </>
  );
}

/** The bar counter along the back wall, with warm shelves behind it. */
export function Bar() {
  return (
    <>
      <mesh position={[BAR_CENTER_X, 0.5, BAR_Z]} material={WOOD}>
        <boxGeometry args={[BAR_LENGTH, 1, 0.7]} />
      </mesh>
      <mesh position={[BAR_CENTER_X, 1.025, BAR_Z]} material={BAR_TOP}>
        <boxGeometry args={[BAR_LENGTH + 0.06, 0.05, 0.74]} />
      </mesh>
      <mesh position={[BAR_CENTER_X, 0.12, BAR_Z + 0.4]} material={GOLD}>
        <boxGeometry args={[BAR_LENGTH, 0.03, 0.03]} />
      </mesh>
      <Bottles rows={ROWS} seed={7} />
      <BarStools at={STOOLS} color="#8a3ac0" />
      {[1.6, 2.2].map((y, i) => (
        <mesh
          key={y}
          position={[BAR_CENTER_X, y, BACK_Z + 0.14]}
          material={neonMat(i === 0 ? "#ff8a3d" : "#c58cff", 2)}
        >
          <boxGeometry args={[BAR_LENGTH, 0.05, 0.04]} />
        </mesh>
      ))}
    </>
  );
}

/** A pool table on the right, with a warm pendant lamp over the felt. */
export function PoolTable() {
  return (
    <group position={[POOL_TABLE.x, 0, POOL_TABLE.z]}>
      <mesh position-y={0.4} material={WOOD}>
        <boxGeometry args={[2.7, 0.8, 1.6]} />
      </mesh>
      <mesh position-y={0.84} material={FELT}>
        <boxGeometry args={[2.3, 0.06, 1.2]} />
      </mesh>
      <mesh position={[0, 0.9, 0.66]} material={WOOD}>
        <boxGeometry args={[2.7, 0.14, 0.12]} />
      </mesh>
      <mesh position={[0, 0.9, -0.66]} material={WOOD}>
        <boxGeometry args={[2.7, 0.14, 0.12]} />
      </mesh>
      <mesh position={[1.29, 0.9, 0]} material={WOOD}>
        <boxGeometry args={[0.12, 0.14, 1.2]} />
      </mesh>
      <mesh position={[-1.29, 0.9, 0]} material={WOOD}>
        <boxGeometry args={[0.12, 0.14, 1.2]} />
      </mesh>
      <mesh position={[0, 2.5, 0]} material={neonMat("#ffb070", 2.5)}>
        <cylinderGeometry args={[0.28, 0.12, 0.2, 20]} />
      </mesh>
    </group>
  );
}

/** The regulars' corner: a velvet sofa along the left wall and a round table. */
export function RegularsCorner() {
  return (
    <>
      <Suspense fallback={null}>
        {/* the regulars' sofa on the left wall, and a jukebox by the bar */}
        <Prop
          model="banquette"
          width={3}
          depth={0.9}
          height={1.2}
          yaw={Math.PI / 2}
          position={[-WALL_X + 0.5, 0, 3.6]}
        />
        <Prop
          model="jukebox"
          width={0.9}
          depth={0.6}
          height={1.6}
          position={[2.4, 0, BACK_Z + 0.45]}
        />
      </Suspense>
      <mesh position={[CORNER_TABLE.x, 0.36, CORNER_TABLE.z]} material={WOOD}>
        <cylinderGeometry args={[0.45, 0.45, 0.72, 24]} />
      </mesh>
      <mesh
        position={[CORNER_TABLE.x, 0.74, CORNER_TABLE.z]}
        material={neonMat("#ff6fb5", 2)}
      >
        <cylinderGeometry args={[0.46, 0.46, 0.03, 24]} />
      </mesh>
    </>
  );
}
