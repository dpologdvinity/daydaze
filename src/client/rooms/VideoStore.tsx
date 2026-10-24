// Rewind Video on Maple Drive in Suburbia: a batched shell with a poster wall,
// instanced tapes on the shelves, a CRT scrolling color bars and Tasha at the
// counter, plus the store's minigame hotspot pads. Layout comes from
// src/game/videoStore.ts.

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { MinigameId } from "../../game/hotspots.ts";
import { hotspotsIn } from "../../game/hotspots.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { BOUNDS, CLERK, COUNTER, SHELVES } from "../../game/videoStore.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { GamePad } from "./shared/GamePad.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 3.6;
const TAPES_PER_ROW = 18;
const ROWS_Y = [0.45, 0.95, 1.45];

const WALL = surface("white_plaster_02", { scale: 0.5, color: "#3a6bc8" });
const SHELF = surface("plastic", {
  scale: 1,
  color: "#e8e8f0",
  roughness: 0.5,
});
const COUNTER_TOP = surface("laminate_floor_02", {
  scale: 1,
  color: "#e8d8c0",
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#fff8e0",
  transparent: true,
  opacity: 0.3,
  roughness: 0.05,
});
const POPCORN = new THREE.MeshStandardMaterial({
  color: "#ffe8a0",
  roughness: 0.9,
});
const RED = new THREE.MeshStandardMaterial({
  color: "#c8102e",
  roughness: 0.4,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: "#141018",
  roughness: 0.3,
});

const CLERK_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "braids",
  hairColor: "#1b1014",
  lips: "lips-90s-caramel-ombre",
  brows: "brows-sculpted-espresso",
  outfit: "tracksuit-y2k",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};
const BROWSER: Look = {
  ...CLERK_LOOK,
  skin: "#f3d4c4",
  hairStyle: "pixie",
  hairColor: "#ff4fb3",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#ff2f9a",
};

/** Made-up movie posters for the new-releases wall, 3 by 2. */
function postersTex() {
  const films = [
    "LASER HEART",
    "GHOST MALL",
    "SUMMER 99",
    "ROLLER QUEEN",
    "STAR PROM",
    "MERMAID BAY",
  ];
  const skies = [
    ["#ff4fb3", "#2a0a4a"],
    ["#3fe0d0", "#0a1a3a"],
    ["#ffd84f", "#ff8a3d"],
    ["#9b5cff", "#ff4fb3"],
    ["#2e7dff", "#0a0a2a"],
    ["#3fe0d0", "#2e7dff"],
  ];
  return canvasTex(384, 384, (ctx) => {
    films.forEach((f, i) => {
      const x = (i % 3) * 128;
      const y = Math.floor(i / 3) * 192;
      const [a, b] = skies[i] ?? ["#ff4fb3", "#2a0a4a"];
      const g = ctx.createLinearGradient(0, y, 0, y + 192);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 128, 192);
      // a big sun or moon and a skyline
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(x + 64, y + 70, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#141018";
      for (let k = 0; k < 8; k++)
        ctx.fillRect(
          x + k * 16,
          y + 110 - ((k * 37) % 40),
          14,
          60 + ((k * 37) % 40),
        );
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f, x + 64, y + 182);
    });
  });
}

/** One poster: a plane with its UVs on cell `i` of the 3 by 2 sheet. */
function poster(i: number) {
  const g = new THREE.PlaneGeometry(0.8, 1.2);
  const uv = g.attributes.uv;
  const col = i % 3;
  const row = Math.floor(i / 3);
  for (let k = 0; k < uv.count; k++)
    uv.setXY(k, (col + uv.getX(k)) / 3, 1 - (row + 1 - uv.getY(k)) / 2);
  return g;
}

function useStore(posters: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const ART = new THREE.MeshBasicMaterial({ map: posters });
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, 0],
      });
    // the new-releases wall along the back
    for (let i = 0; i < 8; i++)
      b.add(poster(i % 6), ART, {
        position: [-6.2 + i * 1.05, 2.4, z0 + 0.02],
      });
    // double-sided tape shelves
    for (const s of SHELVES) {
      const len = s.z1 - s.z0;
      const cz = (s.z0 + s.z1) / 2;
      b.add(new THREE.BoxGeometry(0.1, 1.9, len), SHELF, {
        position: [s.x, 0.95, cz],
      });
      for (const y of ROWS_Y)
        b.add(new THREE.BoxGeometry(0.9, 0.04, len), SHELF, {
          position: [s.x, y - 0.02, cz],
        });
    }
    // the counter, a CRT on it, the return slot and a popcorn machine
    const cx = (COUNTER.x0 + COUNTER.x1) / 2;
    const cz = (COUNTER.z0 + COUNTER.z1) / 2;
    b.add(
      new THREE.BoxGeometry(
        COUNTER.x1 - COUNTER.x0,
        1,
        COUNTER.z1 - COUNTER.z0,
      ),
      COUNTER_TOP,
      {
        position: [cx, 0.5, cz],
      },
    );
    b.add(new THREE.BoxGeometry(0.7, 0.55, 0.55), BLACK, {
      position: [cx - 0.8, 1.28, cz],
    });
    b.add(new THREE.BoxGeometry(0.5, 0.9, 0.5), RED, {
      position: [x1 - 0.6, 0.45, 4],
    });
    b.add(new THREE.BoxGeometry(0.3, 0.06, 0.02), BLACK, {
      position: [x1 - 0.6, 0.75, 3.74],
    });
    b.add(new THREE.BoxGeometry(0.7, 0.9, 0.6), RED, {
      position: [x1 - 0.6, 0.45, -3],
    });
    b.add(new THREE.BoxGeometry(0.66, 0.7, 0.56), GLASS, {
      position: [x1 - 0.6, 1.25, -3],
    });
    for (let i = 0; i < 40; i++)
      b.add(new THREE.SphereGeometry(0.035, 6, 4), POPCORN, {
        position: [
          x1 - 0.85 + (i % 8) * 0.07,
          0.95 + Math.floor(i / 8) * 0.05,
          -3.2 + ((i * 3) % 5) * 0.08,
        ],
      });
    return b.build();
  }, [posters]);
}

