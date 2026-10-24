// Kamayan Hall's people: Tess the server (a tap hands over the next dish), Lola
// Nena at the head of the boodle table, Tita Joy on the videoke and the seated
// family. The diners' seats must stay in kamayanHall's DINER_SEATS so the
// player isn't offered them.

import { useRef, type JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { FoodVenue } from "../../../game/food/venues.ts";
import { SERVER, TABLE_SEATS, VIDEOKE } from "../../../game/kamayanHall.ts";
import type { Look } from "../../../game/look.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { holdItem } from "../../food/store.ts";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "kamayan-hall",
  neighborhood: "little-manila",
};

/** A bench seat's height, less where a sitting doll's thighs come to. */
const SEAT_Y = 0.45 - 0.48;

const SERVER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "ponytail",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#e8e2ff",
  shadow: "#ffd1f0",
};

const LOLA_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "top-knot",
  hairColor: "#f1d78f",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#ff2f9a",
  shadow: "#8a5a3c",
};

const SINGER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "mermaid",
  hairColor: "#4a2a1c",
  lips: "lips-hot-pink-glam",
  brows: "brows-fox-snatched",
  outfit: "sequin-slip",
  outfitColor: "#ffb02e",
  shadow: "#ffb02e",
};

/** Family and friends round the boodle table, by bench seat index; these
 * seats are listed in DINER_SEATS so the player isn't offered them. */
const DINERS: readonly { seat: number; look: Look }[] = [
  {
    seat: 3,
    look: {
      skin: "#e6b48e",
      hairStyle: "bob",
      hairColor: "#1b1014",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "jeans",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
  },
  {
    seat: 5,
    look: {
      skin: "#633c29",
      hairStyle: "shag",
      hairColor: "#4a2a1c",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-sculpted-espresso",
      outfit: "shorts",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
  },
  {
    seat: 12,
    look: {
      skin: "#c48d68",
      hairStyle: "long-straight",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-y2k-thin",
      outfit: "mini",
      outfitColor: "#9b5cff",
      shadow: "#7b4dff",
    },
  },
  {
    seat: 16,
    look: {
      skin: "#f3d4c4",
      hairStyle: "pigtails",
      hairColor: "#b77a3e",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "baby-tee-mini",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
  },
];

/** A seated doll's turn to face the table from seat `i`. */
function faceTable(i: number): number {
  const { at, facing } = TABLE_SEATS[i];
  return Math.atan2(facing[0] - at[0], facing[1] - at[1]);
}

/** The server (tap her for the next dish), Lola at the table's head, the
 * family round the leaves and a tita on the videoke. */
export function KamayanNpcs({ venue }: { venue: FoodVenue }): JSX.Element {
  const next = useRef(0);
  const serve = () => {
    holdItem(venue.menu[next.current % venue.menu.length]);
    next.current += 1;
  };
  const lola = TABLE_SEATS[9];
  return (
    <>
      <TalkingNpc
        name="Tess"
        role="server"
        look={SERVER_LOOK}
        mood="idle"
        at={[SERVER[0], 0, SERVER[1]]}
        rot={Math.PI / 2}
        seed={171}
        greet
        situation="action-ordering"
        context={CONTEXT}
        onTap={serve}
      />
      <TalkingNpc
        name="Lola Nena"
        role="regular"
        look={LOLA_LOOK}
        mood="sit"
        at={[lola.at[0], SEAT_Y, lola.at[1]]}
        rot={faceTable(9)}
        seed={172}
        context={CONTEXT}
      />
      <TalkingNpc
        name="Tita Joy"
        role="regular"
        look={SINGER_LOOK}
        mood="dance"
        at={[VIDEOKE[0] - 1.6, 0, VIDEOKE[1] - 1.3]}
        rot={Math.PI * 0.85}
        seed={173}
        context={CONTEXT}
      />
      {DINERS.map((d) => {
        const { at } = TABLE_SEATS[d.seat];
        return (
          <group
            key={d.seat}
            position={[at[0], SEAT_Y, at[1]]}
            rotation-y={faceTable(d.seat)}
          >
            <Doll look={d.look} mood="sit" seed={174 + d.seat} />
          </group>
        );
      })}
    </>
  );
}
