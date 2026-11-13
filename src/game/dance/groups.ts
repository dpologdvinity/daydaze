// The Dance picker's styles: every dance the player can pick sits in exactly
// one group (a test checks), so the menu shows a row of styles and only the
// chosen style's moves, not a hundred chips at once. Pure.

import {
  PICKER_DANCE_MOVES,
  type DanceMove,
  type DanceMoveId,
} from "./moves.ts";

export type DanceGroup = {
  id: string;
  label: string;
  /** Its dances, in menu order (ids; DanceGroupId below types the group). */
  ids: readonly string[];
};

export const DANCE_GROUPS = [
  {
    id: "club",
    label: "Club",
    ids: [
      "groove",
      "hip-sway",
      "shimmy",
      "two-step",
      "body-roll",
      "y2k-shuffle",
      "hair-flip",
      "voguing",
      "twerk",
      "slow-dance",
      "house",
      "house-3",
      "house-4",
      "shuffle",
      "shy-sway",
      "dance-ual",
    ],
  },
  {
    id: "hip-hop",
    label: "Hip-hop",
    ids: [
      "hip-hop",
      "side-to-side",
      "body-wave",
      "arm-wave",
      "kick-step",
      "raise-the-roof",
      "running-man",
      "running-man-2",
      "hip-shimmy",
      "rib-pops",
      "slide-step",
      "step-hop",
      "booty-step",
      "arms-hop",
    ],
  },
  {
    id: "street",
    label: "Street",
    ids: [
      "robot",
      "locking",
      "boogaloo",
      "moonwalk",
      "moonwalk-slide",
      "snake",
      "quake",
      "tut",
      "tut-2",
      "slide-hop",
      "wave-hop",
      "wave-hop-2",
      "wave-arms",
    ],
  },
  {
    id: "break",
    label: "Breaking",
    ids: [
      "breakdance",
      "headspin",
      "bboy",
      "bboy-2",
      "uprock",
      "uprock-indian",
      "uprock-brooklyn",
      "uprock-var",
      "uprock-footwork",
      "footwork",
      "footwork-2",
      "footwork-3",
    ],
  },
  {
    id: "latin",
    label: "Latin",
    ids: [
      "salsa",
      "salsa-turns",
      "salsa-solo",
      "salsa-clap",
      "salsa-up-back",
      "lambada",
      "rumba",
    ],
  },
  {
    id: "world",
    label: "Samba and world",
    ids: [
      "samba",
      "pagode",
      "samba-reggae",
      "samba-parade",
      "samba-enredo",
      "samba-ijexa",
      "samba-olodum",
      "samba-gandy",
      "afrobeat",
      "rainbow",
      "belly-dance",
      "belly-sway",
    ],
  },
  {
    id: "swing",
    label: "Swing and stage",
    ids: [
      "charleston",
      "charleston-2",
      "crazy-legs",
      "shim-sham",
      "shim-sham-2",
      "jazz-square",
      "expressive",
      "arm-push",
      "rockette-kick",
      "can-can",
      "northern-soul",
      "soul-spin",
      "maraschino",
      "ballet",
      "ballet-2",
    ],
  },
  {
    id: "party",
    label: "Party",
    ids: [
      "macarena",
      "ymca",
      "gangnam",
      "chicken-dance",
      "hokey-pokey",
      "the-twist",
      "twist-dance",
      "cabbage-patch",
      "shopping-cart",
      "thriller",
      "thriller-2",
      "thriller-3",
      "thriller-4",
    ],
  },
] as const satisfies readonly DanceGroup[];

export type DanceGroupId = (typeof DANCE_GROUPS)[number]["id"];

/** The group a dance is in, or undefined for one that is not in the picker. */
export function groupOf(id: string): DanceGroupId | undefined {
  return DANCE_GROUPS.find((g) => (g.ids as readonly string[]).includes(id))
    ?.id;
}

/** A group's moves, in its menu order. */
export function movesOfGroup(group: DanceGroupId): readonly DanceMove[] {
  const ids: readonly string[] =
    DANCE_GROUPS.find((g) => g.id === group)?.ids ?? [];
  return ids.flatMap((id) => {
    const m = PICKER_DANCE_MOVES.find((x) => x.id === id);
    return m ? [m] : [];
  });
}

/** The group the picker opens on for the move in play (the first when none). */
export function groupForMove(id: DanceMoveId): DanceGroupId {
  return groupOf(id) ?? DANCE_GROUPS[0].id;
}
