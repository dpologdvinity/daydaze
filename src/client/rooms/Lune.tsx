import { type JSX, useMemo, useRef } from "react";
import * as THREE from "three";
import { FOOD_VENUES } from "../../game/food/venues.ts";
import type { Look } from "../../game/look.ts";
import {
  BOUNDS,
  CHAIR_HEIGHT,
  CHAIRS,
  DATE_TABLE,
  PASS,
  PIANIST,
  PIANO,
  SERVER,
  TABLE_HALF,
  TABLES,
} from "../../game/lune.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Doll } from "../avatar/Doll.tsx";
import { holdItem } from "../food/store.ts";
import { surface } from "../city/worldTexture.ts";
import { Batch } from "./shared/batch.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 3.6;

const WALL = surface("velour_velvet", { scale: 0.6, color: "#3a4a9a" });
const WOOD = surface("wood_veneer", { scale: 1, color: "#3a2418" });
const LINEN = new THREE.MeshStandardMaterial({
  color: "#f4efe6",
  roughness: 0.85,
});
const BRASS = new THREE.MeshStandardMaterial({
  color: "#c9a24a",
  roughness: 0.3,
  metalness: 0.8,
});
const LACQUER = new THREE.MeshStandardMaterial({
  color: "#0c0a10",
  roughness: 0.15,
  metalness: 0.3,
});
const FLAME = new THREE.MeshBasicMaterial({
  color: hdr("#ffb24a", 2.6),
  toneMapped: false,
});
const WAX = new THREE.MeshStandardMaterial({
  color: "#f4ecd8",
  roughness: 0.6,
});
const MOON = new THREE.MeshBasicMaterial({
  color: hdr("#fff2c8", 1.8),
  toneMapped: false,
});

const VENUE = FOOD_VENUES.find((v) => v.id === "tasting-room-lune");

const SERVER_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "sleek-bob",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#8a5a3c",
};
const PIANIST_LOOK: Look = {
  ...SERVER_LOOK,
  skin: "#f3d4c4",
  hairStyle: "waves",
  hairColor: "#b77a3e",
  outfit: "sequin-slip",
  outfitColor: "#e8e2ff",
};
/** The date already under way at one table: two women leaning in. */
const DATE_LOOKS: readonly Look[] = [
  {
    ...SERVER_LOOK,
    skin: "#c48d68",
    hairStyle: "coils",
    outfit: "corset-maxi",
    outfitColor: "#6a1a2a",
  },
  {
    ...SERVER_LOOK,
    skin: "#e6b48e",
    hairStyle: "waves",
    hairColor: "#1b1014",
    outfit: "sundress",
    outfitColor: "#f2e6c8",
  },
];

function useRoom() {
  return useMemo(() => {
    const b = new Batch();
    // velvet walls, open to the street side where the camera looks in
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    // tables for two: linen over a pedestal, a candle and two glasses
    for (const [x, z] of TABLES) {
      b.add(new THREE.CylinderGeometry(0.05, 0.08, 0.74, 8), BRASS, {
        position: [x, 0.37, z],
      });
      b.add(
        new THREE.BoxGeometry(TABLE_HALF * 2 + 0.1, 0.04, TABLE_HALF * 2 + 0.1),
        LINEN,
        { position: [x, 0.76, z] },
      );
      b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), WAX, {
        position: [x, 0.84, z],
      });
      b.add(new THREE.ConeGeometry(0.014, 0.04, 6), FLAME, {
        position: [x, 0.92, z],
      });
    }
    // chairs: a seat and a back, the back away from the table
    for (const { at, facing } of CHAIRS) {
      const away = Math.sign(at[1] - facing[1]);
      b.add(new THREE.BoxGeometry(0.44, 0.06, 0.42), WOOD, {
        position: [at[0], CHAIR_HEIGHT, at[1]],
      });
      b.add(new THREE.BoxGeometry(0.44, 0.5, 0.05), WOOD, {
        position: [at[0], CHAIR_HEIGHT + 0.28, at[1] + away * 0.2],
      });
      for (const dx of [-0.18, 0.18])
        for (const dz of [-0.17, 0.17])
          b.add(
            new THREE.CylinderGeometry(0.02, 0.02, CHAIR_HEIGHT, 6),
            BRASS,
            {
              position: [at[0] + dx, CHAIR_HEIGHT / 2, at[1] + dz],
            },
          );
    }
    // the grand piano: a lacquered case on three legs, its lid up
    const px = (PIANO.x0 + PIANO.x1) / 2;
    const pz = (PIANO.z0 + PIANO.z1) / 2;
    b.add(
      new THREE.BoxGeometry(PIANO.x1 - PIANO.x0, 0.35, PIANO.z1 - PIANO.z0),
      LACQUER,
      {
        position: [px, 0.85, pz],
      },
    );
    b.add(new THREE.BoxGeometry(PIANO.x1 - PIANO.x0, 0.03, 1.2), LACQUER, {
      position: [px, 1.35, pz - 0.15],
      rotation: [0.6, 0, 0],
    });
    for (const [dx, dz] of [
      [-1.2, 0.5],
      [1.2, 0.5],
      [0, -0.55],
    ] as const)
      b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), LACQUER, {
        position: [px + dx, 0.35, pz + dz],
      });
    b.add(new THREE.BoxGeometry(0.9, 0.06, 0.35), LACQUER, {
      position: [PIANIST[0], 0.48, PIANIST[1] + 0.1],
    });
    // the pass to the kitchen: a brass-topped counter
    b.add(
      new THREE.BoxGeometry(PASS.x1 - PASS.x0, 1.05, PASS.z1 - PASS.z0),
      WOOD,
      { position: [(PASS.x0 + PASS.x1) / 2, 0.525, (PASS.z0 + PASS.z1) / 2] },
    );
    b.add(new THREE.BoxGeometry(PASS.x1 - PASS.x0 + 0.1, 0.05, 0.9), BRASS, {
      position: [(PASS.x0 + PASS.x1) / 2, 1.08, (PASS.z0 + PASS.z1) / 2],
    });
    // the moon over the piano: a crescent cut from two discs
    const moon = new THREE.RingGeometry(0, 1, 40);
    b.add(moon, MOON, { position: [0, 2.6, z0 + 0.02], scale: [0.9, 0.9, 1] });
    b.add(new THREE.CircleGeometry(0.85, 40), WALL, {
      position: [0.35, 2.75, z0 + 0.03],
    });
    // pendant candles down the aisle
    for (const z of [-3, -0.6, 1.8])
      for (const x of [-1.5, 1.5]) {
        b.add(new THREE.CylinderGeometry(0.004, 0.004, 1.4, 4), BRASS, {
          position: [x, H - 0.7, z],
        });
        b.add(new THREE.SphereGeometry(0.09, 10, 8), FLAME, {
          position: [x, H - 1.45, z],
        });
      }
    return b.build();
  }, []);
}

