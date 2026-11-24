// The 18+ substances: what each menu item is, how it builds, peaks and fades,
// and how it shows in a doll's body and on the screen. Every timeline is the
// researched real one (docs/research/substances.md), in real minutes, squeezed
// into play time by one curve (`gameSeconds`); the design is in
// docs/specs/2026-11-17-substances.md. Pure functions only: the client keeps
// the doses taken and the clock. Nothing here reaches real players until the
// age gate ships.

const clamp01 = (x: number) =>
  Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;

/** Every meter, in a fixed order (ties go to the earlier one). */
export const SUBSTANCES = ["high", "trip", "acid", "molly", "cocaine"] as const;
export type Substance = (typeof SUBSTANCES)[number];

/** Where a dose is in its curve; `null` when it is over or not yet felt. */
export type Phase = "comeup" | "peak" | "comedown";

/** A menu item: the meter it raises, how far at its peak (0..1), and its
 * real timeline in minutes from taking it: effects begin at `onset`, build
 * to the peak at `peak`, hold until `peakEnd`, and are gone by `end`. */
export type Profile = {
  substance: Substance;
  strength: number;
  onset: number;
  peak: number;
  peakEnd: number;
  end: number;
};

export const DOSES = {
  // smoked: felt in seconds to minutes, peak 15-45 min, 2.5-5 h in all
  joint: {
    substance: "high",
    strength: 0.45,
    onset: 2,
    peak: 15,
    peakEnd: 45,
    end: 225,
  },
  // vaporized: like smoked, felt in about a minute and peaking sooner (Spindle
  // 2018: blood THC peaked at 10 min, drug effect within the hour); shorter
  // than a joint, since a few puffs from a cart are a smaller dose
  vape: {
    substance: "high",
    strength: 0.4,
    onset: 1,
    peak: 10,
    peakEnd: 35,
    end: 150,
  },
  // eaten: 20 min-2 h before anything (the redose trap), peak about 1.5-3 h,
  // 4-10 h in all; about as strong as smoking at its peak, but far longer
  edible: {
    substance: "high",
    strength: 0.55,
    onset: 45,
    peak: 105,
    peakEnd: 210,
    end: 420,
  },
  // mushroom tea (lemon tek): sooner and more abrupt than eaten caps,
  // about 3-6 h in all (user reports; no clinical study)
  tea: {
    substance: "trip",
    strength: 0.6,
    onset: 20,
    peak: 60,
    peakEnd: 150,
    end: 270,
  },
  // LSD tab (~100 µg, a common dose): felt in 15-60 min, comes up over 45-90,
  // peaks 3-5 h, 8-12 h in all: the longest of any substance
  tab: {
    substance: "acid",
    strength: 0.65,
    onset: 30,
    peak: 90,
    peakEnd: 330,
    end: 600,
  },
  // MDMA pill (80-120 mg, a common dose): felt in 30-45 min, up over 15-30
  // more, peak 1.5-2.5 h, 3-6 h in all. Redosing stacks (capped at 1).
  pill: {
    substance: "molly",
    strength: 0.6,
    onset: 35,
    peak: 60,
    peakEnd: 170,
    end: 300,
  },
  // a line of cocaine (30-60 mg, a common dose), insufflated: felt in 3-10
  // min, the rush peaks 7-16 min later and the main effect lasts 15-30 min
  // (held a bit longer here for play), 10-90 min in all. Redosing stacks (the
  // redose urge), capped at 1.
  line: {
    substance: "cocaine",
    strength: 0.6,
    onset: 5,
    peak: 15,
    peakEnd: 40,
    end: 75,
  },
} as const satisfies Record<string, Profile>;
export type Dose = keyof typeof DOSES;

const DOSE_IDS: readonly string[] = Object.keys(DOSES);
export const isDose = (x: unknown): x is Dose =>
  typeof x === "string" && DOSE_IDS.includes(x);

/** Weed strains, as the folk labels players know: a small modifier on any
 * weed dose, never a new timeline. The labels are unreliable (THC %, CBD and
 * terpenes predict effects better; docs/research/substances.md section 2), so
 * the nudges are small. `hybrid` is the unlabeled default; `hemp` is the weak
 * gas-station kind (CBD, delta-8). */
