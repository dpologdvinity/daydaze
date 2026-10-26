// The city's day and night, on the player's own clock: a blue sky and a warm
// sun by day, a gold evening, and the neon of Nightlife Row by night. Each
// key hour sets the sky, fog and light colors, how strong the sun is, how
// gold the light is, and how lit the neon and windows are; hours between keys
// ease from one to the next, so the light never jumps. `?time=HH:MM` pins the
// hour for screenshots and tests. Pure: colors are [r, g, b] in 0..1.

export type Rgb = readonly [number, number, number];

export type Daylight = {
  /** 0 at night to 1 in full day. */
  sun: number;
  /** How gold the light is (dawn and dusk). */
  golden: number;
  /** 0 by day to 1 at night: neon, signs and lit windows. */
  neon: number;
  zenith: Rgb;
  horizon: Rgb;
  /** The sky's glow low over the horizon (the sunset, or the city at night). */
  glow: Rgb;
  fog: Rgb;
  /** Hemisphere light: sky and ground colors, and its intensity. */
  hemiSky: Rgb;
  hemiGround: Rgb;
  hemi: number;
  /** The sun: unit direction toward it ([x east, y up, z]) and its height. */
  sunDirection: Rgb;
  sunElevation: number;
};

type Key = Omit<Daylight, "sunDirection" | "sunElevation">;

const hex = (h: string): Rgb => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

const NIGHT: Key = {
  sun: 0,
  golden: 0,
  neon: 1,
  zenith: hex("#07041a"),
  horizon: hex("#2a1046"),
  glow: hex("#ff5fa8"),
  fog: hex("#1a0d30"),
  hemiSky: hex("#8fa6ff"),
  hemiGround: hex("#2a1038"),
  hemi: 1.6,
};
const DAWN: Key = {
  sun: 0.35,
  golden: 0.7,
  neon: 0.4,
  zenith: hex("#4a5a9a"),
  horizon: hex("#f0b494"),
  glow: hex("#ffb36b"),
  fog: hex("#c9a6a8"),
  hemiSky: hex("#ffd2b0"),
  hemiGround: hex("#5a4a52"),
  hemi: 1.5,
};
const DAY: Key = {
  sun: 1,
  golden: 0,
  neon: 0,
  zenith: hex("#3d7fd6"),
  horizon: hex("#c4e2ff"),
  glow: hex("#fff4e0"),
  fog: hex("#b9d4ea"),
  hemiSky: hex("#cfe6ff"),
  hemiGround: hex("#6b6a58"),
  hemi: 1.9,
};
const DUSK: Key = {
  sun: 0.4,
  golden: 1,
  neon: 0.5,
  zenith: hex("#2b2f6e"),
  horizon: hex("#ff9a5a"),
  glow: hex("#ff6a3d"),
  fog: hex("#b07a86"),
  hemiSky: hex("#ffb38a"),
  hemiGround: hex("#4a3346"),
  hemi: 1.5,
};

/** Key hours of the day, in order from midnight round to midnight. */
const KEYS: readonly (readonly [number, Key])[] = [
  [0, NIGHT],
  [5, NIGHT],
  [6.5, DAWN],
  [9, DAY],
  [17, DAY],
  [19.5, DUSK],
  [21, NIGHT],
  [24, NIGHT],
];

const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];

/** The light at `hour` (0..24, fractions for minutes). */
export function daylightAt(hour: number): Daylight {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i + 2 < KEYS.length && (KEYS[i + 1]?.[0] ?? 24) <= h) i++;
  const [h0, a] = KEYS[i] ?? KEYS[0]!;
  const [h1, b] = KEYS[i + 1] ?? KEYS[KEYS.length - 1]!;
  const t = ease(h1 > h0 ? (h - h0) / (h1 - h0) : 0);
  // the sun's arc: up in the east at 6, overhead at 12.5, down in the west at 19
  const arc = (Math.PI * (h - 6)) / 13;
  const up = Math.sin(arc);
  const sunDirection: Rgb = [Math.cos(arc), Math.max(0.05, up), -0.35];
  const len = Math.hypot(...sunDirection);
  return {
    sun: mix(a.sun, b.sun, t),
    golden: mix(a.golden, b.golden, t),
    neon: mix(a.neon, b.neon, t),
    zenith: mixRgb(a.zenith, b.zenith, t),
    horizon: mixRgb(a.horizon, b.horizon, t),
    glow: mixRgb(a.glow, b.glow, t),
    fog: mixRgb(a.fog, b.fog, t),
    hemiSky: mixRgb(a.hemiSky, b.hemiSky, t),
    hemiGround: mixRgb(a.hemiGround, b.hemiGround, t),
    hemi: mix(a.hemi, b.hemi, t),
    sunDirection: [
      sunDirection[0] / len,
      sunDirection[1] / len,
      sunDirection[2] / len,
    ],
    sunElevation: up,
  };
}

/** The local hour of `date`, with minutes as a fraction. */
export const hourOf = (date: Date) => date.getHours() + date.getMinutes() / 60;

/** `?time=HH` or `?time=HH:MM` from a query string, or null. */
export function parseTimeFlag(search: string): number | null {
  const m = /[?&]time=(\d{1,2})(?::(\d{2}))?(?:&|$)/.exec(search);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}
