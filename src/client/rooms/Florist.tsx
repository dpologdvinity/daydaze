// Petal & Stem, the florist on Park Avenue: a sage and blush shop with a
// galvanized bucket of each stem along the side walls, a wrapping counter at
// the back, and the bouquet you are building standing on it. The stems are
// downloaded models drawn instanced (florist/BouquetModel.tsx).

import { Suspense, useEffect, useMemo, type JSX } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  BOUNDS,
  BUCKETS,
  CLERK,
  COUNTER,
  COUNTER_TOP,
  BOUQUET_SPOT,
} from "../../game/floristShop.ts";
import { STEMS } from "../../game/florist.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { Batch } from "./shared/batch.ts";
import { plant, poster } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import {
  BouquetModel,
  StemCluster,
  type Placement,
} from "./florist/BouquetModel.tsx";
import { counter } from "./florist/session.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4;

const PLASTER = surface("painted_plaster_wall", {
  scale: 0.5,
  color: "#f6dfda",
});
const TILE = surface("square_tiled_wall", {
  scale: 0.8,
  color: "#bfd8c6",
  roughness: 0.5,
});
const WOOD = new THREE.MeshStandardMaterial({
  color: "#c9a27a",
  roughness: 0.75,
});
const ZINC = new THREE.MeshStandardMaterial({
  color: "#aab4ba",
  roughness: 0.4,
  metalness: 0.7,
});
const PAPER = new THREE.MeshStandardMaterial({
  color: "#d9c3a0",
  roughness: 0.9,
});

const WILLA: Look = {
  skin: "#c48d68",
  hairStyle: "buns",
  hairColor: "#4a2a1c",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "sundress",
  outfitColor: "#6b7a2a",
  shadow: "#ffd1f0",
};

/** A few stems standing in each bucket: fixed, so the shop looks the same every visit. */
const BUCKET_POSES = [0, 1, 2, 3, 4].map((i) => ({
  dx: Math.cos(i * 2.4) * 0.09 * Math.sqrt(i + 1),
  dz: Math.sin(i * 2.4) * 0.09 * Math.sqrt(i + 1),
  tiltX: Math.sin(i * 2.4) * 0.14 * Math.sqrt(i),
  tiltZ: -Math.cos(i * 2.4) * 0.14 * Math.sqrt(i),
}));

function useRoom() {
  return useMemo(() => {
    const b = new Batch();
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), PLASTER, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), PLASTER, {
        position: [x, H / 2, 0],
      });
    // sage tile wainscoting
    b.add(new THREE.BoxGeometry(W, 1.1, 0.05), TILE, {
      position: [0, 0.55, z0 + 0.03],
    });
    for (const x of [x0 + 0.03, x1 - 0.03])
      b.add(new THREE.BoxGeometry(0.05, 1.1, D), TILE, {
        position: [x, 0.55, 0],
      });
    // the wrapping counter: wood base and top, a paper roll on a spindle
    const cw = COUNTER.x1 - COUNTER.x0;
    const cz = (COUNTER.z0 + COUNTER.z1) / 2;
    b.add(
      new THREE.BoxGeometry(cw, COUNTER_TOP - 0.05, COUNTER.z1 - COUNTER.z0),
      WOOD,
      {
        position: [0, (COUNTER_TOP - 0.05) / 2, cz],
      },
    );
    b.add(
      new THREE.BoxGeometry(cw + 0.2, 0.06, COUNTER.z1 - COUNTER.z0 + 0.2),
      WOOD,
      {
        position: [0, COUNTER_TOP - 0.02, cz],
      },
    );
    b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 14), PAPER, {
      position: [1.8, COUNTER_TOP + 0.3, cz],
      rotation: [0, 0, Math.PI / 2],
    });
    // the buckets
    for (const {
      at: [x, z],
    } of BUCKETS) {
      b.add(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 20, 1, true), ZINC, {
        position: [x, 0.25, z],
      });
      b.add(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 20), ZINC, {
        position: [x, 0.01, z],
      });
    }
    // framed prints and plants
    for (let i = 0; i < 3; i++)
      poster(
        b,
        { x: x0 + 0.04, y: 2.4, z: -3 + i * 2.2, ry: Math.PI / 2 },
        i + 1,
      );
    for (let i = 0; i < 3; i++)
      poster(
        b,
        { x: x1 - 0.04, y: 2.4, z: -3 + i * 2.2, ry: -Math.PI / 2 },
        i + 4,
      );
    for (const [x, z] of [
      [x0 + 0.7, z1 - 0.8],
      [x1 - 0.7, z1 - 0.8],
    ] as const)
      plant(b, { x, z }, 1.5);
    return b.build();
  }, []);
}

