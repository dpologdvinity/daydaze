// How a standing group of NPCs talks: who has the floor, what her hands do
// while she has it, and how the others listen, so a pair on a sidewalk or a
// huddle in a venue looks alive instead of looping in step. Time is cut into
// turns of five to ten seconds; one member speaks each turn (never the same
// two in a row) and every listener now and then reacts (a nod, a laugh, a
// shake of the head) at a moment of her own, a second or three in. A group's
// tone sets the manners: friends chat and laugh, gossips whisper, a heated
// pair argues and shakes their heads. Pure and a function of time alone, like
// idlePlan.ts: the same (group, member, time) always gives the same beat, so
// a group carries on where it was when it comes back into view.

import { clipOf } from "./clips.ts";
import { mix } from "./idlePlan.ts";

/** How a group gets on. */
export type Tone = "friendly" | "easy" | "gossip" | "heated" | "excited";

/** A standing group: its seed (which fixes its tone and its turns) and size. */
export type Group = { seed: number; size: number };

/** What one member does right now, and until what time (seconds on the
 * clock the caller reads) the beat stands. A null clip is plain standing. */
export type Beat = {
  role: "speak" | "react" | "listen";
  clip: string | null;
  until: number;
};

type Pools = { speak: readonly string[]; react: readonly string[] };

// every id is an emote of the social pack or the core one (conversation.test.ts checks)
const POOLS: Record<Tone, Pools> = {
  friendly: {
    speak: [
      "talk-general",
      "talk-two-hands",
      "chatting",
      "happy-hands",
      "arm-gesture",
      "talk-ual",
    ],
    react: ["nod-yes", "nod-long", "laugh", "nod-agree", "surprised", "happy"],
  },
  easy: {
    speak: [
      "talk-ask",
      "talk-question",
      "chatting",
      "talk-watercooler",
      "weight-gesture",
    ],
    react: ["nod-thoughtful", "head-sway", "shrug", "nod-yes", "sigh"],
  },
  gossip: {
    speak: ["talk-secret", "talk-whisper"],
    react: ["surprised", "laugh", "nod-thoughtful", "look-away", "bashful"],
  },
  heated: {
    speak: [
      "talk-argue",
      "talk-argue-2",
      "angry-forward",
      "point-angry",
      "yell",
    ],
    react: [
      "shake-annoyed",
      "shake-no",
      "dismiss",
      "dismiss-back",
      "look-away",
      "angry",
      "head-sway",
    ],
  },
  excited: {
    speak: ["happy-hands", "excited", "talk-two-hands", "talk-general"],
    react: ["laugh", "nod-hard", "surprised", "happy", "clap", "hand-raise"],
  },
};

/** Every clip id a conversation can ask for (the pools above, together). */
export const CONVERSATION_CLIPS: readonly string[] = [
  ...new Set(Object.values(POOLS).flatMap((p) => [...p.speak, ...p.react])),
];

const TONES: readonly Tone[] = [
  "friendly",
  "friendly",
  "friendly",
  "friendly",
  "easy",
  "easy",
  "easy",
  "gossip",
  "heated",
  "excited",
  "excited",
];

/** The tone a group's seed gives it: most are friendly or easy. */
export function toneOf(seed: number): Tone {
  return TONES[mix(seed, 71) % TONES.length] ?? "friendly";
}

/** Turns are laid out afresh in each window, so no beat needs the whole
 * history; a turn running into the next window is cut short there. */
const WINDOW = 60;
const MIN_TURN = 5;
const TURN_SPREAD = 6;
/** Share of listeners' turns (out of 100) in which they react. */
const REACT_PERCENT = 70;

const hash = (...n: number[]): number => n.reduce((h, x) => mix(h, x), 0x1234);
const pick = <T>(pool: readonly T[], h: number): T =>
  pool[(h >>> 8) % pool.length] as T;

type Turn = { start: number; end: number; speaker: number };

/** The turn that holds time `t` (the window's turns are rebuilt each call:
 * a dozen at most). */
function turnAt(group: Group, t: number): { turn: Turn; w: number; k: number } {
  const w = Math.floor(t / WINDOW);
  const stop = (w + 1) * WINDOW;
  let start = w * WINDOW;
  let speaker = -1;
  for (let k = 0; ; k++) {
    let s = hash(group.seed, w, k, 1) % group.size;
    // the next speaker is someone else
    if (s === speaker && group.size > 1) s = (s + 1) % group.size;
    speaker = s;
    const end = Math.min(
      start + MIN_TURN + (hash(group.seed, w, k, 2) % TURN_SPREAD),
      stop,
    );
    if (t < end || end >= stop) return { turn: { start, end, speaker }, w, k };
    start = end;
  }
}

/** What member `member` (0 to size - 1) of the group does at time `t`. */
export function beatAt(group: Group, member: number, t: number): Beat {
  const tone = toneOf(group.seed);
  const pools = POOLS[tone];
  const { turn, w, k } = turnAt(group, t);
  if (member === turn.speaker)
    return {
      role: "speak",
      clip: pick(pools.speak, hash(group.seed, member, w, k, 3)),
      until: turn.end,
    };
  // a listener reacts, if she does this turn, a second or three in
  const h = hash(group.seed, member, w, k, 4);
  if (h % 100 >= REACT_PERCENT)
    return { role: "listen", clip: null, until: turn.end };
  const clip = pick(pools.react, h);
  const begin = turn.start + 1 + (hash(group.seed, member, w, k, 5) % 3);
  const length = Math.max(2, clipOf(clip)?.period ?? 2);
  const over = Math.min(begin + length, turn.end);
  if (t < begin) return { role: "listen", clip: null, until: begin };
  if (t < over) return { role: "react", clip, until: over };
  return { role: "listen", clip: null, until: turn.end };
}