export const STRAINS = ["hybrid", "sativa", "indica", "hemp"] as const;
export type Strain = (typeof STRAINS)[number];

/** How a strain scales a weed dose's peak strength and its onset delay. */
export const STRAIN_MODS: Record<Strain, { strength: number; onset: number }> =
  {
    hybrid: { strength: 1, onset: 1 },
    sativa: { strength: 0.95, onset: 0.9 },
    indica: { strength: 1.05, onset: 1.1 },
    // delta-8 is about 50-70% of delta-9; hemp flower and CBD carts less
    hemp: { strength: 0.45, onset: 1 },
  };

const STRAIN_IDS: readonly string[] = STRAINS;
export const isStrain = (x: unknown): x is Strain =>
  typeof x === "string" && STRAIN_IDS.includes(x);

// every dose's profile per strain, built once so readMeters (every frame)
// allocates nothing; only weed doses are scaled
const PROFILES = new Map<Dose, Map<Strain, Profile>>();
for (const dose of Object.keys(DOSES).filter(isDose)) {
  const p: Profile = DOSES[dose];
  const byStrain = new Map<Strain, Profile>();
  for (const strain of STRAINS) {
    const m = STRAIN_MODS[strain];
    byStrain.set(
      strain,
      p.substance === "high"
        ? { ...p, strength: p.strength * m.strength, onset: p.onset * m.onset }
        : p,
    );
  }
  PROFILES.set(dose, byStrain);
}

/** The profile of a dose of a strain (missing strain: hybrid). */
export const profileOf = (dose: Dose, strain: Strain = "hybrid"): Profile =>
  PROFILES.get(dose)?.get(strain) ?? DOSES[dose];

/** Real minutes as play seconds: 20 × minutes^0.6. One curve for every
 * substance keeps their order and proportions (a balloon is over in under a
 * minute, a tab lasts longest) while short ones stay playable and long ones
 * don't eat the session: 3 min → 39 s, 1 h → 3.9 min, 10 h → 15.5 min. */
export function gameSeconds(realMinutes: number): number {
  return realMinutes > 0 ? 20 * realMinutes ** 0.6 : 0;
}

/** Hermite ease, 0 at `a`, 1 at `b`. */
const ease = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** How strongly one dose is felt `since` play seconds after taking it. */
export function doseLevel(p: Profile, since: number): number {
  const s = Number.isFinite(since) ? since : -1;
  const onset = gameSeconds(p.onset);
  const end = gameSeconds(p.end);
  if (s <= onset || s >= end) return 0;
  const peak = gameSeconds(p.peak);
  const peakEnd = gameSeconds(p.peakEnd);
  if (s < peak) return p.strength * ease(onset, peak, s);
  if (s <= peakEnd) return p.strength;
  return p.strength * (1 - ease(peakEnd, end, s));
}

/** Which part of its curve one dose is in, `since` play seconds after. */
export function phaseOf(p: Profile, since: number): Phase | null {
  if (!Number.isFinite(since) || since <= gameSeconds(p.onset)) return null;
  if (since < gameSeconds(p.peak)) return "comeup";
  if (since <= gameSeconds(p.peakEnd)) return "peak";
  if (since < gameSeconds(p.end)) return "comedown";
  return null;
}

/** A dose taken, `at` seconds on the client's play clock. */
export type Taken = { dose: Dose; at: number; strain?: Strain };

/** One meter now: its level (all its doses added, capped at 1) and the phase
 * and strain of the dose felt most. */
export type Meter = { level: number; phase: Phase | null; strain: Strain };
export type Meters = Record<Substance, Meter>;

export const soberMeters = (): Meters => ({
  high: { level: 0, phase: null, strain: "hybrid" },
  trip: { level: 0, phase: null, strain: "hybrid" },
  acid: { level: 0, phase: null, strain: "hybrid" },
  molly: { level: 0, phase: null, strain: "hybrid" },
  cocaine: { level: 0, phase: null, strain: "hybrid" },
});

