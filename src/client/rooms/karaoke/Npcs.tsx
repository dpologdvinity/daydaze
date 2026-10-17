import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import { MIC, STAGE } from "../../../game/karaoke.ts";
import type { Look } from "../../../game/look.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "karaoke",
  neighborhood: "nightlife-row",
};

const HOST_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "waves",
  hairColor: "#7b4dff",
  lips: "lips-hot-pink-glam",
  brows: "brows-fox-snatched",
  outfit: "sequin-slip",
  outfitColor: "#9b5cff",
  shadow: "#d23cff",
};

const SERVER_LOOK: Look = {
  skin: "#f3d4c4",
  hairStyle: "ponytail",
  hairColor: "#4a2a1c",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#ffd1f0",
};

const SINGER_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "long-curly",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "mini",
  outfitColor: "#ff2f9a",
  shadow: "#ff2f9a",
};

/** Friends cheering the singer from the floor. */
const CROWD: readonly { look: Look; at: [number, number]; rot: number }[] = [
  {
    look: {
      skin: "#e6b48e",
      hairStyle: "bob",
      hairColor: "#f1d78f",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "jeans",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    at: [-1.4, -1.6],
    rot: Math.PI - 0.3,
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "buns",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "baby-tee-mini",
      outfitColor: "#e8e2ff",
      shadow: "#ffd1f0",
    },
    at: [1.3, -1.2],
    rot: Math.PI + 0.4,
  },
];

/** The Loft's host by the stage, a server on the floor, a singer mid-song
 * and her friends. `onDrink` is what the server's tap brings; see Karaoke. */
export function KaraokeNpcs({
  onDrink,
}: {
  onDrink?: () => void;
}): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Marisol"
        role="dj"
        look={HOST_LOOK}
        mood="idle"
        at={[STAGE.x1 + 0.7, 0, STAGE.z0 + 1]}
        rot={-Math.PI / 4}
        seed={101}
        greet
        context={CONTEXT}
      />
      <TalkingNpc
        name="Jo"
        role="server"
        look={SERVER_LOOK}
        mood="idle"
        at={[-3.2, 0, 1.2]}
        rot={Math.PI / 2}
        seed={102}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      <TalkingNpc
        name="Bel"
        role="regular"
        look={SINGER_LOOK}
        mood="dance"
        at={[MIC[0] - 1.3, STAGE.height, MIC[1]]}
        rot={0}
        seed={103}
        context={CONTEXT}
      />
      {CROWD.map((c, i) => (
        <group key={i} position={[c.at[0], 0, c.at[1]]} rotation-y={c.rot}>
          <CrowdFigure look={c.look} dance seed={104 + i} />
        </group>
      ))}
    </>
  );
}
