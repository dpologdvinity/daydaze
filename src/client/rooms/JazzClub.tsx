import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  BAND,
  BAR,
  BOUNDS,
  STAGE,
  STOOL_X,
  STOOL_ZS,
  TABLE_R,
  TABLES,
} from "../../game/jazzClub.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { BarStools } from "./shared/BarStools.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles } from "./shared/Bottles.tsx";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { GOLD, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.2;

const BRICK = surface("brick_wall_02", { scale: 0.6, color: "#6a4a4a" });
const VELVET = surface("velour_velvet", {
  scale: 1.2,
  color: "#2a2a6a",
  roughness: 0.9,
});
const CURTAIN = surface("velour_velvet", {
  scale: 1,
  color: "#8a1028",
  roughness: 0.9,
});
const WOOD = surface("wood_veneer", {
  scale: 1.2,
  color: "#7a4a2a",
  roughness: 0.5,
});
const MARBLE = surface("marble_01", {
  scale: 0.8,
  color: "#2a2a34",
  roughness: 0.35,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: "#0c0a10",
  roughness: 0.2,
  metalness: 0.3,
});
const IVORY = new THREE.MeshStandardMaterial({
  color: "#f4ecd8",
  roughness: 0.35,
});
const FLAME = new THREE.MeshBasicMaterial({
  color: hdr("#ffb24a", 3),
  toneMapped: false,
});
const WAX = new THREE.MeshStandardMaterial({
  color: "#f4e8d0",
  roughness: 0.6,
});
const FOOTLIGHT = new THREE.MeshBasicMaterial({
  color: hdr("#ffd8a0", 2),
  toneMapped: false,
});
const BEAM = new THREE.MeshBasicMaterial({
  color: "#ffe8c0",
  transparent: true,
  opacity: 0.08,
  depthWrite: false,
});

/** The band: the pianist, the bassist, the drummer and the horn player. */
const PIANIST: Look = {
  skin: "#633c29",
  hairStyle: "top-knot",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#ffb02e",
};
const BAND_LOOKS: readonly Look[] = [
  PIANIST,
  {
    skin: "#e6b48e",
    hairStyle: "bob",
    hairColor: "#7b4dff",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "jeans",
    outfitColor: "#141018",
    shadow: "#d23cff",
  },
  {
    skin: "#94603f",
    hairStyle: "afro",
    hairColor: "#1b1014",
    lips: "lips-90s-caramel-ombre",
    brows: "brows-fox-snatched",
    outfit: "flares",
    outfitColor: "#ffb02e",
    shadow: "#ffb02e",
  },
  {
    skin: "#f3d4c4",
    hairStyle: "waves",
    hairColor: "#f1d78f",
    lips: "lips-burgundy-cherry",
    brows: "brows-feathered-honey",
    outfit: "mini",
    outfitColor: "#9b5cff",
    shadow: "#ff2f9a",
  },
];
const BAND_MOVES = ["chatting", "groove", "clap", "groove"] as const;

/** The back-bar's shelves, against the east wall behind the counter. */
const SHELF_ROWS = [1.3, 1.85, 2.4].map((y) => ({
  x0: BAR.z0 + 0.3,
  x1: BAR.z1 - 0.3,
  y,
  z: 0.05,
  count: 16,
}));

function useRoom() {
  return useMemo(() => {
    const b = new Batch();
    // brick behind the stage, blue velvet down the sides
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), BRICK, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), VELVET, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    // the stage, its footlights and the red curtain swags at either side
    const sw = STAGE.x1 - STAGE.x0;
    const sd = STAGE.z1 - STAGE.z0;
    b.add(new THREE.BoxGeometry(sw, STAGE.height, sd), WOOD, {
      position: [0, STAGE.height / 2, (STAGE.z0 + STAGE.z1) / 2],
    });
    for (let x = STAGE.x0 + 0.4; x < STAGE.x1; x += 0.8)
      b.add(new THREE.SphereGeometry(0.05, 8, 6), FOOTLIGHT, {
        position: [x, STAGE.height + 0.02, STAGE.z1 - 0.08],
      });
    for (const side of [-1, 1])
      b.add(new THREE.BoxGeometry(1.4, H, 0.3), CURTAIN, {
        position: [side * (STAGE.x1 + 0.2), H / 2, z0 + 0.4],
      });
    // a spotlight's beam onto the horn player
    const horn = BAND[3];
    if (horn)
      b.add(new THREE.ConeGeometry(1.1, H, 24, 1, true), BEAM, {
        position: [horn.at[0], H / 2, horn.at[1]],
      });
    // the upright piano, the bass and the kit
    const [px, pz] = BAND[0]?.at ?? [0, 0];
    b.add(new THREE.BoxGeometry(1.5, 1.3, 0.6), BLACK, {
      position: [px, STAGE.height + 0.65, pz - 0.6],
    });
    b.add(new THREE.BoxGeometry(1.4, 0.06, 0.2), IVORY, {
      position: [px, STAGE.height + 0.75, pz - 0.22],
    });
    const [bx, bz] = BAND[1]?.at ?? [0, 0];
    b.add(
      new THREE.LatheGeometry(
        [
          [0.01, 0],
          [0.28, 0.1],
          [0.32, 0.45],
          [0.22, 0.75],
          [0.27, 1.0],
          [0.12, 1.25],
          [0.01, 1.3],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        16,
      ).scale(1, 1, 0.4),
      WOOD,
      {
        position: [bx + 0.45, STAGE.height, bz + 0.2],
        rotation: [0, 0, -0.15],
      },
    );
    b.add(new THREE.BoxGeometry(0.06, 0.8, 0.05), BLACK, {
      position: [bx + 0.3, STAGE.height + 1.6, bz + 0.2],
      rotation: [0, 0, -0.15],
    });
    const [dx, dz] = BAND[2]?.at ?? [0, 0];
    b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.4, 18), CURTAIN, {
      position: [dx, STAGE.height + 0.35, dz + 0.6],
      rotation: [Math.PI / 2, 0, 0],
    });
    for (const [tx, ty, r] of [
      [-0.5, 0.65, 0.2],
      [0.5, 0.65, 0.2],
    ] as const)
      b.add(new THREE.CylinderGeometry(r, r, 0.18, 16), CURTAIN, {
        position: [dx + tx, STAGE.height + ty, dz + 0.5],
      });
    b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.01, 18), GOLD, {
      position: [dx + 0.8, STAGE.height + 1.1, dz + 0.3],
    });
    // shelves for the bottles on the wall behind the bar
    for (const { y } of SHELF_ROWS)
      b.add(new THREE.BoxGeometry(0.3, 0.04, BAR.z1 - BAR.z0 - 0.4), WOOD, {
        position: [x1 - 0.2, y - 0.02, (BAR.z0 + BAR.z1) / 2],
      });
    // the bar counter and its brass foot rail
    b.add(
      new THREE.BoxGeometry(BAR.x1 - BAR.x0, 1.05, BAR.z1 - BAR.z0),
      MARBLE,
      {
        position: [(BAR.x0 + BAR.x1) / 2, 0.525, (BAR.z0 + BAR.z1) / 2],
      },
    );
    b.add(new THREE.CylinderGeometry(0.025, 0.025, BAR.z1 - BAR.z0, 8), GOLD, {
      position: [BAR.x0 - 0.1, 0.2, (BAR.z0 + BAR.z1) / 2],
      rotation: [Math.PI / 2, 0, 0],
    });
    // tables: a wooden round top on a brass stem, a chair, a candle in a jar
    for (const [tx, tz] of TABLES) {
      b.add(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.05, 20), WOOD, {
        position: [tx, 0.74, tz],
      });
      b.add(new THREE.CylinderGeometry(0.04, 0.2, 0.72, 10), GOLD, {
        position: [tx, 0.36, tz],
      });
      b.add(new THREE.BoxGeometry(0.42, 0.06, 0.42), CURTAIN, {
        position: [tx, 0.45, tz + 0.85],
      });
      b.add(new THREE.BoxGeometry(0.42, 0.5, 0.06), WOOD, {
        position: [tx, 0.7, tz + 1.05],
      });
      b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 10), WAX, {
        position: [tx, 0.8, tz],
      });
      b.add(new THREE.SphereGeometry(0.02, 6, 4), FLAME, {
        position: [tx, 0.86, tz],
      });
    }
    return b.build();
  }, []);
}

