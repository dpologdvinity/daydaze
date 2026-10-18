import { Suspense } from "react";
import { Prop } from "../shared/Prop.tsx";
import * as THREE from "three";
import { canvasTex, GOLD, LACQUER, neonMat } from "../shared/materials.ts";
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

const WALL = new THREE.MeshStandardMaterial({
  color: "#43175a",
  roughness: 0.6,
  metalness: 0.1,
});
const FELT = new THREE.MeshStandardMaterial({
  color: "#0f5a4e",
  roughness: 0.9,
});
const WOOD = new THREE.MeshStandardMaterial({
  color: "#4a2414",
  roughness: 0.5,
});

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
  return (
    <>
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
      <mesh position={[BAR_CENTER_X, 0.5, BAR_Z]} material={LACQUER}>
        <boxGeometry args={[BAR_LENGTH, 1, 0.7]} />
      </mesh>
      <mesh position={[BAR_CENTER_X, 1.02, BAR_Z]} material={GOLD}>
        <boxGeometry args={[BAR_LENGTH + 0.06, 0.04, 0.74]} />
      </mesh>
      {/* warm bottles on the back shelf, each lit from inside */}
      {[-5.2, -4.5, -3.8, -3.1, -2.4, -1.7, -1, -0.3, 0.4].map((x, i) => (
        <mesh
          key={x}
          position={[x, 1.72, BACK_Z + 0.32]}
          material={neonMat(
            ["#ff8a3d", "#ff6fb5", "#ffb070", "#c58cff"][i % 4],
            2,
          )}
        >
          <cylinderGeometry args={[0.07, 0.09, 0.4, 8]} />
        </mesh>
      ))}
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
