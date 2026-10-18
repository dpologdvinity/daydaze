import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import { BAR, BENCH_X, CONTAINER, DANCE } from "../../../game/warehouse.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "warehouse",
  neighborhood: "nightlife-row",
};

const BOUNCER_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "pixie",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#8a5a3c",
};

const BARTENDER_LOOK: Look = {
  skin: "#f3d4c4",
  hairStyle: "mid-straight",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-y2k-thin",
  outfit: "shorts",
  outfitColor: "#141018",
  shadow: "#d23cff",
};

const DJ_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "bob",
  hairColor: "#7ee8a2",
  lips: "lips-nude-pink-gloss",
  brows: "brows-fox-snatched",
  outfit: "fur",
  outfitColor: "#141018",
  shadow: "#2e7dff",
};

const REGULARS: readonly {
  name: string;
  look: Look;
  at: [number, number, number];
  rot: number;
}[] = [
  {
    name: "Wren",
    look: {
      skin: "#633c29",
      hairStyle: "braids",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "mini",
      outfitColor: "#141018",
      shadow: "#ff2f9a",
    },
    at: [BENCH_X - 0.9, 0, 0.7],
    rot: -Math.PI / 2,
  },
  {
    name: "Sasha",
    look: {
      skin: "#c48d68",
      hairStyle: "long-straight",
      hairColor: "#4a2a1c",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-sculpted-espresso",
      outfit: "jeans",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    at: [BAR.front + 0.9, 0, BAR.z1 + 0.5],
    rot: -Math.PI / 2,
  },
];

/** Dancers under the trusses. */
const CROWD: readonly { look: Look; at: [number, number]; rot: number }[] = [
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "ponytail",
      hairColor: "#1b1014",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "shorts",
      outfitColor: "#141018",
      shadow: "#7b4dff",
    },
    at: [DANCE[0] - 1.5, DANCE[1] + 0.3],
    rot: 0.4,
  },
  {
    look: {
      skin: "#94603f",
      hairStyle: "afro",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "flares",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    at: [DANCE[0] + 1.4, DANCE[1] - 0.4],
    rot: -0.4,
  },
  {
    look: {
      skin: "#e6b48e",
      hairStyle: "mid-wavy",
      hairColor: "#7b4dff",
      lips: "lips-hot-pink-glam",
      brows: "brows-fox-snatched",
      outfit: "mini",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    at: [DANCE[0] + 0.2, DANCE[1] + 1.4],
    rot: Math.PI,
  },
];

/** Bassline's door, bar, decks, its regulars and the crowd on the floor.
 * `onDrink` is what the bartender's tap pours; see Warehouse. */
export function WarehouseNpcs({
  onDrink,
}: {
  onDrink?: () => void;
}): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Ash"
        role="bouncer"
        look={BOUNCER_LOOK}
        mood="idle"
        at={[2.2, 0, 5.8]}
        rot={Math.PI}
        seed={91}
        greet
        context={CONTEXT}
      />
      <TalkingNpc
        name="Ren"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="dance"
        dance="bartending"
        at={[BAR.back + 0.35, 0, (BAR.z0 + BAR.z1) / 2]}
        rot={Math.PI / 2}
        seed={92}
        situation="action-ordering"
        context={CONTEXT}
        onTap={onDrink}
      />
      <TalkingNpc
        name="DJ Static"
        role="dj"
        look={DJ_LOOK}
        mood="dance"
        at={[0, 0, CONTAINER.z0 + 0.7]}
        rot={0}
        seed={93}
        context={CONTEXT}
      />
      {REGULARS.map((regular, i) => (
        <TalkingNpc
          key={regular.name}
          name={regular.name}
          role="regular"
          figure="crowd"
          look={regular.look}
          mood="lean"
          at={regular.at}
          rot={regular.rot}
          seed={94 + i}
          context={CONTEXT}
        />
      ))}
      {CROWD.map((c, i) => (
        <group key={i} position={[c.at[0], 0, c.at[1]]} rotation-y={c.rot}>
          <CrowdFigure look={c.look} dance seed={96 + i} />
        </group>
      ))}
    </>
  );
}
