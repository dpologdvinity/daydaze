import type { JSX } from "react";
import type { Look } from "../../../game/look.ts";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";
import { BAR_X, DJ_BOOTH, PODIUM_TOP, PODIUMS } from "./layout.ts";

const CONTEXT: DialogueContext = {
  venue: "pulse",
  neighborhood: "nightlife-row",
};

const DJ_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "waves",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-sculpted-espresso",
  outfit: "fur",
  outfitColor: "#9b5cff",
  shadow: "#7b4dff",
};

const BARTENDER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "buns",
  hairColor: "#f1d78f",
  lips: "lips-burgundy-cherry",
  brows: "brows-feathered-honey",
  outfit: "mini",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

const BOUNCER_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "ponytail",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-y2k-thin",
  outfit: "flares",
  outfitColor: "#141018",
  shadow: "#7b4dff",
};

const COAT_CHECK_LOOK: Look = {
  skin: "#f3d4c4",
  hairStyle: "waves",
  hairColor: "#ff4fb3",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "mini",
  outfitColor: "#ff2f9a",
  shadow: "#ff2f9a",
};

const DANCER_LOOKS: readonly { name: string; look: Look }[] = [
  {
    name: "Kiki",
    look: {
      skin: "#e6b48e",
      hairStyle: "buns",
      hairColor: "#7b4dff",
      lips: "lips-hot-pink-glam",
      brows: "brows-fox-snatched",
      outfit: "fur",
      outfitColor: "#e8e2ff",
      shadow: "#7b4dff",
    },
  },
  {
    name: "Tana",
    look: {
      skin: "#c48d68",
      hairStyle: "waves",
      hairColor: "#7b4dff",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-feathered-honey",
      outfit: "mini",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
  },
];

const REGULAR_LOOK: Look = {
  skin: "#f3d4c4",
  hairStyle: "ponytail",
  hairColor: "#b77a3e",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "fur",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

/** Pulse's staff and dancers. `onDrink` is the hook the bartender's tap calls; see Pulse. */
export function PulseNpcs({ onDrink }: { onDrink?: () => void }): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Dez"
        role="dj"
        figure="crowd"
        look={DJ_LOOK}
        mood="dance"
        at={[DJ_BOOTH.x, 0, -6.3]}
        rot={0}
        seed={21}
        context={CONTEXT}
      />
      <TalkingNpc
        name="Lou"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="idle"
        at={[BAR_X - 0.45, 0, 0.2]}
        rot={Math.PI / 2}
        seed={22}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      <TalkingNpc
        name="Bree"
        role="bouncer"
        look={BOUNCER_LOOK}
        mood="idle"
        at={[2.4, 0, 6.2]}
        rot={Math.PI}
        seed={23}
        greet
        context={CONTEXT}
      />
      <TalkingNpc
        name="Juno"
        role="coat-check"
        figure="crowd"
        look={COAT_CHECK_LOOK}
        mood="idle"
        at={[-4.9, 0, 6.55]}
        rot={Math.PI}
        seed={24}
        context={CONTEXT}
      />
      {DANCER_LOOKS.map((dancer, i) => {
        const p = PODIUMS[i];
        return (
          <TalkingNpc
            key={dancer.name}
            name={dancer.name}
            role="club-dancer"
            figure="crowd"
            look={dancer.look}
            mood="dance"
            at={[p.x, PODIUM_TOP, p.z]}
            rot={0}
            seed={25 + i}
            context={CONTEXT}
          />
        );
      })}
      <TalkingNpc
        name="Mo"
        role="regular"
        figure="crowd"
        look={REGULAR_LOOK}
        mood="lean"
        at={[4.6, 0, -2.4]}
        rot={-Math.PI / 2}
        seed={27}
        context={CONTEXT}
      />
    </>
  );
}
