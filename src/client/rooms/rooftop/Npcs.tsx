import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look, Mood } from "../../../game/look.ts";
import { BAR, DJ_BOOTH, FIRE, HIGH_TABLES } from "../../../game/rooftop.ts";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "rooftop-bar",
  neighborhood: "nightlife-row",
};

const HOST_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "bob",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#2e7dff",
};

const BARTENDER_LOOK: Look = {
  skin: "#f3d4c4",
  hairStyle: "ponytail",
  hairColor: "#b77a3e",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "mini",
  outfitColor: "#141018",
  shadow: "#ffb02e",
};

const DJ_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "long-curly",
  hairColor: "#ff4fb3",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "jeans",
  outfitColor: "#3fe0d0",
  shadow: "#d23cff",
};

const REGULARS: readonly {
  name: string;
  look: Look;
  at: [number, number, number];
  rot: number;
  mood: Mood;
}[] = [
  {
    name: "Mika",
    look: {
      skin: "#e6b48e",
      hairStyle: "waves",
      hairColor: "#1b1014",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-fox-snatched",
      outfit: "mini",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
    at: [HIGH_TABLES[0][0] - 0.6, 0, HIGH_TABLES[0][1]],
    rot: Math.PI / 2,
    mood: "lean",
  },
  {
    name: "Lou",
    look: {
      skin: "#c48d68",
      hairStyle: "pixie",
      hairColor: "#7ee8a2",
      lips: "lips-nude-pink-gloss",
      brows: "brows-sculpted-espresso",
      outfit: "flares",
      outfitColor: "#9b5cff",
      shadow: "#7b4dff",
    },
    at: [HIGH_TABLES[0][0] + 0.6, 0, HIGH_TABLES[0][1]],
    rot: -Math.PI / 2,
    mood: "idle",
  },
  {
    name: "Tess",
    look: {
      skin: "#f3d4c4",
      hairStyle: "mid-wavy",
      hairColor: "#f1d78f",
      lips: "lips-hot-pink-glam",
      brows: "brows-feathered-honey",
      outfit: "blouse",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    // warming her hands at the fire
    at: [FIRE[0] + 0.9, 0, FIRE[1]],
    rot: -Math.PI / 2,
    mood: "idle",
  },
  {
    name: "Juno",
    look: {
      skin: "#633c29",
      hairStyle: "afro",
      hairColor: "#4a2a1c",
      lips: "lips-burgundy-cherry",
      brows: "brows-y2k-thin",
      outfit: "shorts",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    // dancing in front of the decks
    at: [(DJ_BOOTH.x0 + DJ_BOOTH.x1) / 2 - 0.4, 0, DJ_BOOTH.z1 + 1.4],
    rot: Math.PI,
    mood: "dance",
  },
];

/** The Skylark's host at the elevator, the bartender, the DJ and the regulars.
 * `onDrink` is what the bartender's tap pours; see RooftopBar. */
export function SkylarkNpcs({
  onDrink,
}: {
  onDrink?: () => void;
}): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Noor"
        role="bouncer"
        look={HOST_LOOK}
        mood="idle"
        at={[-4.3, 0, 5.6]}
        rot={Math.PI}
        seed={61}
        greet
        context={CONTEXT}
      />
      <TalkingNpc
        name="Bea"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="dance"
        dance="bartending"
        at={[(BAR.x0 + BAR.x1) / 2, 0, -5.45]}
        rot={0}
        seed={62}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      <TalkingNpc
        name="DJ Vesper"
        role="dj"
        look={DJ_LOOK}
        mood="dance"
        at={[(DJ_BOOTH.x0 + DJ_BOOTH.x1) / 2, 0, DJ_BOOTH.z0 - 0.45]}
        rot={0}
        seed={63}
        context={CONTEXT}
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
          seed={64 + i}
          context={CONTEXT}
        />
      ))}
    </>
  );
}
