// The buzz meter: drinks raise it, time and water and food lower it. Pure
// functions only; the client keeps the number and draws the effects.

/** The most buzz a player can build up, however many drinks they have. */
export const BUZZ_CAP = 1;

/** Each drink adds this much. Free props, so they never run out. */
const DRINK_STRENGTH = { beer: 0.2, cocktail: 0.3, shot: 0.45 } as const;
export type Drink = keyof typeof DRINK_STRENGTH;

const WATER_RELIEF = 0.25;
const FOOD_RELIEF = 0.15;

/** Time constant of the fade: a full buzz is mostly gone in about four minutes. */
export const DECAY_SECONDS = 90;

const clamp01 = (x: number) =>
  Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;

export function addDrink(level: number, drink: Drink): number {
  return Math.min(BUZZ_CAP, clamp01(level) + DRINK_STRENGTH[drink]);
}

export function drinkWater(level: number): number {
  return Math.max(0, clamp01(level) - WATER_RELIEF);
}

export function eatFood(level: number): number {
  return Math.max(0, clamp01(level) - FOOD_RELIEF);
}

/** Exponential fade over `seconds`; never grows, never goes negative. */
export function decayBuzz(level: number, seconds: number): number {
  const dt = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return clamp01(level) * Math.exp(-dt / DECAY_SECONDS);
}

export const INTENSITIES = ["off", "low", "full"] as const;
export type Intensity = (typeof INTENSITIES)[number];

const INTENSITY_IDS: readonly unknown[] = INTENSITIES;

export function isIntensity(value: unknown): value is Intensity {
  return INTENSITY_IDS.includes(value);
}

export function intensityFactor(intensity: Intensity): number {
  return intensity === "off" ? 0 : intensity === "low" ? 0.5 : 1;
}

// Amounts are the peak values. Sway is in screen UVs, so 0.004 is about 3 px
// on a 720p frame. Sway oscillates below 0.5 Hz, which never reads as a strobe.
export const SWAY_AMOUNT = 0.004;
export const SWAY_HZ = 0.35;
const WARM_AMOUNT = 0.6;
const EDGE_AMOUNT = 0.6;

export type DrunkLook = {
  /** Screen-space camera sway, in UVs. Zero under reduced motion. */
  sway: number;
  /** How far the doll's walk and idle lean wobble, 0..1. Zero under reduced motion. */
  wobble: number;
  /** Warm color shift, 0..1. Kept under reduced motion. */
  warm: number;
  /** Edge darkening, 0..1. Kept under reduced motion. */
  edge: number;
};

/** Everything the drunk visuals need, from the buzz, the setting and reduced motion. */
export function visualParams(
  buzz: number,
  intensity: Intensity,
  calm: boolean,
): DrunkLook {
  const f = clamp01(buzz) * intensityFactor(intensity);
  return {
    sway: calm ? 0 : f * SWAY_AMOUNT,
    wobble: calm ? 0 : f,
    warm: f * WARM_AMOUNT,
    edge: f * EDGE_AMOUNT,
  };
}

// Chat only starts to slur once the buzz is clearly up.
const DISTORT_FROM = 0.2;
const STRETCHY = /[aeiouy]/i;

/** A small seeded generator, so the same seed always slurs the same way. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stretches some vowels in chat, as in "heyyy", when the buzz is up.
 * Deterministic: the same text, buzz and seed always give the same result.
 * `max` caps the stretched line, so it still fits the chat limit.
 */
export function chatDistort(
  text: string,
  buzz: number,
  seed: number,
  max = Infinity,
): string {
  const level = clamp01(buzz);
  if (level < DISTORT_FROM) return text;
  const chance = ((level - DISTORT_FROM) / (1 - DISTORT_FROM)) * 0.5;
  const random = mulberry32(seed);
  let out = "";
  let i = 0;
  for (const ch of text) {
    // draw for every character, so a vowel's roll never depends on earlier text
    const roll = random();
    const stretch = 1 + Math.floor(random() * (1 + 3 * level));
    // stretch only while the rest of the line still fits
    const room = max - out.length - (text.length - i - 1);
    out +=
      STRETCHY.test(ch) && roll < chance && room > 1
        ? ch.repeat(Math.min(stretch, room))
        : ch;
    i++;
  }
  return out;
}

/** The buzz a move's action shows (its "~1".."~3" tag, see peerAction.ts),
 * as a level for effects others apply: the server slurs chat with it. */
export function shownBuzz(action: string): number {
  const tier = /~([1-3])$/.exec(action)?.[1];
  return tier === "3" ? 0.9 : tier === "2" ? 0.6 : tier === "1" ? 0.3 : 0;
}
