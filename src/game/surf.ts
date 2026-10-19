// Surfing at Swell Surf Co.: ride a wave for 30 seconds by keeping the
// board in its pocket, the sweet spot that wanders along the face. Lean
// left or right to chase it. Time in the pocket scores and charges a trick;
// too long out of it and you wipe out. Pure and stepped: the client feeds
// in the lean and the frame time.

export const RIDE = 30;
/** Half the pocket's width, and how far the board can go either way. */
export const POCKET = 0.9;
export const REACH = 4;
/** Seconds out of the pocket before a wipeout. */
export const WIPEOUT = 2.5;
const ACCEL = 9;
const DRAG = 2.2;
/** Points a second in the pocket, and for a trick. */
const RIDE_POINTS = 10;
export const TRICK_POINTS = 50;
/** Seconds in the pocket to charge a trick. */
const CHARGE_TIME = 4;

export type Surf = {
  seed: number;
  t: number;
  x: number;
  v: number;
  out: number;
  charge: number;
  points: number;
  tricks: number;
  /** "riding", or how it ended. */
  state: "riding" | "wiped" | "done";
};

/** A ride starts with the board in the pocket. */
export const newRide = (seed: number): Surf => ({
  seed,
  t: 0,
  x: pocketAt(seed, 0),
  v: 0,
  out: 0,
  charge: 0,
  points: 0,
  tricks: 0,
  state: "riding",
});

/** Where the pocket is at `t` seconds: two slow swells, offset by seed. */
export function pocketAt(seed: number, t: number): number {
  const a = (seed % 97) * 0.13;
  return Math.sin(t * 0.55 + a) * 2.2 + Math.sin(t * 1.45 + a * 2) * 0.6;
}

export const inPocket = (s: Surf) =>
  Math.abs(s.x - pocketAt(s.seed, s.t)) <= POCKET;

/** One step: `lean` is -1 (left), 0 or 1 (right); `dt` in seconds. */
export function step(s: Surf, lean: -1 | 0 | 1, dt: number): Surf {
  if (s.state !== "riding") return s;
  const d = Math.min(Math.max(dt, 0), 0.1);
  const v = (s.v + lean * ACCEL * d) * Math.exp(-DRAG * d);
  const x = Math.max(-REACH, Math.min(REACH, s.x + v * d));
  const t = s.t + d;
  const next = { ...s, t, x, v };
  const inside = Math.abs(x - pocketAt(s.seed, t)) <= POCKET;
  const out = inside ? 0 : s.out + d;
  return {
    ...next,
    out,
    points: s.points + (inside ? RIDE_POINTS * d : 0),
    charge: Math.min(1, s.charge + (inside ? d / CHARGE_TIME : 0)),
    state: out > WIPEOUT ? "wiped" : t >= RIDE ? "done" : "riding",
  };
}

/** A trick off the lip: needs a full charge and the pocket under you. */
export function trick(s: Surf): { surf: Surf; landed: boolean } {
  if (s.state !== "riding" || s.charge < 1 || !inPocket(s))
    return { surf: s, landed: false };
  return {
    surf: {
      ...s,
      charge: 0,
      tricks: s.tricks + 1,
      points: s.points + TRICK_POINTS,
    },
    landed: true,
  };
}

export const surfScore = (s: Surf) => Math.round(s.points);