// scratch for readMeters: the most each meter's strongest dose is felt
const topFelt: Record<Substance, number> = {
  high: 0,
  trip: 0,
  acid: 0,
  molly: 0,
  cocaine: 0,
};

/** Fills `out` with every meter at play time `now`. Writes in place, since
 * the client reads it every frame. */
export function readMeters(
  taken: readonly Taken[],
  now: number,
  out: Meters,
): Meters {
  for (const s of SUBSTANCES) {
    out[s].level = 0;
    out[s].phase = null;
    out[s].strain = "hybrid";
    topFelt[s] = 0;
  }
  // the phase comes from the dose felt most: a second joint at the peak of
  // the first still reads "peak", not "comeup"
  for (const t of taken) {
    const p = profileOf(t.dose, t.strain);
    const felt = doseLevel(p, now - t.at);
    if (felt <= 0) continue;
    const m = out[p.substance];
    m.level = Math.min(1, m.level + felt);
    if (felt > topFelt[p.substance]) {
      topFelt[p.substance] = felt;
      m.phase = phaseOf(p, now - t.at);
      m.strain = t.strain ?? "hybrid";
    }
  }
  return out;
}

/** Whether a dose taken `at` is over by `now` (the client drops it). */
export const spent = (t: Taken, now: number): boolean =>
  now - t.at >= gameSeconds(profileOf(t.dose, t.strain).end);

/** Below this a meter tints the screen but doesn't change how she stands. */
export const FELT = 0.15;

/** The substance her body shows: the strongest felt one, or null when she
 * is sober enough to stand like herself. */
export function strongest(meters: Readonly<Meters>): Substance | null {
  let best: Substance | null = null;
  let top = FELT;
  for (const s of SUBSTANCES) {
    const v = clamp01(meters[s].level);
    if (best === null ? v >= top : v > top) {
      best = s;
      top = v;
    }
  }
  return best;
}

/** The most a line quickens her walk, as a multiple of her pace: the meter
 * tops out at 1 (two lines), a single line at its peak is about +9%. */
export const COCAINE_PACE = 0.15;

/** How much faster she walks while cocaine is felt (1 = her own pace). It
 * follows the meter, so it builds with the rush and fades through the crash
 * back to normal with no step. The other substances don't change her pace. */
export const paceBoost = (meters: Readonly<Meters>): number =>
  1 + COCAINE_PACE * clamp01(meters.cocaine.level);

/** How she stands: `loops` play on repeat at `rate`; about half the idle
 * slots open with one of the `tics`, played once (a yawn, a laugh). */
export type Body = {
  loops: readonly string[];
  tics: readonly string[];
  rate: number;
};

/** Each substance's body language by phase, from the research's body and
 * movement notes. A phase left out stands like the one before it. */
