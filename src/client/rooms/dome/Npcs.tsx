import type { JSX } from "react";
import { BENCH_X, COURT } from "../../../game/dome.ts";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = { venue: "dome", neighborhood: "fairground" };

const VENDOR_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "top-knot",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "tracksuit-y2k",
  outfitColor: "#ffb02e",
  shadow: "#ffb02e",
};

/** Dancers working the baseline between plays. */
const DANCERS: readonly { look: Look; at: [number, number] }[] = [
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "pigtails",
      hairColor: "#f1d78f",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "baby-tee-mini",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    at: [-6.4, -2.8],
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "coils",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-fox-snatched",
      outfit: "baby-tee-mini",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    at: [6.4, -2.8],
  },
];

/** The Dome's snack seller courtside, and dancers on the baseline. */
export function DomeNpcs(): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Bree"
        role="snack-cashier"
        look={VENDOR_LOOK}
        mood="idle"
        at={[BENCH_X - 0.6, 0, COURT.z1 - 1.4]}
        rot={-Math.PI / 2}
        seed={151}
        greet
        context={CONTEXT}
      />
      {DANCERS.map((d, i) => (
        <group
          key={i}
          position={[d.at[0], 0, d.at[1]]}
          rotation-y={d.at[0] < 0 ? 0.6 : -0.6}
        >
          <CrowdFigure look={d.look} dance seed={152 + i} />
        </group>
      ))}
    </>
  );
}
