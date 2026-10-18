import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Couple } from "../avatar/Couple.tsx";
import { Doll } from "../avatar/Doll.tsx";
import { useReducedMotion } from "../motion.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { LedFloor } from "./shared/LedFloor.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import {
  Bar,
  Flags,
  Posters,
  PoolTable,
  RegularsCorner,
  Walls,
} from "./violethour/Decor.tsx";
import { VioletNpcs } from "./violethour/Npcs.tsx";
import { BAR_CENTER_X, BAR_Z, DANCE } from "./violethour/layout.ts";
import { drink } from "../effects/drunk.ts";
import { Sparkles } from "./shared/Sparkles.tsx";
import { HdriLight } from "./shared/HdriLight.tsx";

/**
 * The Violet Hour, a lesbian bar with a small dance floor on Nightlife Row.
 * `onDrink` is the hook the bartender's tap calls, for the drink and buzz
 * system to wire in.
 */
// The bartender pours a free cocktail; the buzz system takes it from there.
const orderCocktail = () => drink("cocktail");

const COUPLE: readonly [Look, Look] = [
  {
    skin: "#c48d68",
    hairStyle: "mermaid",
    hairColor: "#7b4dff",
    lips: "lips-burgundy-cherry",
    brows: "brows-feathered-honey",
    outfit: "sequin-slip",
    outfitColor: "#9b5cff",
    shadow: "#d23cff",
  },
  {
    skin: "#633c29",
    hairStyle: "pixie",
    hairColor: "#1b1014",
    lips: "lips-nude-pink-gloss",
    brows: "brows-sculpted-espresso",
    outfit: "jeans",
    outfitColor: "#141018",
    shadow: "#ffd1f0",
  },
];

const SOLO: Look = {
  skin: "#f3d4c4",
  hairStyle: "shag",
  hairColor: "#ff4fb3",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "baby-tee-mini",
  outfitColor: "#ff2f9a",
  shadow: "#ff2f9a",
};

/** Two women slow-dancing on the little floor, and one on her own. */
function DanceFloorPair() {
  return (
    <>
      <Couple
        a={COUPLE[0]}
        b={COUPLE[1]}
        center={[DANCE.x - 1.3, DANCE.y - 0.5]}
        facing={0.4}
        move="slow-dance"
      />
      <Doll
        look={SOLO}
        mood="dance"
        dance="hair-flip"
        seed={41}
        position={[DANCE.x + 1.7, 0, DANCE.y - 0.5]}
        rotation-y={-0.5}
      />
    </>
  );
}

export function VioletHour({
  onPick,
  onDrink = orderCocktail,
}: {
  onPick: PickHandler;
  onDrink?: () => void;
}) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#0a0310"]} />
      <HdriLight file="aft_lounge" intensity={0.35} />
      <fog attach="fog" args={["#24093a", 9, 24]} />
      <hemisphereLight args={["#8a5cff", "#ff8fb0", 0.4]} />
      <pointLight
        position={[BAR_CENTER_X, 2.6, BAR_Z + 1.4]}
        color="#ff9a56"
        intensity={4}
        distance={7}
      />
      <pointLight
        position={[DANCE.x, 2.4, DANCE.y]}
        color="#ff7fbf"
        intensity={2.5}
        distance={6}
      />
      <Floor
        width={12}
        depth={12}
        center={[-0.5, 1]}
        color="#7a5a6a"
        texture={{ id: "dark_wooden_planks", scale: 0.4 }}
        mirror={0.4}
        low={{ metalness: 0, roughness: 0.8 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["violet-hour"]} color="#ffb070" />
      <Walls />
      <Flags />
      <Posters />
      <Bar />
      <PoolTable />
      <RegularsCorner />
      <DanceFloorPair />
      <LedFloor
        center={[DANCE.x, DANCE.y]}
        cols={5}
        rows={4}
        colors={["#ff7fbf", "#c58cff", "#ffb070", "#ffe3f6"]}
      />
      <Palm position={[-5.4, 0, -5.3]} />
      <Palm position={[5.2, 0, 4.8]} scale={0.9} />
      <Sparkles
        count={calm ? 0 : 60}
        scale={[10, 3.2, 10]}
        position={[0, 1.8, 0]}
        size={2}
        speed={calm ? 0 : 0.2}
        color="#ffd1f0"
        opacity={0.6}
      />
      <VioletNpcs onDrink={onDrink} />
    </>
  );
}
