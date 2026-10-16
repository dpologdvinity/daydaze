import { ROOMS } from "../../game/rooms.ts";
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
import { BAR_CENTRE_X, BAR_Z, DANCE } from "./violethour/layout.ts";
import { drink } from "../effects/drunk.ts";
import { Sparkles } from "./shared/Sparkles.tsx";

/**
 * The Violet Hour, a lesbian bar with a small dance floor on Nightlife Row.
 * `onDrink` is the hook the bartender's tap calls, for the drink and buzz
 * system to wire in.
 */
// The bartender pours a free cocktail; the buzz system takes it from there.
const orderCocktail = () => drink("cocktail");

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
      <fog attach="fog" args={["#24093a", 9, 24]} />
      <hemisphereLight args={["#8a5cff", "#ff8fb0", 0.4]} />
      <pointLight
        position={[BAR_CENTRE_X, 2.6, BAR_Z + 1.4]}
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
