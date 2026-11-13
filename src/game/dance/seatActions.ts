// What a seated doll does with her hands: the emote she picked in its seated
// take (clap, cheer, fist pump, laugh, point), else the table or desk idle
// her seat asks for, else the pose she chose. Pure; PlayerController passes
// the result to her doll as her held pose (clips.ts plays "seat" holds).

/** Standing emote id -> the seated clip that stands in for it. */
export const SEATED_EMOTE: Readonly<Record<string, string>> = {
  clap: "seat-clap",
  cheer: "seat-cheer",
  "cheer-head-bang": "seat-cheer",
  excited: "seat-cheer",
  "fist-pump": "seat-fist-pump",
  "fist-pump-big": "seat-fist-pump",
  victory: "seat-victory",
  rally: "seat-yell",
  laugh: "seat-laugh",
  point: "seat-point",
  "point-big": "seat-point",
  surprised: "seat-disbelief",
  chatting: "seat-talk",
  "talk-two-hands": "seat-talk-2",
  "happy-hands": "seat-talk-2",
};

/**
 * The held clip for a seated doll. `picked` is her chosen sit pose ("built"
 * for none), `seatHold` the seat's own idle (the cafe table, the desk).
 */
export function seatedHold(s: {
  mood: string;
  dance: string;
  picked: string;
  seatHold?: string;
}): string {
  if (s.mood === "dance") {
    const emote = SEATED_EMOTE[s.dance];
    if (emote) return emote;
  }
  if (s.picked !== "built") return s.picked;
  return s.seatHold ?? "built";
}
