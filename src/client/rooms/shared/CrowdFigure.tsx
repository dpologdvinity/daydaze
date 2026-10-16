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
  seed = 0,
}: {
  look: Look;
  dance?: boolean;
  seed?: number;
}) {
  return <Doll look={look} mood={dance ? "dance" : "idle"} seed={seed} />;
}
