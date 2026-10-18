import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import { BAR, BENCH_SEATS, DOCK, YACHTS } from "../../../game/marina.ts";
import { drink } from "../../effects/drunk.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "marina",
  neighborhood: "beachside",
};

const BARTENDER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "sleek-bob",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#e8e2ff",
  shadow: "#3fe0d0",
};

const DOCKHAND_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "low-pony",
  hairColor: "#4a2a1c",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "shorts",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

/** The party on the Golden Hour's deck. */
const PARTY: readonly Look[] = (
  [
    ["#f3d4c4", "mermaid", "#f1d78f", "sequin-slip", "#ffb02e"],
    ["#633c29", "coils", "#1b1014", "mini", "#ff2f9a"],
  ] as const
).map(([skin, hairStyle, hairColor, outfit, outfitColor]) => ({
  skin,
  hairStyle,
  hairColor,
  outfit,
  outfitColor,
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  shadow: "#ffd1f0",
}));

/** The yacht club's bartender, a dockhand on the long dock and a little
 * party dancing on the biggest yacht's deck. */
export function MarinaNpcs(): JSX.Element {
  const golden = YACHTS[1];
  return (
    <>
      <TalkingNpc
        name="Coral"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="dance"
        dance="bartending"
        at={[(BAR.x0 + BAR.x1) / 2, 0, BAR.z0 - 0.6]}
        rot={0}
        seed={251}
        situation="action-ordering"
        context={CONTEXT}
        onTap={() => drink("cocktail")}
      />
      <TalkingNpc
        name="Nalu"
        role="regular"
        look={DOCKHAND_LOOK}
        mood="idle"
        at={[DOCK.x1 - 0.4, 0, -2]}
        rot={-Math.PI / 2}
        seed={252}
        greet
        context={CONTEXT}
      />
      {PARTY.map((look, i) => (
        <group
          key={i}
          // up on the yacht's foredeck, a little above the water
          position={[golden.at[0] + (i ? 0.6 : -0.6), 0.45, golden.at[1] - 2.6]}
          rotation-y={i ? -0.6 : 0.6}
        >
          <CrowdFigure look={look} dance seed={253 + i} />
        </group>
      ))}
      {/* a regular out on the benches, watching the boats */}
      <group position={[BENCH_SEATS[3][0], 0, BENCH_SEATS[3][1] - 0.9]}>
        <CrowdFigure look={PARTY[1]} seed={256} />
      </group>
    </>
  );
}
