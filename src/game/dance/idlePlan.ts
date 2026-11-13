// What a standing doll does while she waits: the player breathes and now and
// then fidgets (looks around, checks behind her, takes a call); each NPC has
// a temperament picked by its seed, so a crowd is made of people who stand
// differently (one still, one restless, one on the phone, one who talks with
// her hands). Time is cut into slots; every slot draws one clip, and a clip
// drawn twice in a row simply keeps playing. Pure and deterministic: the same
// (seed, slot) always gives the same clip, which keeps the tests honest.

import type { MocapPack } from "./mocapTypes.ts";

/** Seconds a standing doll holds one idle before she may change it. */
export const IDLE_SLOT_SECONDS = 11;

/** Still, easy standing: the player's base and most NPCs'. Core pack. */
export const CALM_IDLES: readonly string[] = [
  "idle-breathing",
  "idle-weight-shift",
  "idle-female",
  "idle-ual",
  "idle-short",
];

/** Small fidgets: a look around, a glance behind, arms folded. Core pack. */
export const FIDGET_IDLES: readonly string[] = [
  "idle-look-around",
  "idle-shoulders",
  "idle-bored",
  "idle-distance",
  "idle-sweat",
  "idle-casual-2",
  "idle-casual-3",
  "idle-casual-4",
  "idle-fold-arms",
  "idle-happy",
];

/** Standing with a phone or a tablet. Core pack. */
export const PHONE_IDLES: readonly string[] = ["idle-phone", "idle-tablet"];

/** Talking with her hands, thinking, a yawn: the social pack. */
export const GESTURE_IDLES: readonly string[] = [
  "think",
  "shrug",
  "weight-gesture",
  "arm-gesture",
  "look-distance",
  "yawn",
  "sigh",
  "happy-hands",
  "talk-ual",
  "talk-two-hands",
  "nod-yes",
  "bashful",
  "talk-general",
  "head-sway",
];

/** How an NPC stands about. */
export type Temperament = "calm" | "restless" | "phone" | "chatty";

// weights per temperament: [calm, fidget, phone, gesture], out of 100
const WEIGHTS: Record<Temperament, readonly [number, number, number, number]> =
  {
    calm: [70, 30, 0, 0],
    restless: [15, 85, 0, 0],
    phone: [20, 10, 70, 0],
    chatty: [20, 25, 0, 55],
  };

// six seeds in ten are calm or restless: most of a crowd just stands
const TEMPERAMENTS: readonly Temperament[] = [
  "calm",
  "restless",
  "calm",
  "chatty",
  "phone",
  "restless",
  "calm",
  "chatty",
  "restless",
  "calm",
];

/** A small integer hash of two numbers, uniform enough for picks. */
export function mix(a: number, b: number): number {
  let h =
    Math.imul(Math.floor(a) | 0, 0x9e3779b1) ^
    Math.imul(Math.floor(b) | 0, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

/** An NPC's temperament, fixed by its seed. */
export function temperamentOf(seed: number): Temperament {
  return TEMPERAMENTS[mix(seed, 17) % TEMPERAMENTS.length] ?? "calm";
}

const pickFrom = (pool: readonly string[], h: number): string =>
  pool[(h >>> 8) % pool.length] ?? CALM_IDLES[0] ?? "";

/** The pack a plan's clip lives in (gestures are social; the rest are core). */
export function packOfIdle(id: string): MocapPack {
  return GESTURE_IDLES.includes(id) ? "social" : "core";
}

/** The clip a standing doll plays in `slot` (counted from when she began to
 * stand, for the player; from the clock, for an NPC). The player starts on
 * her breathing and fidgets about half the time after; an NPC follows her
 * temperament. `gestures` says whether the social pack has loaded: until it
 * has, a chatty NPC fidgets instead. */
export function idlePlan(
  seed: number,
  slot: number,
  own: boolean,
  gestures: boolean,
): string {
  const h = mix(seed, slot);
  if (own) {
    if (slot <= 0) return "idle-breathing";
    return h % 100 < 50 ? pickFrom(CALM_IDLES, h) : pickFrom(FIDGET_IDLES, h);
  }
  const [calm, fidget, phone] = WEIGHTS[temperamentOf(seed)];
  const roll = h % 100;
  if (roll < calm) return pickFrom(CALM_IDLES, h);
  if (roll < calm + fidget) return pickFrom(FIDGET_IDLES, h);
  if (roll < calm + fidget + phone) return pickFrom(PHONE_IDLES, h);
  return gestures ? pickFrom(GESTURE_IDLES, h) : pickFrom(FIDGET_IDLES, h);
}

/** The slot a doll is in: `seconds` of standing (the player) or of the
 * clock plus an offset of her own (an NPC, so a crowd changes out of step). */
export const idleSlot = (seconds: number): number =>
  Math.max(0, Math.floor(seconds / IDLE_SLOT_SECONDS));

/** Seated and settled. Sitting-idle is the core pack's; the rest are seated. */
export const SEAT_CALM: readonly string[] = [
  "sit-idle",
  "seat-hands-thighs",
  "seat-ual",
];

/** Seated and restless: feet fidgeting, looking about, waiting. */
export const SEAT_FIDGET: readonly string[] = [
  "seat-fidget",
  "seat-looking",
  "seat-waiting",
];

/** Seated in conversation. */
export const SEAT_TALK: readonly string[] = [
  "seat-talk",
  "seat-talk-2",
  "seat-talk-ual",
  "seat-talk-male",
  "seat-laugh",
];

/** The loop a seated doll with no held pose plays in `slot`: the player
 * sits settled and now and then shifts; an NPC by temperament (a chatty one
 * talks to the next seat). */
export function seatPlan(seed: number, slot: number, own: boolean): string {
  const h = mix(seed, slot + 101);
  if (own && slot <= 0) return "sit-idle";
  const roll = h % 100;
  if (own) return roll < 55 ? pickFrom(SEAT_CALM, h) : pickFrom(SEAT_FIDGET, h);
  switch (temperamentOf(seed)) {
    case "chatty":
      return roll < 60 ? pickFrom(SEAT_TALK, h) : pickFrom(SEAT_CALM, h);
    case "restless":
    case "phone":
      return roll < 60 ? pickFrom(SEAT_FIDGET, h) : pickFrom(SEAT_CALM, h);
    default:
      return roll < 75 ? pickFrom(SEAT_CALM, h) : pickFrom(SEAT_FIDGET, h);
  }
}

/** What a standing NPC does with her hands while she speaks a line. */
export const TALK_CLIPS: readonly string[] = [
  "chatting",
  "talk-general",
  "talk-two-hands",
  "talk-ask",
  "talk-question",
  "talk-ual",
  "happy-hands",
  "weight-gesture",
  "arm-gesture",
];

/** The talking clip for a speaker: her seed picks her manner, and `n` (how
 * many lines she has said) moves her on to another now and then. */
export function talkClipFor(seed: number, n = 0): string {
  return pickFrom(TALK_CLIPS, mix(seed, 301 + Math.floor(n / 2)));
}
