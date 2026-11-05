// Orbit 9's cast: Vesper on the airlock, Nova behind the soda bar (a tap pours
// a drink), DJ Kepler on the stage, two regulars and four non-talking dancers.
// Positions come from the layout in src/game/orbit.ts.

import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import { BAR, DANCE, LOUNGE_CHAIRS, STAGE } from "../../../game/orbit.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "orbit",
  neighborhood: "arts-district",
};

const ATTENDANT_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "pixie",
  hairColor: "#7b4dff",
  lips: "lips-chrome-berry",
  brows: "brows-sculpted-espresso",
  outfit: "tracksuit-y2k",
  outfitColor: "#e8e2ff",
  shadow: "#3fe0d0",
};

const BARTENDER_LOOK: Look = {
  skin: "#f3d4c4",
  hairStyle: "pigtails",
  hairColor: "#7ee8a2",
  lips: "lips-blue-raspberry-gloss",
  brows: "brows-y2k-thin",
  outfit: "cargo-crop",
  outfitColor: "#9b5cff",
  shadow: "#2e7dff",
};

const DJ_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "afro",
  hairColor: "#ff4fb3",
  lips: "lips-hot-pink-glam",
  brows: "brows-fox-snatched",
  outfit: "sequin-slip",
  outfitColor: "#e8e2ff",
  shadow: "#d23cff",
};

const REGULARS: readonly {
  name: string;
  look: Look;
  at: [number, number, number];
  rot: number;
  mood: "idle" | "lean";
}[] = [
  {
    name: "Juno",
    look: {
      skin: "#633c29",
      hairStyle: "braids",
      hairColor: "#7ee8a2",
      lips: "lips-plum-noir",
      brows: "brows-y2k-thin",
      outfit: "hoodie-bikers",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    at: [LOUNGE_CHAIRS[1].at[0] + 0.2, 0, LOUNGE_CHAIRS[1].at[1] - 0.8],
    rot: Math.PI,
    mood: "lean",
  },
  {
    name: "Ziggy",
    look: {
      skin: "#e6b48e",
      hairStyle: "long-straight",
      hairColor: "#b77a3e",
      lips: "lips-coral-pop",
      brows: "brows-sculpted-espresso",
      outfit: "puffer",
      outfitColor: "#141018",
      shadow: "#ffb02e",
    },
    at: [BAR.front - 0.9, 0, BAR.z1 + 0.6],
    rot: Math.PI / 2,
    mood: "lean",
  },
];

/** Dancers on the LED floor. */
const CROWD: readonly { look: Look; at: [number, number]; rot: number }[] = [
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "buns",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-feathered-honey",
      outfit: "baby-tee-mini",
      outfitColor: "#3fe0d0",
      shadow: "#7b4dff",
    },
    at: [DANCE[0] - 1.8, DANCE[1] + 0.2],
    rot: 0.5,
  },
  {
    look: {
      skin: "#94603f",
      hairStyle: "afro",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "flares",
      outfitColor: "#9b5cff",
      shadow: "#ff2f9a",
    },
    at: [DANCE[0] + 1.6, DANCE[1] - 0.5],
    rot: -0.5,
  },
  {
    look: {
      skin: "#e6b48e",
      hairStyle: "mid-wavy",
      hairColor: "#7b4dff",
      lips: "lips-nude-pink-gloss",
      brows: "brows-fox-snatched",
      outfit: "shorts",
      outfitColor: "#ff2f9a",
      shadow: "#3fe0d0",
    },
    at: [DANCE[0] + 0.3, DANCE[1] + 1.5],
    rot: Math.PI,
  },
  {
    look: {
      skin: "#c48d68",
      hairStyle: "pixie",
      hairColor: "#3a6bff",
      lips: "lips-mauve-velvet",
      brows: "brows-y2k-thin",
      outfit: "mini",
      outfitColor: "#e8e2ff",
      shadow: "#2e7dff",
    },
    at: [DANCE[0] - 0.4, DANCE[1] - 1.3],
    rot: 0.2,
  },
];

/** Orbit 9's airlock, bar, stage, regulars and the crowd on the floor.
 * `onDrink` is what the bartender's tap pours; see Orbit. */
export function OrbitNpcs({ onDrink }: { onDrink?: () => void }): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Vesper"
        role="bouncer"
        look={ATTENDANT_LOOK}
        mood="idle"
        at={[2.4, 0, 6.2]}
        rot={Math.PI}
        seed={191}
        greet
        context={CONTEXT}
      />
      <TalkingNpc
        name="Nova"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="dance"
        dance="bartending"
        at={[BAR.back + 0.05 - 0.45, 0, (BAR.z0 + BAR.z1) / 2 - 0.2]}
        rot={-Math.PI / 2}
        seed={192}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      <TalkingNpc
        name="DJ Kepler"
        role="dj"
        look={DJ_LOOK}
        mood="dance"
        at={[0.9, STAGE.height, -6.3]}
        rot={0}
        seed={193}
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
          seed={194 + i}
          context={CONTEXT}
        />
      ))}
      {CROWD.map((c, i) => (
        <group key={i} position={[c.at[0], 0, c.at[1]]} rotation-y={c.rot}>
          <CrowdFigure look={c.look} dance seed={196 + i} />
        </group>
      ))}
    </>
  );
}
