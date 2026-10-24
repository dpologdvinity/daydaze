// Lagoon Links' people: Leilani the starter at the hut and two golfers waiting
// by the tees of later holes.

import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import { HOLE_XS, HUT, TEE_Z } from "../../../game/lagoonLinks.ts";
import type { Look } from "../../../game/look.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "mini-golf",
  neighborhood: "beachside",
};

const STARTER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "ponytail",
  hairColor: "#b77a3e",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "shorts",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

/** Golfers waiting by the tees of the holes you aren't on yet. */
const GOLFERS: readonly { look: Look; at: [number, number]; rot: number }[] = [
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "bob",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "baby-tee-mini",
      outfitColor: "#e8e2ff",
      shadow: "#ffd1f0",
    },
    at: [HOLE_XS[1] + 1.1, TEE_Z + 1.2],
    rot: Math.PI,
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "afro",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "jeans",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
    at: [HOLE_XS[2] - 1.2, TEE_Z + 1.4],
    rot: Math.PI - 0.4,
  },
];

/** The starter at the hut, and golfers waiting their turn. */
export function MiniGolfNpcs(): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Leilani"
        role="cashier"
        look={STARTER_LOOK}
        mood="idle"
        at={[(HUT.x0 + HUT.x1) / 2, 0, HUT.z0 - 0.6]}
        rot={Math.PI}
        seed={141}
        greet
        context={CONTEXT}
      />
      {GOLFERS.map((g, i) => (
        <group key={i} position={[g.at[0], 0, g.at[1]]} rotation-y={g.rot}>
          <CrowdFigure look={g.look} seed={142 + i} />
        </group>
      ))}
    </>
  );
}
