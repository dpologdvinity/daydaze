import type { JSX } from "react";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import type { PickHandler } from "../shared/Floor.tsx";
import { hdr } from "../shared/materials.ts";
import { FoodRoom, type FoodPalette } from "./FoodRoom.tsx";

const VENUE = FOOD_VENUES.find((v) => v.id === "halo-halo-haus");
const PALETTE: FoodPalette = {
  room: "halo-halo-cafe",
  background: "#1a0a24",
  fog: "#2a1236",
  sky: "#ffd1f0",
  ground: "#9b5cff",
  light: "#ffe3f6",
  floor: "#3a1a4a",
  wall: "#f7e6ff",
  counter: "#7b4dff",
  accent: "#c58cff",
};
/** The layers of a halo-halo glass, bottom to top: beans and jellies, shaved
 * ice, then ube and leche flan on top. */
const LAYERS = ["#8a3a2a", "#3fd06a", "#f4f4f8", "#9b5cff", "#ffd166"];

/**
 * Halo-Halo Haus, Little Manila's dessert cafe: lilac walls, capiz-shell
 * lamps and a row of halo-halo glasses on the counter, layered from beans to
 * ube. Tap the server for a dessert.
 */
export function HaloHaloCafe({ onPick }: { onPick: PickHandler }): JSX.Element {
  if (!VENUE) throw new Error("Halo-Halo Haus is missing from the venues");
  return (
    <FoodRoom
      venue={VENUE}
      palette={PALETTE}
      staff={{
        name: "Joy",
        role: "server",
        seed: 341,
        look: {
          skin: "#c48d68",
          hairStyle: "pigtails",
          hairColor: "#1b1014",
          lips: "lips-hot-pink-glam",
          brows: "brows-feathered-honey",
          outfit: "baby-tee-mini",
          outfitColor: "#9b5cff",
          shadow: "#d23cff",
        },
      }}
      onPick={onPick}
    >
      {[-2.4, -1.2, 0, 1.2, 2.4].map((x) => (
        <group key={x} position={[x, 1.17, -0.85]}>
          {LAYERS.map((c, i) => (
            <mesh key={c} position-y={0.04 + i * 0.07}>
              <cylinderGeometry
                args={[0.1 + i * 0.006, 0.09 + i * 0.006, 0.07, 14]}
              />
              <meshStandardMaterial color={c} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* capiz-shell lamps over the counter */}
      {[-2, 0, 2].map((x) => (
        <mesh key={x} position={[x, 2.9, -0.4]}>
          <sphereGeometry args={[0.24, 12, 8]} />
          <meshBasicMaterial color={hdr("#fff1f6", 1.4)} toneMapped={false} />
        </mesh>
      ))}
    </FoodRoom>
  );
}
