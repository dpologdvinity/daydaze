import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import {
  BAR,
  DANCE,
  DJ,
  PODIUM_TOP,
  PODIUMS,
} from "../../../game/sugarRush.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "sugar-rush",
  neighborhood: "nightlife-row",
};

const BOUNCER_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "braids",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "tracksuit-y2k",
  outfitColor: "#141018",
  shadow: "#ff2f9a",
};

const BARTENDER_LOOK: Look = {
  skin: "#f3d4c4",
  hairStyle: "buns",
  hairColor: "#ff4fb3",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "baby-tee-mini",
  outfitColor: "#e8e2ff",
  shadow: "#ffd1f0",
};

const DJ_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "pixie",
  hairColor: "#7ee8a2",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "tracksuit-y2k",
  outfitColor: "#9b5cff",
  shadow: "#2e7dff",
};

const DANCER_LOOKS: readonly Look[] = [
  {
    skin: "#e6b48e",
    hairStyle: "long-straight",
    hairColor: "#f1d78f",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "sequin-slip",
    outfitColor: "#ff2f9a",
    shadow: "#ffd1f0",
  },
  {
    skin: "#94603f",
    hairStyle: "ponytail",
    hairColor: "#7b4dff",
    lips: "lips-90s-caramel-ombre",
    brows: "brows-fox-snatched",
    outfit: "sequin-slip",
    outfitColor: "#3fe0d0",
    shadow: "#2e7dff",
  },
];

const COAT_CHECK_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "bob",
  hairColor: "#4a2a1c",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#e8e2ff",
  shadow: "#ffd1f0",
};

/** Dancers on the LED floor, round its center. */
const CROWD: readonly { look: Look; at: [number, number]; rot: number }[] = [
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "mid-wavy",
      hairColor: "#b77a3e",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "baby-tee-mini",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    at: [DANCE[0] - 1.4, DANCE[1] - 0.6],
    rot: 0.6,
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "afro",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-y2k-thin",
      outfit: "tracksuit-y2k",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    at: [DANCE[0] + 1.3, DANCE[1] - 0.9],
    rot: -0.5,
  },
  {
    look: {
      skin: "#e6b48e",
      hairStyle: "mid-curly",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-fox-snatched",
      outfit: "mini",
      outfitColor: "#9b5cff",
      shadow: "#7b4dff",
    },
    at: [DANCE[0] + 0.4, DANCE[1] + 1.1],
    rot: Math.PI - 0.3,
  },
];

/** Sugar Rush's door, bar, decks, podium dancers and the floor's crowd.
 * `onDrink` is what the bartender's tap pours; see SugarRush. */
export function SugarRushNpcs({
  onDrink,
}: {
  onDrink?: () => void;
}): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Tash"
        role="bouncer"
        look={BOUNCER_LOOK}
        mood="idle"
        at={[2.4, 0, 5.6]}
        rot={Math.PI}
        seed={71}
        greet
        context={CONTEXT}
      />
      <TalkingNpc
        name="Kiki"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="idle"
        at={[(BAR.back + 6) / 2, 0, (BAR.z0 + BAR.z1) / 2]}
        rot={-Math.PI / 2}
        seed={72}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      <TalkingNpc
        name="DJ Glitter"
        role="dj"
        look={DJ_LOOK}
        mood="dance"
        at={[(DJ.x0 + DJ.x1) / 2, 0, DJ.z0 - 0.2]}
        rot={0}
        seed={73}
        context={CONTEXT}
      />
      {PODIUMS.map(([x, z], i) => (
        <TalkingNpc
          key={x}
          name={i ? "Nova" : "Starla"}
          role="club-dancer"
          look={DANCER_LOOKS[i]}
          mood="dance"
          at={[x, PODIUM_TOP, z]}
          rot={0}
          seed={74 + i}
          context={CONTEXT}
        />
      ))}
      <TalkingNpc
        name="Dot"
        role="coat-check"
        figure="crowd"
        look={COAT_CHECK_LOOK}
        mood="idle"
        at={[-4.4, 0, 5.4]}
        rot={Math.PI / 2}
        seed={76}
        context={CONTEXT}
      />
      {CROWD.map((c, i) => (
        <group key={i} position={[c.at[0], 0, c.at[1]]} rotation-y={c.rot}>
          <CrowdFigure look={c.look} dance seed={80 + i} />
        </group>
      ))}
    </>
  );
}
