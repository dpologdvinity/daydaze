// Glow Bowl's people: Dana at the shoe counter and bowlers waiting on the other
// lanes. A bowler on PLAY_LANE is skipped so the player's lane stays clear.

import type { JSX } from "react";
import {
  COUNTER,
  FOUL_Z,
  LANE_XS,
  PLAY_LANE,
} from "../../../game/bowlingAlley.ts";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = { venue: "bowling", neighborhood: "suburbia" };

const CASHIER_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "ponytail",
  hairColor: "#b77a3e",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "baby-tee-mini",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

/** Bowlers on the other lanes, waiting their turn at the approach. */
const BOWLERS: readonly {
  look: Look;
  lane: number;
  dx: number;
  dance: boolean;
}[] = [
  {
    look: {
      skin: "#633c29",
      hairStyle: "braids",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "tracksuit-y2k",
      outfitColor: "#9b5cff",
      shadow: "#d23cff",
    },
    lane: 0,
    dx: 0.2,
    dance: false,
  },
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "bob",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "jeans",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    lane: 1,
    dx: -0.3,
    dance: true,
  },
  {
    look: {
      skin: "#94603f",
      hairStyle: "mid-curly",
      hairColor: "#7b4dff",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-fox-snatched",
      outfit: "shorts",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
    lane: 3,
    dx: 0,
    dance: false,
  },
];

/** The shoe counter's cashier and bowlers waiting on the other lanes. */
export function BowlingNpcs(): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Dana"
        role="cashier"
        look={CASHIER_LOOK}
        mood="idle"
        at={[(COUNTER.x0 + COUNTER.x1) / 2, 0, COUNTER.z1 + 0.6]}
        rot={Math.PI}
        seed={111}
        greet
        context={CONTEXT}
      />
      {BOWLERS.filter((b) => b.lane !== PLAY_LANE).map((b, i) => (
        <group
          key={i}
          position={[LANE_XS[b.lane] + b.dx, 0, FOUL_Z + 1.4]}
          rotation-y={Math.PI}
        >
          <CrowdFigure look={b.look} dance={b.dance} seed={112 + i} />
        </group>
      ))}
    </>
  );
}
