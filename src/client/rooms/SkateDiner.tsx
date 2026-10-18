import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { FOOD_VENUES } from "../../game/food/venues.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import {
  BOOTHS,
  COOK,
  COUNTER,
  FLOOR_BOUNDS,
  JUKEBOX,
  LOOP,
  STOOLS,
} from "../../game/skateDiner.ts";
import { Doll } from "../avatar/Doll.tsx";
import { holdItem } from "../food/store.ts";
import { useReducedMotion } from "../motion.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { Batch } from "./shared/batch.ts";
import { plant, poster, tableSetting } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

const VENUE = FOOD_VENUES.find((v) => v.id === "drive-in-skate-diner");
const CHERRY = "#ff2f4f";
const MINT = "#7fe8d0";
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
const GLIDE = { current: { speed: 1.4 } };

// mint tiles under cream plaster, stainless and cherry vinyl
const TILE = surface("square_tiled_wall", { scale: 1, color: MINT });
const PLASTER = surface("painted_plaster_wall", {
  scale: 0.6,
  color: "#fff4e6",
});
const STEEL = surface("chrome", {
  scale: 1,
  color: "#e0e0ea",
  metalness: 0.8,
  roughness: 0.4,
});
const VINYL = surface("leather_white", {
  scale: 2.5,
  color: CHERRY,
  roughness: 0.5,
});
const FORMICA = surface("plastic", {
  scale: 1,
  color: CHERRY,
  roughness: 0.35,
});
const TABLE_TOP = surface("marble_01", {
  scale: 1,
  color: "#fffaf4",
  roughness: 0.3,
});
const WALNUT = surface("wood_veneer", {
  scale: 1.5,
  color: "#8a4a2a",
  roughness: 0.4,
});

/** Condiments on every table and along the counter, posters and plants. */
function buildDressing() {
  const b = new Batch();
  for (const [x, z] of BOOTHS)
    tableSetting(b, { x, y: 0.75, z, ry: Math.PI / 2 });
  for (const x of [-4.3, -1.9, 0.9])
    tableSetting(b, { x, y: 1.06, z: (COUNTER.z0 + COUNTER.z1) / 2 + 0.15 });
  [-3.6, -1.2, 1.2, 3.6].forEach((z, i) =>
    poster(
      b,
      { x: FLOOR_BOUNDS.x1 - 0.02, y: 2.3, z, ry: -Math.PI / 2 },
      [4, 1, 6, 0][i] ?? 0,
      0.7,
      0.9,
    ),
  );
  for (const z of [-3.2, 0, 3.2])
    poster(
      b,
      { x: FLOOR_BOUNDS.x0 + 0.02, y: 2.4, z, ry: Math.PI / 2 },
      z === 0 ? 3 : 5,
      0.6,
      0.8,
    );
  plant(b, { x: 6.4, z: 4.9 }, 1.3);
  plant(b, { x: -6.4, z: 4.9 }, 1.3);
  plant(b, { x: 4.6, z: -5.4 }, 1.1);
  return b.build();
}

/** The black-and-white checkerboard floor. */
function checkerTexture() {
  return canvasTex(256, 256, (ctx) => {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 2 ? "#141018" : "#f4f0f0";
        ctx.fillRect(c * 32, r * 32, 32, 32);
      }
  });
}

const SERVERS: readonly { look: Look; phase: number }[] = [
  {
    phase: 0,
    look: {
      skin: "#f3d4c4",
      hairStyle: "ponytail",
      hairColor: "#f1d78f",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "mini",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
  },
  {
    phase: Math.PI,
    look: {
      skin: "#633c29",
      hairStyle: "buns",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "baby-tee-mini",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
  },
];

/** A server gliding the loop on skates, tray in hand. */
function Server({
  look,
  phase,
  seed,
}: (typeof SERVERS)[number] & { seed: number }) {
  const calm = useReducedMotion();
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const s = g.current;
    if (!s) return;
    const a = phase + (calm ? 0 : clock.elapsedTime * 0.45);
    s.position.set(
      LOOP.x + Math.cos(a) * LOOP.rx,
      0.06,
      LOOP.z + Math.sin(a) * LOOP.rz,
    );
    s.rotation.y = Math.atan2(-Math.sin(a) * LOOP.rx, Math.cos(a) * LOOP.rz);
  });
  return (
    <group ref={g}>
      <Doll look={look} mood="idle" walk={GLIDE} seed={seed} />
      {/* the tray, a burger and a malt on it */}
      <mesh position={[0.32, 1.2, 0.2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.03, 16]} />
        <meshStandardMaterial color="#d8d8e0" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.26, 1.33, 0.2]}>
        <cylinderGeometry args={[0.05, 0.04, 0.22, 10]} />
        <meshStandardMaterial color="#ffd1f0" />
      </mesh>
    </group>
  );
}

/**
 * The Skate-Up Drive-In Diner: cherry-red booths and a chrome counter on a
 * checkerboard floor, a glowing jukebox, neon EAT and the servers gliding
 * between the tables on roller skates. Tap the cook at the pass to order;
 * the menu comes round a dish at a time.
 */
