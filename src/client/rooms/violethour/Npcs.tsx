import type { JSX } from "react";
import type { Look, Mood } from "../../../game/look.ts";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";
import { BAR_CENTER_X, BAR_Z, CORNER_TABLE } from "./layout.ts";

const CONTEXT: DialogueContext = {
  venue: "violet-hour",
  neighborhood: "nightlife-row",
};

const BOUNCER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "ponytail",
  hairColor: "#4a2a1c",
  lips: "lips-burgundy-cherry",
  brows: "brows-y2k-thin",
  outfit: "flares",
  outfitColor: "#ffb02e",
  shadow: "#ffb02e",
};

const BARTENDER_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "waves",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "mini",
  outfitColor: "#ff2f9a",
  shadow: "#ff2f9a",
};

const REGULARS: readonly {
  name: string;
  look: Look;
  at: [number, number, number];
  rot: number;
  mood: Mood;
}[] = [
  {
    name: "Pip",
    look: {
      skin: "#f3d4c4",
      hairStyle: "buns",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-feathered-honey",
      outfit: "jeans",
      outfitColor: "#e8e2ff",
      shadow: "#7b4dff",
    },
    at: [CORNER_TABLE.x + 0.9, 0, CORNER_TABLE.z - 0.3],
    rot: Math.PI / 2,
    mood: "lean",
  },
  {
    name: "Rae",
    look: {
      skin: "#e6b48e",
      hairStyle: "waves",
      hairColor: "#7b4dff",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-fox-snatched",
      outfit: "mini",
      outfitColor: "#9b5cff",
      shadow: "#7b4dff",
    },
    at: [CORNER_TABLE.x - 0.5, 0, CORNER_TABLE.z + 0.9],
    rot: Math.PI / 2,
    mood: "idle",
  },
  {
    name: "Sol",
    look: {
      skin: "#94603f",
      hairStyle: "ponytail",
      hairColor: "#b77a3e",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "blouse",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    at: [BAR_CENTER_X + 1.2, 0, BAR_Z + 1.0],
    rot: Math.PI,
    mood: "lean",
  },
];

/** The Violet Hour's door, bar and regulars. `onDrink` is the hook the bartender's tap calls; see VioletHour. */
export function VioletNpcs({ onDrink }: { onDrink?: () => void }): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Robin"
        role="bouncer"
        look={BOUNCER_LOOK}
        mood="idle"
        at={[2.4, 0, 5.4]}
        rot={Math.PI}
        seed={31}
        greet
        context={CONTEXT}
      />
      <TalkingNpc
        name="Sam"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="idle"
        at={[BAR_CENTER_X - 0.6, 0, BAR_Z - 0.7]}
        rot={0}
        seed={32}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      {REGULARS.map((regular, i) => (
        <TalkingNpc
          key={regular.name}
          name={regular.name}
          role="regular"
          figure="crowd"
          look={regular.look}
          mood={regular.mood}
          at={regular.at}
          rot={regular.rot}
          seed={33 + i}
          context={CONTEXT}
        />
      ))}
    </>
  );
}
