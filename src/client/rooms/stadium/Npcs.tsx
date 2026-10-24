// Seaside Stadium's people: Mags selling snacks on the touchline and the coach
// clapping by the dugout.

import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import { DUGOUT_X, PITCH } from "../../../game/stadium.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "stadium",
  neighborhood: "fairground",
};

const VENDOR_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "ponytail",
  hairColor: "#b77a3e",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "shorts",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

const COACH_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "mid-straight",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "tracksuit-y2k",
  outfitColor: "#141018",
  shadow: "#2e7dff",
};

/** The touchline's snack seller, and the coach watching from the dugout. */
export function StadiumNpcs(): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Mags"
        role="snack-cashier"
        look={VENDOR_LOOK}
        mood="idle"
        at={[PITCH.x1 - 0.8, 0, 6.4]}
        rot={-Math.PI / 2}
        seed={161}
        greet
        context={CONTEXT}
      />
      <group position={[DUGOUT_X + 1.2, 0, -2.4]} rotation-y={Math.PI / 2}>
        <CrowdFigure look={COACH_LOOK} move="clap" seed={162} />
      </group>
    </>
  );
}
