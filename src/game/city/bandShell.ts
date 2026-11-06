// The park's band shell (Uptown's Park and Gardens): a white half-dome on the
// south-west lawn with a park band that plays on a schedule by day, the
// audience on picnic blankets and folding chairs in front, and the seats you
// can take on the blankets. Pure: the day's schedule on the player's clock,
// where everyone stands and sits, and how loud the music is from where you
// are. BandShell.tsx draws it and src/audio/parkBand.ts voices the tunes.
import {
  DEFAULT_LOOK,
  HAIR_COLORS,
  OUTFIT_COLORS,
  SKINS,
  type Look,
} from "../look.ts";
import type { Vec2 } from "../walk.ts";
import { tuneById, type Tune } from "./bandTunes.ts";
import { hash, pick } from "./hash.ts";
import { AUDIENCE, BAND_SHELL, BLANKETS, GROUND } from "./park.ts";

/** Sets start every half hour from 10:00 until 17:30, on the player's clock. */
export const FIRST_SET = 10 * 3600;
export const LAST_SET = 17.5 * 3600;
export const SET_EVERY = 1800;
/** Quiet between tunes in a set, seconds. */
export const TUNE_GAP = 6;
/** The band takes the stage this long before a set starts. */
export const TAKE_STAGE = 150;

/** Three programs of four tunes (songbook ids), rotated through the day. */
const PROGRAM_IDS: readonly (readonly string[])[] = [
  ["oh-susanna", "clementine", "saints", "ball-game"],
  ["the-entertainer", "daisy-bell", "my-bonnie", "ode-to-joy"],
  ["round-the-mountain", "greensleeves", "la-cucaracha", "michael-row"],
];
export const PROGRAMS: readonly (readonly Tune[])[] = PROGRAM_IDS.map((ids) =>
  ids.map(tuneById),
);

/** Seconds a program takes, tunes and gaps. */
export const programSeconds = (tunes: readonly Tune[]): number =>
  tunes.reduce((t, tune) => t + tune.seconds + TUNE_GAP, 0) - TUNE_GAP;

export type BandNow =
  | {
      playing: true;
      /** When this set began, seconds of the day. */
      setStart: number;
      tune: Tune;
      /** The tune's place in the program, 0-based. */
      index: number;
      /** Seconds since this tune began. */
      into: number;
      /** When the next set after this one begins, or null after the last. */
      nextAt: number | null;
    }
  | {
      playing: false;
      /** When the next set begins (tomorrow's first, once the day is done). */
      nextAt: number;
      /** Whether the band is on the stage already, tuning up for the next set. */
      onStage: boolean;
    };

/** Which program the set starting at `start` plays: the slot number's turn. */
const programFor = (start: number): readonly Tune[] =>
  PROGRAMS[Math.round((start - FIRST_SET) / SET_EVERY) % PROGRAMS.length] ?? [];

/** The set starts of a day, seconds. */
const STARTS: readonly number[] = Array.from(
  { length: (LAST_SET - FIRST_SET) / SET_EVERY + 1 },
  (_, i) => FIRST_SET + i * SET_EVERY,
);

/** The band at `sec` seconds into the day (0..86400). */
export function bandAt(sec: number): BandNow {
  for (const [slot, start] of STARTS.entries()) {
    const nextAt = STARTS[slot + 1] ?? null;
    let at = sec - start;
    if (at < 0 || at >= programSeconds(programFor(start))) continue;
    for (const [index, tune] of programFor(start).entries()) {
      if (at < tune.seconds)
        return {
          playing: true,
          setStart: start,
          tune,
          index,
          into: at,
          nextAt,
        };
      at -= tune.seconds + TUNE_GAP;
      // in the quiet between two tunes: no music, the band stays put
      if (at < 0)
        return {
          playing: false,
          nextAt: nextAt ?? FIRST_SET + 86400,
          onStage: true,
        };
    }
  }
  // between sets: the next one today, or tomorrow's first
  const nextAt = STARTS.find((s) => s > sec) ?? FIRST_SET + 86400;
  return { playing: false, nextAt, onStage: nextAt - sec <= TAKE_STAGE };
}

