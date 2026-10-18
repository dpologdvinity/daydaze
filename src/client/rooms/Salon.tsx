import { useMemo, type JSX } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { SALON } from "../../game/salon.ts";
import { Doll } from "../avatar/Doll.tsx";
import { openShop } from "../ui/shopRequest.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles, type ShelfRow } from "./shared/Bottles.tsx";
import { plant, poster, rug, shelf, stringLights } from "./shared/details.ts";
import { GOLD } from "./shared/materials.ts";
import { surface } from "../city/worldTexture.ts";

const PINK = "#ff4fb3";
const { bounds } = SALON;
const W = bounds.x1 - bounds.x0;
const D = bounds.z1 - bounds.z0;

// blush plaster over white beadboard, white marble, pink vinyl chairs
const PLASTER = surface("painted_plaster_wall", {
  scale: 0.5,
  color: "#ffd1e8",
});
const BEADBOARD = surface("wood_plank_wall", {
  scale: 1.2,
  color: "#fff6fa",
  roughness: 0.6,
});
const MARBLE = surface("marble_01", {
  scale: 0.8,
  color: "#ffffff",
  roughness: 0.25,
});
const VINYL = surface("leather_white", {
  scale: 2.5,
  color: PINK,
  roughness: 0.45,
});
const SHELF_GLASS = new THREE.MeshStandardMaterial({
  color: "#ffe8f4",
  metalness: 0.4,
  roughness: 0.05,
});
// the retail wall by reception: product on glass shelves, in the frame of
// <Bottles> (x along the right wall, room z; z out from it)
const SHELVES = [1.2, 1.65, 2.1];
const ROWS: readonly ShelfRow[] = SHELVES.map((y) => ({
  x0: -1.6,
  x1: 1.6,
  y,
  z: 0.14,
  count: 11,
}));

/** Beadboard, product shelves, beauty prints, plants, a rug and bulbs. */
function buildDressing() {
  const b = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  b.add(box, BEADBOARD, {
    position: [0, 0.6, bounds.z0 + 0.01],
    scale: [W, 1.2, 0.02],
  });
  for (const x of [bounds.x0 + 0.01, bounds.x1 - 0.01])
    b.add(box, BEADBOARD, { position: [x, 0.6, 0], scale: [0.02, 1.2, D] });
  for (const y of SHELVES)
    shelf(
      b,
      { x: bounds.x1 - 0.14, y, z: 0, ry: -Math.PI / 2 },
      3.4,
      SHELF_GLASS,
      0.24,
    );
  for (const [z, d] of [
    [-3.2, 6],
    [-1.6, 1],
    [1.8, 3],
    [3.4, 7],
  ] as const)
    poster(
      b,
      { x: bounds.x0 + 0.02, y: 2.2, z, ry: Math.PI / 2 },
      d,
      0.7,
      0.9,
      GOLD,
    );
  plant(b, { x: 5.4, z: 4.4 }, 1.3);
  plant(b, { x: -5.4, z: 4.4 }, 1.3);
  plant(b, { x: -5.4, z: -4.3 }, 1.1);
  rug(b, { x: 0, z: 2.6 }, 3.2, 2.2, "#ffc8e0");
  stringLights(b, [-5.8, 3.7, -4.8], [5.8, 3.7, -4.8], 22, "#fff0d8", 0.2);
  return b.build();
}

const STYLIST: Look = {
  skin: "#633c29",
  hairStyle: "pixie",
  hairColor: "#ff4fb3",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#ff2f9a",
};

/** A client in the first chair, hair being done. */
const CLIENT: Look = {
  skin: "#f3d4c4",
  hairStyle: "long-curly",
  hairColor: "#f1d78f",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "blouse",
  outfitColor: "#e8e2ff",
  shadow: "#ffd1f0",
};

/**
 * The Blowout Bar on Gallery Row: blush-pink walls, three styling chairs at
 * lit mirrors, a reception desk and a stylist who sells the salon's colors
 * and cuts. Tap her (or the dock's button) to shop; sit in a chair to see
 * yourself in the mirror.
 */