/**
 * The Midnight Horn on Park Avenue: brick behind a low stage where a
 * four-piece band plays under a spotlight, blue velvet walls, candlelit
 * two-tops and a marble bar with a wall of bottles.
 */
export function JazzClub({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const room = useRoom();
  const glow = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    // candlelight breathing over the room
    if (glow.current && !calm)
      glow.current.intensity = 4 + Math.sin(clock.elapsedTime * 1.3) * 0.4;
  });
  const stools = useMemo(
    () => STOOL_ZS.map((z) => [STOOL_X, 0, z, Math.PI / 2] as const),
    [],
  );
  return (
    <>
      <color attach="background" args={["#08060e"]} />
      <fog attach="fog" args={["#100c1a", 8, 22]} />
      <hemisphereLight args={["#6a6aa8", "#2a1010", 1.1]} />
      <pointLight
        position={[2.5, 3.6, -4.5]}
        color="#ffe0b0"
        intensity={9}
        distance={9}
      />
      <pointLight
        ref={glow}
        position={[-1, 2, 1]}
        color="#ffb24a"
        intensity={4}
        distance={10}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, (z0 + z1) / 2]}
        color="#7a5a4a"
        texture={{ id: "dark_wooden_planks", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["jazz-club"]} color="#4fe3ff" />
      <primitive object={room} />
      <BarStools at={stools} color="#2a2a6a" />
      <group position={[x1 - 0.2, 0, 0]} rotation-y={-Math.PI / 2}>
        <Bottles rows={SHELF_ROWS} seed={11} />
      </group>
      {BAND.map((m, i) => (
        <group
          key={m.part}
          position={[m.at[0], STAGE.height, m.at[1]]}
          rotation-y={i === 0 ? Math.PI : 0}
        >
          <CrowdFigure
            look={BAND_LOOKS[i] ?? PIANIST}
            move={BAND_MOVES[i]}
            seed={461 + i}
          />
        </group>
      ))}
      <NeonText
        text="the midnight horn"
        color="#4fe3ff"
        font={SCRIPT}
        width={4.2}
        k={3}
        position={[0, 3.3, z0 + 0.05]}
        flicker
      />
    </>
  );
}