export function SkateDiner({ onPick }: { onPick: PickHandler }): JSX.Element {
  if (!VENUE) throw new Error("The Skate-Up Drive-In Diner is missing");
  const menu = VENUE.menu;
  const next = useRef(0);
  const floor = useMemo(() => {
    const t = checkerTexture();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(W / 4, D / 4);
    return t;
  }, []);
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#1a0a14"]} />
      <fog attach="fog" args={["#2a0e1e", 12, 30]} />
      <hemisphereLight args={["#ffe3e8", "#3a1020", 1]} />
      <pointLight
        position={[0, 3.4, -1]}
        color="#fff1e0"
        intensity={6}
        distance={14}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2]}
        color="#ffffff"
        map={floor}
        texture={{ id: "marble_tiles", scale: 0.25 }}
        low={{ metalness: 0.2, roughness: 0.4 }}
        onPick={onPick}
      />
      <primitive object={dressing} />
      <PortalPads room={ROOMS["skate-diner"]} color={CHERRY} />
      {/* walls: mint below, cream above, chrome trim */}
      {(
        [
          [0, FLOOR_BOUNDS.z0 - 0.1, W + 0.4, 0.2],
          [
            FLOOR_BOUNDS.x0 - 0.1,
            (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2,
            0.2,
            D,
          ],
          [
            FLOOR_BOUNDS.x1 + 0.1,
            (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2,
            0.2,
            D,
          ],
        ] as const
      ).map(([x, z, w, d]) => (
        <group key={`${x}${z}`}>
          <mesh position={[x, 0.6, z]} material={TILE}>
            <boxGeometry args={[w, 1.2, d]} />
          </mesh>
          <mesh position={[x, 2.4, z]} material={PLASTER}>
            <boxGeometry args={[w, 2.4, d]} />
          </mesh>
        </group>
      ))}
      {/* the counter: chrome-edged, red top, and its stools */}
      <mesh
        position={[
          (COUNTER.x0 + COUNTER.x1) / 2,
          0.5,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ]}
        material={STEEL}
      >
        <boxGeometry
          args={[COUNTER.x1 - COUNTER.x0, 1, COUNTER.z1 - COUNTER.z0]}
        />
      </mesh>
      <mesh
        position={[
          (COUNTER.x0 + COUNTER.x1) / 2,
          1.03,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ]}
        material={FORMICA}
      >
        <boxGeometry
          args={[
            COUNTER.x1 - COUNTER.x0 + 0.1,
            0.06,
            COUNTER.z1 - COUNTER.z0 + 0.2,
          ]}
        />
      </mesh>
      {STOOLS.map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position-y={0.36}>
            <cylinderGeometry args={[0.04, 0.06, 0.72, 8]} />
            <meshStandardMaterial color="#d8d8e0" metalness={0.8} />
          </mesh>
          <mesh position-y={0.74} material={VINYL}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
          </mesh>
        </group>
      ))}
      {/* the booths: a table between two high-backed red benches */}
      {BOOTHS.map(([x, z]) => (
        <group key={z} position={[x, 0, z]}>
          <mesh position-y={0.72} material={TABLE_TOP}>
            <boxGeometry args={[1.1, 0.06, 0.8]} />
          </mesh>
          <mesh position-y={0.36}>
            <cylinderGeometry args={[0.05, 0.08, 0.72, 8]} />
            <meshStandardMaterial color="#d8d8e0" metalness={0.8} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position-z={side * 0.95}>
              <mesh position-y={0.42} material={VINYL}>
                <boxGeometry args={[1.2, 0.12, 0.5]} />
              </mesh>
              <mesh position={[0, 0.85, side * 0.25]} material={VINYL}>
                <boxGeometry args={[1.2, 0.9, 0.12]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* the jukebox, glowing */}
      <group position={[JUKEBOX[0], 0, JUKEBOX[1]]}>
        <mesh position-y={0.8} material={WALNUT}>
          <boxGeometry args={[0.9, 1.6, 0.6]} />
        </mesh>
        <mesh position={[0, 1.55, 0.05]} rotation-x={Math.PI / 2}>
          <cylinderGeometry
            args={[0.45, 0.45, 0.6, 20, 1, false, 0, Math.PI]}
          />
          <meshBasicMaterial color={hdr("#ffb02e", 1.4)} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.8, 0.31]}>
          <planeGeometry args={[0.6, 0.9]} />
          <meshBasicMaterial color={hdr("#ff4fb3", 1.2)} toneMapped={false} />
        </mesh>
      </group>
      <NeonText
        text="EAT"
        color={CHERRY}
        font={MARQUEE}
        width={2}
        k={3.4}
        position={[3.4, 3, FLOOR_BOUNDS.z0 + 0.02]}
        flicker
      />
      <NeonText
        text="SKATE-UP DINER"
        color={MINT}
        font={MARQUEE}
        width={4.6}
        k={3.2}
        position={[-1, 3.2, FLOOR_BOUNDS.z0 + 0.02]}
      />
      <TalkingNpc
        name="Dottie"
        role="server"
        look={{
          skin: "#c48d68",
          hairStyle: "curl-cloud",
          hairColor: "#1b1014",
          lips: "lips-burgundy-cherry",
          brows: "brows-feathered-honey",
          outfit: "blouse",
          outfitColor: "#ff2f9a",
          shadow: "#ff2f9a",
        }}
        mood="idle"
        at={[COOK[0], 0, COOK[1]]}
        rot={0}
        seed={311}
        situation="action-ordering"
        greet
        context={{ venue: "skate-diner", neighborhood: "suburbia" }}
        onTap={() => {
          holdItem(menu[next.current % menu.length]);
          next.current += 1;
        }}
      />
      {SERVERS.map((s, i) => (
        <Server key={i} {...s} seed={312 + i} />
      ))}
    </>
  );
}