/** Tapes on every shelf: spines in every color. */
function Tapes() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = SHELVES.length * 2 * ROWS_Y.length * TAPES_PER_ROW;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let i = 0;
    for (const s of SHELVES)
      for (const side of [-0.28, 0.28])
        for (const y of ROWS_Y)
          for (let k = 0; k < TAPES_PER_ROW; k++) {
            o.position.set(
              s.x + side,
              y + 0.1,
              s.z0 + 0.2 + (k * (s.z1 - s.z0 - 0.4)) / (TAPES_PER_ROW - 1),
            );
            o.updateMatrix();
            m.setMatrixAt(i, o.matrix);
            m.setColorAt(
              i,
              c.setHSL(((k * 29 + i * 7) % 100) / 100, 0.65, 0.5),
            );
            i++;
          }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.2, 0.2, 0.11]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

/** The counter TV: rolling color bars and a scanline flicker. */
function Crt() {
  const calm = useReducedMotion();
  const tex = useMemo(
    () =>
      canvasTex(128, 96, (ctx) => {
        const bars = [
          "#c0c0c0",
          "#c0c000",
          "#00c0c0",
          "#00c000",
          "#c000c0",
          "#c00000",
          "#0000c0",
        ];
        bars.forEach((b, i) => {
          ctx.fillStyle = b;
          ctx.fillRect((i * 128) / 7, 0, 128 / 7 + 1, 96);
        });
      }),
    [],
  );
  useEffect(() => {
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return () => tex.dispose();
  }, [tex]);
  useFrame((_, dt) => {
    if (!calm) tex.offset.y = (tex.offset.y + dt * 0.15) % 1;
  });
  const cx = (COUNTER.x0 + COUNTER.x1) / 2 - 0.8;
  const cz = (COUNTER.z0 + COUNTER.z1) / 2;
  return (
    <mesh position={[cx, 1.3, cz + 0.28]}>
      <planeGeometry args={[0.56, 0.42]} />
      <meshBasicMaterial
        map={tex}
        color={hdr("#ffffff", 1.2)}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Rewind Video on Maple Drive: blue walls, white shelves of tapes in every
 * color, a wall of new releases, a CRT rolling color bars on the counter,
 * the return slot and a popcorn machine. Throwback Trivia waits at the
 * counter with Tasha.
 */
export function VideoStore({
  onPick,
  onGame,
}: {
  onPick: PickHandler;
  onGame: (game: MinigameId) => void;
}): JSX.Element {
  const posters = useMemo(postersTex, []);
  useEffect(() => () => posters.dispose(), [posters]);
  const store = useStore(posters);
  return (
    <>
      <color attach="background" args={["#0a1430"]} />
      <hemisphereLight args={["#ffffff", "#3a4a8a", 1.6]} />
      <pointLight
        position={[0, 3.2, 0]}
        color="#fff4e8"
        intensity={7}
        distance={14}
      />
      <Floor
        width={W}
        depth={D}
        color="#6a8ad8"
        texture={{ id: "carpet", scale: 0.6 }}
        low={{ metalness: 0, roughness: 0.95 }}
        mirror={0}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["video-store"]} color="#4fe3ff" />
      <primitive object={store} />
      <Tapes />
      <Crt />
      <NeonText
        text="REWIND"
        color="#ffd84f"
        font={MARQUEE}
        width={2.8}
        k={3}
        position={[0, 3.25, z0 + 0.05]}
      />
      <TalkingNpc
        name="Tasha"
        role="cashier"
        look={CLERK_LOOK}
        mood="idle"
        at={[CLERK[0], 0, CLERK[1]]}
        rot={0}
        seed={491}
        greet
        context={{ venue: "video-store", neighborhood: "suburbia" }}
      />
      <group position={[-3.5, 0, -2]} rotation-y={-Math.PI / 2}>
        <CrowdFigure look={BROWSER} move="chatting" seed={492} />
      </group>
      {hotspotsIn("video-store").map((spot) => (
        <GamePad key={spot.id} spot={spot} onGame={onGame} />
      ))}
    </>
  );
}
