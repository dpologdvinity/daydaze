// The Gridiron's sideline people: a cheer squad cycling through moves, the team
// by the bench (cheap CrowdFigures) and Dez, the one talking NPC, selling
// snacks.

import type { JSX } from "react";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import { BENCH_X, FIELD } from "../../../game/gridiron.ts";
import type { Look } from "../../../game/look.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "gridiron",
  neighborhood: "fairground",
};

const VENDOR_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "top-knot",
  hairColor: "#4a2a1c",
  lips: "lips-90s-caramel-ombre",
  brows: "brows-feathered-honey",
  outfit: "baby-tee-mini",
  outfitColor: "#ffb02e",
  shadow: "#ffb02e",
};

/** The cheer squad down the west sideline, in the end zone's pink. */
const SQUAD: readonly { look: Look; z: number }[] = (
  [
    { skin: "#f3d4c4", hairStyle: "pigtails", hairColor: "#f1d78f" },
    { skin: "#94603f", hairStyle: "coils", hairColor: "#1b1014" },
    { skin: "#e6b48e", hairStyle: "ponytail", hairColor: "#ff4fb3" },
    { skin: "#633c29", hairStyle: "low-pony", hairColor: "#4a2a1c" },
  ] satisfies Pick<Look, "skin" | "hairStyle" | "hairColor">[]
).map((l, i) => ({
  look: {
    ...l,
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "mini",
    outfitColor: "#ff2f9a",
    shadow: "#ff2f9a",
  },
  z: -4 + i * 1.6,
}));

/** The team waiting by the bench in the gold tracksuits. */
const TEAM: readonly Look[] = (
  [
    { skin: "#633c29", hairStyle: "braids", hairColor: "#1b1014" },
    { skin: "#e6b48e", hairStyle: "shag", hairColor: "#b77a3e" },
    { skin: "#c48d68", hairStyle: "pixie", hairColor: "#4a2a1c" },
  ] satisfies Pick<Look, "skin" | "hairStyle" | "hairColor">[]
).map((l) => ({
  ...l,
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "tracksuit-y2k",
  outfitColor: "#ffb02e",
  shadow: "#ffb02e",
}));

// the squad works the crowd: a routine, a cheer and a clap in turn
const SQUAD_MOVES = ["raise-the-roof", "cheer", "clap", "kick-step"] as const;

/** The sideline: the cheer squad dancing, the team by the bench and a snack
 * seller at the gate. */
export function GridironNpcs(): JSX.Element {
  return (
    <>
      {SQUAD.map((d, i) => (
        <group
          key={i}
          position={[FIELD.x0 + 1.2, 0, d.z]}
          rotation-y={Math.PI / 2}
        >
          <CrowdFigure
            look={d.look}
            move={SQUAD_MOVES[i % SQUAD_MOVES.length]}
            seed={171 + i}
          />
        </group>
      ))}
      {TEAM.map((look, i) => (
        <group
          key={i}
          position={[BENCH_X - 0.9, 0, 3.4 + i * 1.1]}
          rotation-y={-Math.PI / 2 - 0.3}
        >
          <CrowdFigure
            look={look}
            move={i % 2 ? "clap" : undefined}
            seed={176 + i}
          />
        </group>
      ))}
      <TalkingNpc
        name="Dez"
        role="snack-cashier"
        look={VENDOR_LOOK}
        mood="idle"
        at={[FIELD.x0 + 1.4, 0, 6.6]}
        rot={Math.PI / 2}
        seed={180}
        greet
        context={CONTEXT}
      />
    </>
  );
}