/** `sec` as a 12-hour clock time: "2:30 PM" (past midnight wraps to the day). */
export function clockLabel(sec: number): string {
  const minutes = Math.floor((((sec % 86400) + 86400) % 86400) / 60);
  const h = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

/** Whether the band is on the stage (playing, or tuning up for the next set). */
export function bandOnStage(now: BandNow): boolean {
  return now.playing || now.onStage;
}

/** The hint under the band's name: what is playing, or when the next set is. */
export function bandHint(now: BandNow): string {
  if (now.playing)
    return `Now playing: ${now.tune.song.title}${now.nextAt === null ? "" : ` (next set at ${clockLabel(now.nextAt)})`}`;
  return `Next set at ${clockLabel(now.nextAt)}`;
}

// ---- where everyone is -------------------------------------------------------

/** The stage floor's height above the lawn, and where the band stands on it
 * (x, z), north-facing like the shell: the bandleader in front. */
export const STAGE_Y = 0.35;
export type Musician = {
  instrument: "trumpet" | "sax" | "drum" | "baton";
  at: Vec2;
  yaw: number;
  look: Look;
};

const HAIR = [
  "bob",
  "ponytail",
  "buns",
  "waves",
  "braids",
  "coils",
  "crop",
] as const;
const OUTFITS = [
  "jeans",
  "blouse",
  "flares",
  "shorts",
  "denim-shirt",
  "white-tee",
] as const;

export function lookOf(seed: number): Look {
  return {
    ...DEFAULT_LOOK,
    skin: pick(SKINS, hash(seed, 1)).id,
    hairStyle: pick(HAIR, hash(seed, 2)),
    hairColor: pick(HAIR_COLORS, hash(seed, 3)).id,
    outfit: pick(OUTFITS, hash(seed, 4)),
    outfitColor: pick(OUTFIT_COLORS, hash(seed, 5)).id,
  };
}

const FRONT = BAND_SHELL.z - 0.4;
/** The five on the stage, facing north into the audience. */
export const BAND: readonly Musician[] = [
  {
    instrument: "baton",
    at: [BAND_SHELL.x, FRONT - 0.2],
    yaw: 0,
    look: lookOf(701),
  },
  {
    instrument: "trumpet",
    at: [BAND_SHELL.x - 2.1, FRONT + 0.6],
    yaw: 0,
    look: lookOf(702),
  },
  {
    instrument: "sax",
    at: [BAND_SHELL.x + 2.1, FRONT + 0.6],
    yaw: 0,
    look: lookOf(703),
  },
  {
    instrument: "trumpet",
    at: [BAND_SHELL.x - 1.1, FRONT + 1.3],
    yaw: 0,
    look: lookOf(704),
  },
  {
    instrument: "drum",
    at: [BAND_SHELL.x + 1.1, FRONT + 1.3],
    yaw: 0,
    look: lookOf(705),
  },
];

/** The bandleader's place, for the chat. */
export const BANDLEADER = BAND[0];

/** Folding chairs in two rows at the back of the audience, facing the stage. */
export const CHAIRS: readonly { at: Vec2; yaw: number }[] = [
  AUDIENCE.z0 + 10.2,
  AUDIENCE.z0 + 9.2,
].flatMap((z, row) =>
  Array.from({ length: 6 - row }, (_, i) => ({
    at: [BAND_SHELL.x - 5.4 + row * 1.1 + i * 2.2, z] as Vec2,
    // facing +z: the stage is south of the audience
    yaw: Math.PI + (hash(row, i) - 0.5) * 0.12,
  })),
);

/** Blankets in front of the stage (the park's others are elsewhere). */
export const STAGE_BLANKETS: readonly Vec2[] = BLANKETS.filter(
  ([x, z]) =>
    x > AUDIENCE.x0 && x < AUDIENCE.x1 && z > AUDIENCE.z0 && z < AUDIENCE.z1,
);

export type CrowdMember = {
  at: Vec2;
  yaw: number;
  /** Seated on a blanket or a chair, or standing and swaying at the edge. */
  pose: "sit" | "sway";
  /** Height of the seat's cushion above the lawn (0 standing), for the doll's feet. */
  seat: number;
  look: Look;
};

/** Two on every blanket, a few on chairs and three swaying at the edge. */
export const CROWD: readonly CrowdMember[] = [
  ...STAGE_BLANKETS.flatMap(([x, z], b) =>
    [-0.45, 0.45].map((dx, i): CrowdMember => ({
      at: [x + dx, z],
      yaw: Math.PI + (hash(b, i, 9) - 0.5) * 0.5,
      pose: "sit",
      seat: 0.25,
      look: lookOf(720 + b * 2 + i),
    })),
  ),
  ...CHAIRS.filter((_, i) => i % 3 !== 1).map((c, i): CrowdMember => ({
    at: c.at,
    yaw: c.yaw,
    pose: "sit",
    seat: 0.45,
    look: lookOf(760 + i),
  })),
  ...[-4.2, 0.4, 4.6].map((dx, i): CrowdMember => ({
    at: [BAND_SHELL.x + dx, AUDIENCE.z0 + 3.2 + i * 0.4],
    yaw: Math.PI,
    pose: "sway",
    seat: 0,
    look: lookOf(790 + i),
  })),
];

/** Ground level of the lawn. */
export const BAND_Y = GROUND;

/** A seat on a blanket: you sit on the grass, facing the stage. */
export type BlanketSeat = { id: string; at: Vec2 };

/** Seats are free spots on the blankets the crowd leaves, one per blanket
 * beside the two seated there (the middle). */
export const BLANKET_SEATS: readonly BlanketSeat[] = STAGE_BLANKETS.map(
  ([x, z], i) => ({
    id: `park-blanket-${i}`,
    at: [x, z + 0.1] as Vec2,
  }),
);

/** The music is heard up to this far from the shell (m), full within FULL. */
export const HEARD = 60;
export const FULL = 12;

/** The music's loudness 0..1 at distance `d` from the shell: full up close, fading to nothing. */
export function bandGain(d: number): number {
  if (!(d < HEARD)) return 0;
  if (d <= FULL) return 1;
  const u = (HEARD - d) / (HEARD - FULL);
  return u * u;
}

/** Distance (m) from (x, z) to the shell's middle. */
export const shellDistance = (x: number, z: number): number =>
  Math.hypot(x - BAND_SHELL.x, z - BAND_SHELL.z);

/** Whether the shell's props are close enough to draw. */
export const shellNear = (x: number, z: number): boolean =>
  shellDistance(x, z) < 80;
