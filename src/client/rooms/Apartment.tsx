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
import { GOLD, canvasTex } from "./shared/materials.ts";
import { usePaintingTexture } from "./gallery/painting.ts";
import { surface } from "../city/worldTexture.ts";
import { Prop } from "./shared/Prop.tsx";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { HdriLight } from "./shared/HdriLight.tsx";
import type { HomeSave } from "../../game/home/home.ts";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";

// Grid origin: the floor runs x -4..4 and z -3..3, one cell per meter.
const ORIGIN = { x: -4, z: -3 };

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

let tvPicture: THREE.Texture | null = null;
/** What the TVs show: a retro game's sunset level, drawn once. */
function tvShow(): THREE.Texture {
  tvPicture ??= canvasTex(256, 192, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 192);
    sky.addColorStop(0, "#2a0f5c");
    sky.addColorStop(0.55, "#ff5fa8");
    sky.addColorStop(1, "#ffd27a");
    g.fillStyle = sky;
    g.fillRect(0, 0, 256, 192);
    g.fillStyle = "#fff2b0";
    g.beginPath();
    g.arc(180, 96, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1b0a33";
    for (let x = 0; x < 256; x += 32)
      g.fillRect(x, 140 + ((x / 32) % 3) * 8, 32, 60);
    g.fillStyle = "#3fe0d0";
    g.fillRect(40, 118, 14, 22); // the player
    g.fillStyle = "#ffffff";
    g.font = "bold 16px monospace";
    g.fillText("SCORE 004200", 10, 22);
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 0; y < 192; y += 4) g.fillRect(0, y, 256, 2); // scanlines
  });
  return tvPicture;
}

/** The neon sign's tubes, by look. */
const NEON = ["#ff2f9a", "#3fe0d0", "#ffb02e", "#9b5cff"] as const;
/** String-light bulb colors, by look. */
const BULB = ["#ffd8a0", "#ff9ad0", "#9ff0e6"] as const;

/** A piece hung on the back wall; `cell[0]` is its left column. */
function WallPiece({ item }: { item: Furniture }) {
  const { width, height } = FURNITURE_CATALOG[item.id];
  const variant = item.variant ?? 0;
  const x = ORIGIN.x + item.cell[0] + width / 2;
  const left = ORIGIN.x + item.cell[0] + 0.2;
  const right = ORIGIN.x + item.cell[0] + width - 0.2;
  const drawn = useMemo(() => {
    if (item.id !== "wall-art" && item.id !== "wall-art-wide") {
      if (item.id !== "wall-lights") return null;
      const b = new Batch();
      stringLights(
        b,
        [left, height, -2.85],
        [right, height, -2.85],
        3 * width + 3,
        BULB[variant] ?? BULB[0],
        0.25,
      );
      return b.build();
    }
    const b = new Batch();
    const w = item.id === "wall-art" ? 0.6 : 1.5;
    poster(b, { x, y: height, z: -2.93 }, variant, w, w * 0.7 + 0.1, GOLD);
    return b.build();
  }, [item.id, variant, x, left, right, height, width]);
  if (item.id === "wall-neon") {
    return (
      <NeonText
        text="DAYDAZE"
        color={NEON[variant] ?? NEON[0]}
        font={MARQUEE}
        width={1.8}
        position={[x, height, -2.9]}
      />
    );
  }
  if (drawn) return <primitive object={drawn} />;
  return (
    <Suspense fallback={null}>
      <Prop
        model={item.id}
        dir="home"
        width={width * 0.9}
        depth={0.5}
        height={item.id === "wall-mirror" ? 1.3 : 0.5}
        position={[x, item.id === "wall-mirror" ? height - 0.65 : height, -2.9]}
      />
    </Suspense>
  );
}

function Piece({ item }: { item: Furniture }) {
  if (FURNITURE_CATALOG[item.id].wall) return <WallPiece item={item} />;
  const size = footprint(item.id, item.rotation);
  const x = ORIGIN.x + item.cell[0] + size.w / 2;
  const z = ORIGIN.z + item.cell[1] + size.d / 2;
  const { width, depth, height } = FURNITURE_CATALOG[item.id];
  // the box shows while the model loads
  const box = (
    <mesh position={[x, height / 2, z]}>
      <boxGeometry args={[size.w * 0.92, height, size.d * 0.92]} />
      <meshStandardMaterial color="#8d5a3b" />
    </mesh>
  );
  return (
    <Suspense fallback={box}>
      <Prop
        model={item.id}
        width={width * 0.92}
        depth={depth * 0.92}
        height={height}
        dir="home"
        tint={item.variant ?? 0}
        screen={
          item.id === "tv" || item.id === "tv-flat" ? tvShow() : undefined
        }
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
