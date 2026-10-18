import type { JSX } from "react";
import { BAR, CABINET_XS, HOCKEY, PINBALL } from "../../../game/arcadeBar.ts";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "arcade-bar",
  neighborhood: "arts-district",
};

const BARTENDER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "pixie",
  hairColor: "#7ee8a2",
  lips: "lips-nude-pink-gloss",
  brows: "brows-y2k-thin",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#2e7dff",
};

/** Regulars at the machines: two at cabinets that aren't playable, one at
 * the pinball, two playing air hockey across the table. */
const PLAYERS: readonly {
  look: Look;
  at: [number, number];
  rot: number;
}[] = [
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "bob",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-feathered-honey",
      outfit: "baby-tee-mini",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    at: [CABINET_XS[0], -4.1],
    rot: Math.PI,
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "afro",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "tracksuit-y2k",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    at: [CABINET_XS[6], -4.1],
    rot: Math.PI,
  },
  {
    look: {
      skin: "#e6b48e",
      hairStyle: "ponytail",
      hairColor: "#4a2a1c",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-fox-snatched",
      outfit: "shorts",
      outfitColor: "#9b5cff",
      shadow: "#7b4dff",
    },
    at: [PINBALL.x1 + 0.35, -0.2],
    rot: -Math.PI / 2,
  },
  {
    look: {
      skin: "#94603f",
      hairStyle: "mid-wavy",
      hairColor: "#b77a3e",
      lips: "lips-nude-pink-gloss",
      brows: "brows-sculpted-espresso",
      outfit: "flares",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
    at: [HOCKEY[0], HOCKEY[1] - 1.35],
    rot: 0,
  },
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "long-straight",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-y2k-thin",
      outfit: "mini",
      outfitColor: "#e8e2ff",
      shadow: "#d23cff",
    },
    at: [HOCKEY[0], HOCKEY[1] + 1.35],
    rot: Math.PI,
  },
];

/** Player 2's bartender and its regulars at the machines. */
export function ArcadeNpcs({ onDrink }: { onDrink?: () => void }): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Kit"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="dance"
        dance="bartending"
        at={[(BAR.back + 6.2) / 2, 0, (BAR.z0 + BAR.z1) / 2]}
        rot={-Math.PI / 2}
        seed={121}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      {PLAYERS.map((p, i) => (
        <group key={i} position={[p.at[0], 0, p.at[1]]} rotation-y={p.rot}>
          <CrowdFigure look={p.look} seed={122 + i} />
        </group>
      ))}
    </>
  );
}