export const BODY: Record<Substance, Record<Phase, Body>> = {
  high: {
    // settling in: easy, a first giggle
    comeup: {
      loops: ["idle-breathing", "idle-weight-shift"],
      tics: ["laugh"],
      rate: 0.95,
    },
    // slumped and slow: zoning out, giggling fits, cotton mouth and snacks
    peak: {
      loops: ["idle-distance", "idle-bored", "idle-breathing"],
      tics: ["laugh", "yawn", "consume"],
      rate: 0.85,
    },
    // sleepy and foggy
    // sleepy and foggy; the munchies hit as it fades
    comedown: {
      loops: ["idle-bored", "idle-breathing"],
      tics: ["yawn", "sigh", "consume"],
      rate: 0.85,
    },
  },
  trip: {
    // the signature: yawning, heavy and a little queasy
    comeup: {
      loops: ["idle-breathing", "idle-bored"],
      tics: ["yawn", "yawn", "sigh"],
      rate: 0.9,
    },
    // staring at things, looking about, giggling, awe
    peak: {
      loops: ["idle-distance", "idle-look-around"],
      tics: ["laugh", "head-sway", "look-distance", "surprised"],
      rate: 0.85,
    },
    // calm afterglow, tired
    comedown: {
      loops: ["idle-distance", "idle-breathing"],
      tics: ["sigh", "yawn"],
      rate: 0.9,
    },
  },
  acid: {
    // yawning, a little queasy, tingling
    comeup: {
      loops: ["idle-breathing", "idle-weight-shift"],
      tics: ["yawn", "yawn", "sigh"],
      rate: 1,
    },
    // energetic and exploring: the urge to walk, laugh and stare at things
    peak: {
      loops: ["idle-look-around", "idle-casual-2", "idle-casual-3"],
      tics: ["laugh", "surprised", "excited", "look-distance", "happy-hands"],
      rate: 1.08,
    },
    // the long tail: wired but tired
    comedown: {
      loops: ["idle-bored", "idle-weight-shift"],
      tics: ["sigh", "yawn", "look-distance"],
      rate: 0.95,
    },
  },
  molly: {
    // tingles, nausea, nervous energy
    comeup: {
      loops: ["idle-shoulders", "idle-weight-shift"],
      tics: ["head-sway", "happy", "sigh"],
      rate: 1,
    },
    // the urge to dance: swaying, restless energy, smiling, wiping sweat
    peak: {
      loops: ["idle-happy", "idle-casual-2", "idle-sweat"],
      tics: ["side-to-side", "belly-sway", "body-wave", "happy-hands", "laugh"],
      rate: 1.1,
    },
    // tired, low, a little irritable
    comedown: {
      loops: ["idle-bored", "idle-breathing"],
      tics: ["sigh", "sad", "yawn"],
      rate: 0.9,
    },
  },
  cocaine: {
    // alert, confident, restless
    comeup: {
      loops: ["idle-shoulders", "idle-look-around"],
      tics: ["talk-two-hands", "cocky"],
      rate: 1.1,
    },
    // talkative, fast gestures, overconfident, fidgety, upright
    peak: {
      loops: [
        "idle-shoulders",
        "idle-fold-arms",
        "idle-look-around",
        "idle-phone",
      ],
      tics: [
        "talk-two-hands",
        "arm-gesture",
        "excited",
        "cocky",
        "hands-forward",
      ],
      rate: 1.2,
    },
    // the fast crash: flat, anxious, irritable
    comedown: {
      loops: ["idle-bored", "idle-breathing", "idle-sweat"],
      tics: ["sigh", "disappointed", "yawn"],
      rate: 0.9,
    },
  },
};

/** Weed body language by strain, where it differs from BODY.high (hybrid;
 * hemp stands like hybrid, only fainter: its level is lower). Sativa is bright and chatty,
 * indica heavy and sleepy; folk lore, kept subtle (the labels are unreliable). */
export const STRAIN_BODY: Partial<Record<Strain, Record<Phase, Body>>> = {
  sativa: {
    comeup: {
      loops: ["idle-happy", "idle-breathing"],
      tics: ["laugh"],
      rate: 1,
    },
    // upbeat and talkative: giggles, animated hands
    peak: {
      loops: ["idle-happy", "idle-look-around", "idle-casual-2"],
      tics: ["laugh", "talk-two-hands", "happy-hands", "excited"],
      rate: 1.05,
    },
    comedown: {
      loops: ["idle-breathing", "idle-weight-shift"],
      tics: ["yawn", "sigh", "consume"],
      rate: 0.95,
    },
  },
  indica: {
    comeup: {
      loops: ["idle-breathing", "idle-bored"],
      tics: ["sigh", "yawn"],
      rate: 0.8,
    },
    // couch-lock: slow, zoned out, snacking
    peak: {
      loops: ["idle-bored", "idle-breathing", "idle-distance"],
      tics: ["yawn", "sigh", "consume"],
      rate: 0.75,
    },
    // the sleepy comedown
    comedown: {
      loops: ["idle-bored", "idle-breathing"],
      tics: ["yawn", "sigh"],
      rate: 0.7,
    },
  },
};

/** Her body for a meter, or null when it doesn't show. */
export function bodyOf(meters: Readonly<Meters>): Body | null {
  const s = strongest(meters);
  const phase = s ? meters[s].phase : null;
  if (!s || !phase) return null;
  if (s === "high")
    return STRAIN_BODY[meters.high.strain]?.[phase] ?? BODY.high[phase];
  return BODY[s][phase];
}