/**
 * Lune Tasting Room on Park Avenue: navy velvet walls, tables for two in
 * white linen by candlelight, a grand piano under a crescent moon, and
 * Margot at the pass, who brings the courses. Take any free chair; one table
 * is already on a date.
 */
export function Lune({ onPick }: { onPick: PickHandler }): JSX.Element {
  const room = useRoom();
  if (!VENUE) throw new Error("Lune is missing from the venues");
  const venue = VENUE;
  // each tap brings the next course
  const course = useRef(0);
  return (
    <>
      <color attach="background" args={["#05060f"]} />
      <hemisphereLight args={["#ffd9b0", "#141a40", 1.1]} />
      <pointLight
        position={[0, 2.6, -1]}
        color="#ffb070"
        intensity={7}
        distance={10}
      />
      <pointLight
        position={[0, 2.2, -3.6]}
        color="#fff0c8"
        intensity={3}
        distance={6}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, (z0 + z1) / 2]}
        color="#5a3424"
        texture={{ id: "herringbone_parquet", scale: 0.6 }}
        low={{ metalness: 0, roughness: 0.6 }}
        mirror={0}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.lune} color="#fff2c8" />
      <primitive object={room} />
      <NeonText
        text="lune"
        color="#fff2c8"
        font={SCRIPT}
        width={3.2}
        k={2.4}
        position={[2.7, 2.5, z0 + 0.06]}
      />
      <TalkingNpc
        name="Margot"
        role="server"
        look={SERVER_LOOK}
        mood="idle"
        at={[SERVER[0], 0, SERVER[1]]}
        rot={-0.4}
        seed={621}
        greet
        situation="action-ordering"
        context={{ venue: "lune", neighborhood: "uptown" }}
        onTap={() => holdItem(venue.menu[course.current++ % venue.menu.length])}
      />
      {/* the pianist at the keys */}
      <group position={[PIANIST[0], 0, PIANIST[1] + 0.1]} rotation-y={Math.PI}>
        <Doll look={PIANIST_LOOK} mood="sit" hold="sit-at-table" seed={622} />
      </group>
      {/* the date at the table by the window */}
      {CHAIRS.filter((c) => c.table === DATE_TABLE).map((c, i) => (
        <group
          key={i}
          position={[c.at[0], CHAIR_HEIGHT - 0.48, c.at[1]]}
          rotation-y={Math.atan2(c.facing[0] - c.at[0], c.facing[1] - c.at[1])}
        >
          <Doll
            look={DATE_LOOKS[i % DATE_LOOKS.length] ?? SERVER_LOOK}
            mood="sit"
            hold={i ? "sit-chatting" : "sit-at-table"}
            seed={623 + i}
          />
        </group>
      ))}
    </>
  );
}
