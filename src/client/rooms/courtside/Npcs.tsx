// The Courtside Club's people: the umpire by the net and Margaux, the attendant
// at the door.

import type { JSX } from "react";
import { BENCH_X, FLOOR_BOUNDS } from "../../../game/courtside.ts";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "courtside",
  neighborhood: "uptown",
};

const ATTENDANT_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "ponytail",
  hairColor: "#b77a3e",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "blouse",
  outfitColor: "#e8e2ff",
  shadow: "#3fe0d0",
};

const UMPIRE_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "sleek-bob",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#2e7dff",
};

/** The umpire up by the net, and the club attendant at the door. */
export function CourtsideNpcs(): JSX.Element {
  return (
    <>
      <group position={[BENCH_X - 0.6, 0, 0.9]} rotation-y={-Math.PI / 2}>
        <CrowdFigure look={UMPIRE_LOOK} seed={262} />
      </group>
      <TalkingNpc
        name="Margaux"
        role="ticket-cashier"
        look={ATTENDANT_LOOK}
        mood="idle"
        at={[FLOOR_BOUNDS.x1 - 1, 0, FLOOR_BOUNDS.z1 - 1.2]}
        rot={-Math.PI / 2}
        seed={263}
        greet
        context={CONTEXT}
      />
    </>
  );
}
