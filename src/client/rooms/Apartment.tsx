import { ROOMS } from "../../game/rooms.ts";
import {
  FURNITURE_CATALOG,
  footprint,
  type Furniture,
} from "../../game/home/decor.ts";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Batch } from "./shared/batch.ts";
import { plant, poster, stringLights } from "./shared/details.ts";
import { GOLD } from "./shared/materials.ts";
import { usePaintingTexture } from "./gallery/painting.ts";
import { surface } from "../city/worldTexture.ts";
import { Prop } from "./shared/Prop.tsx";
import { HdriLight } from "./shared/HdriLight.tsx";
import type { HomeSave } from "../../game/home/home.ts";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";

// Grid origin: the floor runs x -4..4 and z -3..3, one cell per meter.
const ORIGIN = { x: -4, z: -3 };

const HEIGHT = {
  sofa: 0.5,
  bed: 0.6,
  table: 0.8,
  lamp: 1.6,
  rug: 0.04,
  plant: 1.0,
  bookshelf: 1.4,
  tv: 0.7,
} as const;

const COLOR = {
  sofa: "#c2185b",
  bed: "#ffd6e7",
  table: "#8d5a3b",
  lamp: "#ffe08a",
  rug: "#4a1f6b",
  plant: "#2e8b57",
  bookshelf: "#5b3a7a",
  tv: "#222233",
} as const;