/** One bucket's worth of a stem, standing in its bucket at (x, z). */
function bucketPlacements(x: number, z: number): Placement[] {
  return BUCKET_POSES.map((p, i) => ({
    x: x + p.dx,
    y: 0.3,
    z: z + p.dz,
    pose: { tiltX: p.tiltX, tiltZ: p.tiltZ, lift: 0 },
    spin: i * 1.3,
  }));
}

/** The bouquet on the counter, and a data flag the browser tests wait on. */
function CounterBouquet() {
  const { draft } = counter.use();
  const { gl, invalidate } = useThree();
  useEffect(() => {
    gl.domElement.dataset.bouquetStems = String(draft.stems.length);
    invalidate();
    return () => {
      delete gl.domElement.dataset.bouquetStems;
    };
  }, [draft.stems.length, gl, invalidate]);
  if (draft.stems.length === 0) return null;
  return (
    <group
      position={[BOUQUET_SPOT[0], COUNTER_TOP + 0.01, BOUQUET_SPOT[1]]}
      scale={1.1}
    >
      <BouquetModel bouquet={draft} />
    </group>
  );
}

export function Florist({ onPick }: { onPick: PickHandler }): JSX.Element {
  const room = useRoom();
  return (
    <>
      <color attach="background" args={["#2a2022"]} />
      <hemisphereLight args={["#fff6ee", "#b09a8e", 3]} />
      <pointLight
        position={[0, 3, 0]}
        color="#fff0e0"
        intensity={9}
        distance={13}
      />
      <pointLight
        position={[0, 2.6, -3.5]}
        color="#ffd8e4"
        intensity={5}
        distance={9}
      />
      <Floor
        width={W}
        depth={D}
        color="#fff4ec"
        texture={{ id: "checkered_pavement_tiles", scale: 0.6 }}
        low={{ metalness: 0, roughness: 0.5 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.florist} color="#ffc8dd" />
      <primitive object={room} />
      <Suspense fallback={null}>
        {BUCKETS.map(({ stem, at: [x, z] }) => (
          <StemCluster
            key={stem}
            stem={stem}
            placements={bucketPlacements(x, z)}
          />
        ))}
        <CounterBouquet />
      </Suspense>
      <NeonText
        text="petal & stem"
        color="#ff8ac8"
        font={SCRIPT}
        width={2.8}
        k={2.4}
        position={[0, 3.1, z0 + 0.06]}
      />
      {BUCKETS.map(({ stem, at: [x, z] }) => (
        <NeonText
          key={stem}
          text={STEMS[stem].name}
          color="#ffe9f0"
          font={SCRIPT}
          width={0.9}
          k={0.5}
          position={[x < 0 ? x0 + 0.08 : x1 - 0.08, 1.45, z]}
          rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
        />
      ))}
      <TalkingNpc
        name="Willa"
        role="florist"
        look={WILLA}
        mood="idle"
        at={[CLERK[0], 0, CLERK[1]]}
        rot={0}
        seed={611}
        greet
        context={{ venue: "florist", neighborhood: "uptown" }}
      />
    </>
  );
}
