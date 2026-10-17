import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import { BAR, DANCE, STAGE } from "../../../game/laNoche.ts";
import type { Look } from "../../../game/look.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "la-noche",
  neighborhood: "nightlife-row",
};

const BOUNCER_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "ponytail",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#8a5a3c",
};

const BARTENDER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "long-curly",
  hairColor: "#4a2a1c",
  lips: "lips-burgundy-cherry",
  brows: "brows-fox-snatched",
  outfit: "mini",
  outfitColor: "#ff2f9a",
  shadow: "#ffb02e",
};

const SINGER_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "waves",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "sequin-slip",
  outfitColor: "#ff2f9a",
  shadow: "#ffb02e",
};

/** The band behind the singer: congas stage left, keys stage right. */
const BAND: readonly { look: Look; at: [number, number] }[] = [
  {
    look: {
      skin: "#633c29",
      hairStyle: "braids",
      hairColor: "#1b1014",
      lips: "lips-nude-pink-gloss",
      brows: "brows-sculpted-espresso",
      outfit: "jeans",
      outfitColor: "#141018",
      shadow: "#8a5a3c",
    },
    at: [-2.6, (STAGE.z0 + STAGE.z1) / 2 + 0.45],
  },
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "bob",
      hairColor: "#b77a3e",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "blouse",
      outfitColor: "#e8e2ff",
      shadow: "#ffd1f0",
    },
    at: [2.6, (STAGE.z0 + STAGE.z1) / 2 + 0.3],
  },
];

/** Couples and dancers on the floor. */
const DANCERS: readonly { look: Look; at: [number, number]; rot: number }[] = [
  {
    look: {
      skin: "#94603f",
      hairStyle: "mid-curly",
      hairColor: "#1b1014",
      lips: "lips-hot-pink-glam",
      brows: "brows-fox-snatched",
      outfit: "flares",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
    at: [DANCE[0] - 0.9, DANCE[1] - 0.4],
    rot: Math.PI / 2,
  },
  {
    look: {
      skin: "#e6b48e",
      hairStyle: "ponytail",
      hairColor: "#4a2a1c",
      lips: "lips-burgundy-cherry",
      brows: "brows-y2k-thin",
      outfit: "mini",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    at: [DANCE[0] - 0.1, DANCE[1] - 0.4],
    rot: -Math.PI / 2,
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "long-straight",
      hairColor: "#1b1014",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-sculpted-espresso",
      outfit: "sequin-slip",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    at: [DANCE[0] + 1.3, DANCE[1] + 0.9],
    rot: Math.PI,
  },
];

/** La Noche's door, bar, band, singer and the dancers on its floor.
 * `onDrink` is what the bartender's tap pours; see LaNoche. */
export function LaNocheNpcs({
  onDrink,
}: {
  onDrink?: () => void;
}): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Inés"
        role="bouncer"
        look={BOUNCER_LOOK}
        mood="idle"
        at={[2.2, 0, 5.4]}
        rot={Math.PI}
        seed={131}
        greet
        context={CONTEXT}
      />
      <TalkingNpc
        name="Yara"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="idle"
        at={[(BAR.back + 6.2) / 2, 0, (BAR.z0 + BAR.z1) / 2]}
        rot={-Math.PI / 2}
        seed={132}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      <TalkingNpc
        name="Celia"
        role="club-dancer"
        look={SINGER_LOOK}
        mood="dance"
        at={[0, STAGE.height, STAGE.z1 - 0.15]}
        rot={0}
        seed={133}
        context={CONTEXT}
      />
      {BAND.map((m, i) => (
        <group
          key={i}
          position={[m.at[0], STAGE.height, m.at[1]]}
          rotation-y={m.at[0] < 0 ? 0.3 : -0.3}
        >
          <CrowdFigure look={m.look} dance seed={134 + i} />
        </group>
      ))}
      {DANCERS.map((d, i) => (
        <group key={i} position={[d.at[0], 0, d.at[1]]} rotation-y={d.rot}>
          <CrowdFigure look={d.look} dance seed={137 + i} />
        </group>
      ))}
    </>
  );
}