/** How a peer's doll stands under a substance: its peak, since the phase
 * isn't sent (the strain isn't either, so weed is the plain hybrid). */
export const peakBody = (s: Substance): Body => BODY[s].peak;

export type HighLook = {
  /** Soft glow and lifted saturation, 0..1. Kept under reduced motion. */
  glow: number;
  /** How far colors cycle round the hue wheel, 0..1. Kept, but frozen,
   * under reduced motion. */
  hue: number;
  /** Surfaces breathing: a slow radial swell of the screen, in UVs. Zero
   * under reduced motion. Under 0.3 Hz, never a strobe. */
  breathe: number;
  /** 1 while the colors drift on their own, 0 (held still) under reduced
   * motion. */
  drift: number;
  /** Radiant color: extra saturation and a little contrast, 0..1. Kept
   * under reduced motion (it is color, not movement). */
  radiance: number;
  /** Faint kaleidoscopic hue bands round the screen edge, 0..1. Zero under
   * reduced motion. */
  geometry: number;
  /** Afterimage trails behind moving things, 0..1. Zero under reduced
   * motion. */
  tracer: number;
  /** Eye wiggle (nystagmus): a tiny horizontal jitter of the screen, 0..1.
   * Zero under reduced motion. About 1 Hz, no brightness change. */
  wiggle: number;
};

/** The most weed lowers the upper lid, as a share of a full blink (0 open,
 * 1 shut): heavy-lidded, never closed. */
export const HEAVY_LID_MAX = 0.5;

// how heavy the lids sit at full weed, by phase and by strain: sleepiest on
// the way down, indica heaviest, sativa brightest (docs/research: "heavy
// eyelids, squinting, slow blinking")
const LID_PHASE: Record<Phase, number> = {
  comeup: 0.25,
  peak: 0.4,
  comedown: 0.5,
};
const LID_STRAIN: Record<Strain, number> = {
  hybrid: 1,
  sativa: 0.75,
  indica: 1.25,
  hemp: 1,
};

/** How far weed lowers her upper lid, 0 to HEAVY_LID_MAX, added to the lid's
 * rest. Zero sober and for every other substance. Pure and cheap: the doll
 * reads it each frame (own doll only). */
export function heavyLid(meters: Readonly<Meters>): number {
  const { level, phase, strain } = meters.high;
  if (!phase) return 0;
  return Math.min(
    HEAVY_LID_MAX,
    clamp01(level) * LID_PHASE[phase] * LID_STRAIN[strain],
  );
}

// How far each substance at full strength opens the pupils and sets the jaw,
// 0..1, from the research's signs table: dilated pupils with MDMA (marked),
// cocaine, LSD and psilocybin; jaw clench with MDMA (strong), cocaine and LSD
// (mild). Weed does neither (its eyes are red and heavy-lidded instead).
const PUPIL: Record<Substance, number> = {
  high: 0,
  trip: 0.6,
  acid: 0.7,
  molly: 1,
  cocaine: 0.6,
};
const JAW: Record<Substance, number> = {
  high: 0,
  trip: 0,
  acid: 0.25,
  molly: 1,
  cocaine: 0.5,
};

const strongestOf = (
  meters: Readonly<Meters>,
  scale: Record<Substance, number>,
): number => {
  let top = 0;
  for (const s of SUBSTANCES)
    top = Math.max(top, clamp01(meters[s].level) * scale[s]);
  return top;
};

/** How wide her pupils open, 0 (her own) to 1 (blown): the strongest felt
 * substance's share at its meter. The doll's eye shader reads it. */
export const pupilDilation = (meters: Readonly<Meters>): number =>
  strongestOf(meters, PUPIL);

/** How hard her jaw clenches, 0..1 (the doll's `gurn` key, pulsed as
 * grinding by the client): molly's gurning, less for cocaine and acid. */
export const jawClench = (meters: Readonly<Meters>): number =>
  strongestOf(meters, JAW);

/** The reddest the whites of the eyes get at full weed (0..1 blend). */
export const RED_EYES_MAX = 0.6;