// The rented flat: a rug-and-sofa living room with the practice shelf on
// the right wall. Furniture comes from the saved home layout.
export function Apartment({
  onPick,
  home,
  onShelf,
}: {
  onPick: PickHandler;
  home: HomeSave;
  onShelf: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#120a1c"]} />
      <HdriLight file="anniversary_lounge" intensity={0.45} />
      <hemisphereLight args={["#ffe3f4", "#6a4a78", 1.5]} />
      <pointLight
        position={[0, 2.8, 0]}
        color="#ffd08a"
        intensity={6}
        distance={11}
      />
      <Floor
        width={8}
        depth={6}
        center={[0, 0]}
        color="#d9b8a0"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        mirror={0.3}
        low={{ metalness: 0, roughness: 0.9 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.apartment} color="#ffd166" />
      <Walls />
      <HungPainting />
      {home.furniture.map((item, index) => (
        <Piece key={`${item.id}-${index}`} item={item} />
      ))}
      {/* a window on the back wall, glowing sunset */}
      <mesh position={[-1.5, 1.7, -2.93]}>
        <boxGeometry args={[2, 1.2, 0.05]} />
        <meshStandardMaterial color="#ffb37a" emissive="#ff8a4a" />
      </mesh>
      <mesh
        position={[3.4, 1.1, -2.2]}
        onClick={onShelf}
        aria-label="Practice shelf"
      >
        <boxGeometry args={[0.9, 2.2, 0.5]} />
        <meshStandardMaterial color="#6fd3ff" emissive="#1c5f7a" />
      </mesh>
    </>
  );
}

/** The player's own painting from Gallery 44, framed on the back wall
 * beside the poster once there is one. */
function HungPainting() {
  const tex = usePaintingTexture();
  if (!tex) return null;
  return (
    <group position={[2.4, 1.8, -2.93]}>
      <mesh material={GOLD}>
        <boxGeometry args={[0.8, 0.8, 0.04]} />
      </mesh>
      <mesh position-z={0.025}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshStandardMaterial key={tex.uuid} map={tex} roughness={0.8} />
      </mesh>
    </group>
  );
}

// the tallest each generated model may stand, meters
const MODEL_HEIGHT = {
  sofa: 0.95,
  bed: 1.2,
  table: 0.55,
  lamp: 1.7,
  rug: 0.15,
  plant: 1.4,
  bookshelf: 1.1,
  tv: 1.1,
} as const;

function Piece({ item }: { item: Furniture }) {
  const size = footprint(item.id, item.rotation);
  const x = ORIGIN.x + item.cell[0] + size.w / 2;
  const z = ORIGIN.z + item.cell[1] + size.d / 2;
  const height = HEIGHT[item.id];
  const { width, depth } = FURNITURE_CATALOG[item.id];
  // the box shows while the model loads
  const box = (
    <mesh position={[x, height / 2, z]}>
      <boxGeometry args={[size.w * 0.92, height, size.d * 0.92]} />
      <meshStandardMaterial color={COLOR[item.id]} />
    </mesh>
  );
  return (
    <Suspense fallback={box}>
      <Prop
        model={item.id}
        width={width * 0.92}
        depth={depth * 0.92}
        height={MODEL_HEIGHT[item.id]}
        yaw={(item.rotation * Math.PI) / 2}
        position={[x, 0, z]}
      />
    </Suspense>
  );
}

// lilac plaster over white baseboards, with crown molding
const WALL = surface("painted_plaster_wall", {
  scale: 0.6,
  color: "#a07ab8",
});
const TRIM = surface("white_plaster_02", {
  scale: 2,
  color: "#fff8f4",
  roughness: 0.5,
});
const CURTAIN = surface("velour_velvet", { scale: 2, color: "#ffb0d8" });

/** Trim, a framed window with curtains and a sill plant, pictures and
 * bulbs over the window: the walls only, so the floor stays yours. */
function buildDressing() {
  const b = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (const [x, z, w, ry] of [
    [-3.94, 0, 6, Math.PI / 2],
    [3.94, 0, 6, Math.PI / 2],
    [0, -2.94, 8, 0],
  ] as const) {
    b.add(box, TRIM, {
      position: [x, 0.07, z],
      rotation: [0, ry, 0],
      scale: [w, 0.14, 0.03],
    });
    b.add(box, TRIM, {
      position: [x, 2.93, z],
      rotation: [0, ry, 0],
      scale: [w, 0.1, 0.05],
    });
  }
  // the window's frame, sill and curtains
  b.add(box, TRIM, {
    position: [-1.5, 2.33, -2.92],
    scale: [2.16, 0.08, 0.08],
  });
  b.add(box, TRIM, { position: [-1.5, 1.08, -2.88], scale: [2.3, 0.06, 0.18] });
  for (const dx of [-1.04, 1.04])
    b.add(box, TRIM, {
      position: [-1.5 + dx, 1.7, -2.92],
      scale: [0.08, 1.3, 0.08],
    });
  for (const dx of [-1.3, 1.3])
    b.add(box, CURTAIN, {
      position: [-1.5 + dx, 1.55, -2.86],
      scale: [0.4, 2.3, 0.06],
    });
  plant(b, { x: -2.1, y: 1.11, z: -2.85 }, 0.6);
  stringLights(b, [-2.6, 2.6, -2.85], [-0.4, 2.6, -2.85], 9, "#ffd8a0", 0.18);
  poster(b, { x: 1.4, y: 1.8, z: -2.93 }, 1, 0.7, 0.9, GOLD);
  poster(b, { x: -3.93, y: 1.7, z: -0.6, ry: Math.PI / 2 }, 6, 0.6, 0.8, GOLD);
  poster(b, { x: -3.93, y: 1.9, z: 0.6, ry: Math.PI / 2 }, 3, 0.5, 0.5, GOLD);
  return b.build();
}

function Walls() {
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <primitive object={dressing} />
      <mesh position={[-4, 1.5, 0]} material={WALL}>
        <boxGeometry args={[0.1, 3, 6]} />
      </mesh>
      <mesh position={[4, 1.5, 0]} material={WALL}>
        <boxGeometry args={[0.1, 3, 6]} />
      </mesh>
      <mesh position={[0, 1.5, -3]} material={WALL}>
        <boxGeometry args={[8, 3, 0.1]} />
      </mesh>
    </>
  );
}