export function Salon({ onPick }: { onPick: PickHandler }): JSX.Element {
  const shop = () => openShop("salon", "The Blowout Bar");
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#24101c"]} />
      <fog attach="fog" args={["#3a1a2c", 12, 28]} />
      <hemisphereLight args={["#fff0f6", "#5a2a40", 1.1]} />
      <pointLight
        position={[0, 3.4, 0]}
        color="#fff4f8"
        intensity={7}
        distance={14}
      />
      <Floor
        width={W}
        depth={D}
        color="#f4e6ea"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.5 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.salon} color={PINK} />
      {(
        [
          [0, bounds.z0 - 0.1, W + 0.4, 0.2],
          [bounds.x0 - 0.1, 0, 0.2, D],
          [bounds.x1 + 0.1, 0, 0.2, D],
        ] as const
      ).map(([x, z, w, d]) => (
        <mesh key={`${x}${z}`} position={[x, 2, z]} material={PLASTER}>
          <boxGeometry args={[w, 4, d]} />
        </mesh>
      ))}
      <primitive object={dressing} />
      <group position={[bounds.x1, 0, 0]} rotation-y={-Math.PI / 2}>
        <Bottles rows={ROWS} seed={31} />
      </group>
      {/* the mirror counter, and a lit mirror over each chair */}
      <mesh position={[0, 0.45, bounds.z0 + 0.4]} material={MARBLE}>
        <boxGeometry args={[W, 0.9, 0.8]} />
      </mesh>
      {SALON.chairs.map(([x, z]) => (
        <group key={x}>
          <mesh position={[x, 2, bounds.z0 + 0.06]}>
            <planeGeometry args={[1.4, 1.6]} />
            <meshStandardMaterial
              color="#dfe9f2"
              emissive="#9fb8cc"
              emissiveIntensity={0.25}
              metalness={0.4}
              roughness={0.15}
            />
          </mesh>
          {/* the bulbs round the mirror */}
          {[-0.75, 0.75].map((dx) => (
            <mesh key={dx} position={[x + dx, 2, bounds.z0 + 0.1]}>
              <boxGeometry args={[0.08, 1.7, 0.04]} />
              <meshBasicMaterial
                color={hdr("#fff4e0", 1.6)}
                toneMapped={false}
              />
            </mesh>
          ))}
          {/* the chair */}
          <mesh position={[x, 0.5, z]} material={VINYL}>
            <boxGeometry args={[0.6, 0.12, 0.6]} />
          </mesh>
          <mesh position={[x, 0.95, z + 0.28]} material={VINYL}>
            <boxGeometry args={[0.6, 0.8, 0.1]} />
          </mesh>
          <mesh position={[x, 0.25, z]}>
            <cylinderGeometry args={[0.06, 0.25, 0.5, 12]} />
            <meshStandardMaterial
              color="#d8d8e0"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}
      {/* reception */}
      <mesh
        position={[
          (SALON.desk.x0 + SALON.desk.x1) / 2,
          0.55,
          (SALON.desk.z0 + SALON.desk.z1) / 2,
        ]}
        material={MARBLE}
      >
        <boxGeometry
          args={[
            SALON.desk.x1 - SALON.desk.x0,
            1.1,
            SALON.desk.z1 - SALON.desk.z0,
          ]}
        />
      </mesh>
      <NeonText
        text="THE BLOWOUT BAR"
        color={PINK}
        font={MARQUEE}
        width={4.6}
        k={3.2}
        position={[0, 3.4, bounds.z0 + 0.02]}
      />
      {/* a client in the first chair */}
      <group
        position={[SALON.chairs[0][0], 0.55 - 0.48, SALON.chairs[0][1]]}
        rotation-y={Math.PI}
      >
        <Doll look={CLIENT} mood="sit" seed={351} />
      </group>
      <TalkingNpc
        name="Dani"
        role="coat-check"
        look={STYLIST}
        mood="idle"
        at={[SALON.stylist[0], 0, SALON.stylist[1]]}
        rot={-Math.PI / 2}
        seed={352}
        greet
        context={{ venue: "salon", neighborhood: "arts-district" }}
        onTap={shop}
      />
    </>
  );
}