/** How red the sclera is from weed (dilated conjunctival vessels, docs/research
 * /substances.md section 2), 0 to RED_EYES_MAX. Scales with the high level and
 * is zero sober and for every other substance. Own doll only. */
export function redEyes(meters: Readonly<Meters>): number {
  const { level, phase } = meters.high;
  if (!phase) return 0;
  return Math.min(RED_EYES_MAX, clamp01(level) * RED_EYES_MAX);
}

/** Weed's time stretch ("a minute feels like ten"): a faint afterimage trail,
 * so moments linger. A fade, never a flash; molly's is 0.3, acid's 0.85. */
export const WEED_TRACER = 0.2;

export const BREATHE_AMOUNT = 0.006;
export const BREATHE_HZ = 0.25;

/** The screen look for the meters at the setting's intensity factor (0..1):
 * weed is a faint glow and color lift (no hallucinations, which are a myth
 * at normal doses); a trip saturates, shifts colors and breathes; acid adds
 * radiant color, faint peripheral geometry and tracers; molly glows with
 * neon color, mild tracers and a wiggle, and no geometry (not a psychedelic);
 * cocaine changes nothing on screen (no distortion at normal doses). */
export function highParams(
  meters: Readonly<Meters>,
  factor: number,
  calm: boolean,
): HighLook {
  const f = clamp01(factor);
  const h = clamp01(meters.high.level) * f;
  const t = clamp01(meters.trip.level) * f;
  const a = clamp01(meters.acid.level) * f;
  const m = clamp01(meters.molly.level) * f;
  const strain = meters.high.strain;
  return {
    // indica glows heavier, sativa's color pops a little more (hemp is faint
    // already: its strength is scaled down)
    glow: Math.min(
      1,
      h * (strain === "indica" ? 0.95 : 0.8) + t * 0.4 + a * 0.3 + m * 0.5,
    ),
    hue: Math.max(t, a * 0.7),
    // acid breathes like a trip, at half the depth
    breathe: calm ? 0 : (t + a * 0.5) * BREATHE_AMOUNT,
    drift: calm ? 0 : 1,
    radiance: Math.min(1, a + m * 0.6 + (strain === "sativa" ? h * 0.15 : 0)),
    geometry: calm ? 0 : a,
    tracer: calm ? 0 : Math.min(1, a * 0.85 + m * 0.3 + h * WEED_TRACER),
    wiggle: calm ? 0 : m,
  };
}

/** A harm-reduction toast for the moment weed peaks (`was` is the phase last
 * frame): cotton mouth is real, and water is the fix. Null otherwise. */
export function dryMouthHint(
  was: Phase | null,
  meters: Readonly<Meters>,
): string | null {
  return meters.high.phase === "peak" && was !== "peak"
    ? "Cotton mouth. A glass of water helps."
    : null;
}

/** A harm-reduction toast when weed is taken (an edible redose warning before
 * the first lands, advice to start low, or mixing with alcohol). Null if none. */
export function takeWeedHint(
  dose: Dose,
  taken: readonly Taken[],
  now: number,
  alcohol: boolean | number = false,
): string | null {
  if (profileOf(dose).substance !== "high") return null;
  if (dose === "edible") {
    const unlanded = taken.some(
      (t) =>
        t.dose === "edible" &&
        now - t.at < gameSeconds(profileOf(t.dose, t.strain).onset),
    );
    if (unlanded) {
      return "Edibles take up to 2 hours. Don't take another one yet.";
    }
  }
  const hasAlc = typeof alcohol === "number" ? alcohol > 0 : alcohol;
  if (hasAlc) {
    return "Weed then drink is gentler than drink then weed.";
  }
  if (dose === "edible") {
    return "Edibles take up to 2 hours. Start low, go slow.";
  }
  return null;
}

/** Harm-reduction advice when weed reaches strong/overwhelming levels
 * (`wasLevel` is the level last frame): calm breathing and a snack. Null otherwise. */
export function panicHint(
  wasLevel: number,
  meters: Readonly<Meters>,
): string | null {
  return meters.high.level >= 0.8 && wasLevel < 0.8
    ? "Panicking? Sit, breathe, have a snack and some water; it passes."
    : null;
}
