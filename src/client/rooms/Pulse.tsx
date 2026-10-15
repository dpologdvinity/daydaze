import type { MinigameId } from "../../game/hotspots.ts";
import { hotspotsIn } from "../../game/hotspots.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Beams, type Beam } from "./shared/Beams.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { GamePad } from "./shared/GamePad.tsx";
import { LedFloor } from "./shared/LedFloor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { ClubLights } from "./pulse/DanceFloor.tsx";
import {
  Bar,
  Booths,
  CoatCheck,
  DjBooth,
  MirrorBall,
  Podiums,
  Walls,
} from "./pulse/Decor.tsx";
import { PulseNpcs } from "./pulse/Npcs.tsx";
import { DANCE } from "./pulse/layout.ts";
import { drink } from "../effects/drunk.ts";

const BEAMS: readonly Beam[] = [
  { position: [-3.4, 3.8, -6.4], color: "#ff2f9a", phase: 0 },
  { position: [3.4, 3.8, -6.4], color: "#4fe3ff", phase: 2 },
  { position: [0, 3.9, -6.6], color: "#9b5cff", phase: 4 },
];

/**
 * Pulse, the main dance club on Nightlife Row. `onGame` opens a minigame
 * from a floor hotspot; `onDrink` is the hook the bartender's tap calls, for
 * the drink and buzz system to wire in.
 */
// The bartender pours a free cocktail; the buzz system takes it from there.
const orderCocktail = () => drink("cocktail");

export function Pulse({
  onPick,
  onGame,
  onDrink = orderCocktail,
}: {
  onPick: PickHandler;
  onGame: (game: MinigameId) => void;
  onDrink?: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#05010a"]} />
      <fog attach="fog" args={["#14032a", 10, 26]} />
      <ClubLights />
      <Beams beams={BEAMS} aim={[0, 0.5]} />
      <Floor
        width={13}
        depth={14}
        center={[0, 0.5]}
        color="#1d0b2a"
        onPick={onPick}
      />
      <PortalPads room={ROOMS.pulse} color="#ff4fb3" />
      <Walls />
      <LedFloor
        center={[DANCE.x, DANCE.y]}
        colors={["#ff2f9a", "#9b5cff", "#3fe0d0", "#ffb02e"]}
      />
      <DjBooth />
      <MirrorBall />
      <Podiums />
      <Bar />
      <Booths />
      <CoatCheck />
      <PulseNpcs onDrink={onDrink} />
      {hotspotsIn("pulse").map((spot) => (
        <GamePad key={spot.id} spot={spot} onGame={onGame} />
      ))}
    </>
  );
}
