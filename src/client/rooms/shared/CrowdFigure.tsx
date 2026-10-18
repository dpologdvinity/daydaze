import type { DanceMoveId } from "../../../game/dance/moves.ts";
import type { Look } from "../../../game/look.ts";
import { Doll } from "../../avatar/Doll.tsx";

/**
 * A background figure: the full 3D doll, dancing or idling. Far from the
 * camera the doll drops to its low-poly body, so a club crowd costs a few
 * draw calls each. Once a cheap stand-in for the 60-call toon doll; the props
 * stay so every crowd scene keeps working.
 */
export function CrowdFigure({
  look,
  dance = false,
  move,
  seed = 0,
}: {
  look: Look;
  dance?: boolean;
  /** The move to loop (a dance or an emote such as "clap"); it dances when set. */
  move?: DanceMoveId;
  seed?: number;
}) {
  return (
    <Doll
      look={look}
      mood={dance || move ? "dance" : "idle"}
      dance={move}
      seed={seed}
    />
  );
}
