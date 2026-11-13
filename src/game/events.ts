// The weekly nights: thirty-five of them (Y2K, Latin, chiptune, disco, house,
// rave, K-pop, drag, goth, speakeasy and luau, then mall raves, UV glow, skate
// battles, a silent disco, drag brunch, speed-friending, talent shows,
// stargazing and more), at set venues on set evenings (a few by day), every
// night of the week. Every player sees the
// same moment: the schedule runs on UTC, the evenings placed over American
// nights (23:00 to 05:00 UTC). On its night a
// club plays the night's music, glows its color and its people talk about
// it. Pride night keeps its own quick cycle (prideNight.ts), as do the
// city's fireworks and parade; the city map lists them all. Pure.

import { byTier } from "./age.ts";
import type { TrackId } from "../audio/proceduralJukebox.ts";
import type { DialogueSituation } from "./dialogue/types.ts";
import type { RoomId } from "./rooms.ts";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
/** A night starts at 23:00 UTC and runs six hours, unless it says otherwise. */
const START = 23 * HOUR;
const LENGTH = 6 * HOUR;
/** 1970-01-01, where epoch time starts, was a Thursday (UTC weekday 4). */
const EPOCH_WEEKDAY = 4;

export type ClubNight = {
  id:
    | "y2k-night"
    | "latin-night"
    | "chiptune-night"
    | "disco-night"
    | "foam-party"
    | "speakeasy-night"
    | "eighties-night"
    | "goth-night"
    | "rave-night"
    | "kpop-night"
    | "trivia-night"
    | "open-mic-night"
    | "drag-night"
    | "cosmic-bowling"
    | "ladies-night"
    | "house-night"
    | "luau-night"
    | "cosmic-night"
    | "mall-rave"
    | "uv-night"
    | "skate-off"
    | "silent-disco"
    | "drag-brunch"
    | "speed-friending"
    | "jpop-night"
    | "salsa-lessons"
    | "poetry-slam"
    | "karaoke-battle"
    | "talent-show"
    | "stargazing"
    | "haunted-late"
    | "pajama-party"
    | "fashion-show"
    | "night-market"
    | "bonfire-singalong";
  label: string;
  /** The clubs that host it. */
  clubs: readonly RoomId[];
  /** UTC weekdays it starts on (0 Sunday … 6 Saturday). */
  days: readonly number[];
  /** What the clubs play while it's on. */
  track: TrackId;
  /** The glow its clubs take on. */
  color: string;
  /** What the clubs' people talk about while it's on. */
  situation: DialogueSituation;
  /** What it does to the room: the decor that fills the air, and the light
   * the room's palette takes on (see src/client/rooms/NightDecor.tsx). A night
   * without one only changes the music and the talk. */
  decor?: NightDecor;
  /** The hour (UTC) it starts, when not the usual 23:00, and how many hours it
   * runs, when not six: a brunch is a daytime thing. */
  startHour?: number;
  hours?: number;
};

/** The kinds of decor a night can fill its room with. */
export const NIGHT_DECORS = [
  "glowsticks",
  "uv",
  "spotlights",
  "halos",
  "confetti",
  "hearts",
  "petals",
  "streamers",
  "fireflies",
  "bunting",
  "stars",
  "fog",
  "balloons",
  "lanterns",
  "embers",
] as const;
export type NightDecor = (typeof NIGHT_DECORS)[number];

export const CLUB_NIGHTS: readonly ClubNight[] = [
  {
    id: "y2k-night",
    label: "Y2K night",
    clubs: ["sugar-rush", "pulse", "warehouse"],
    days: [5],
    track: "sugar-rush-pop",
    color: "#7ee8ff",
    situation: "event-y2k-night",
  },
  {
    id: "latin-night",
    label: "Latin night",
    clubs: ["la-noche", "pulse", "velvet-room"],
    days: [3, 6],
    track: "la-noche-salsa",
    color: "#ff8a3d",
    situation: "event-latin-night",
  },
  {
    id: "chiptune-night",
    label: "Chiptune night",
    clubs: ["arcade-bar", "warehouse"],
    days: [4],
    track: "player-two-chiptune",
    color: "#7dff6b",
    situation: "event-chiptune-night",
  },
  {
    id: "disco-night",
    label: "Disco night",
    clubs: ["roller-rink", "sugar-rush"],
    days: [0],
    track: "roller-disco",
    color: "#ffd84f",
    situation: "event-disco-night",
  },
  {
    id: "foam-party",
    label: "Foam party",
    clubs: ["pulse", "water-park"],
    days: [0],
    track: "savanna-nightclub",
    color: "#a8e8ff",
    situation: "event-foam-party",
  },
  {
    id: "speakeasy-night",
    label: byTier("Speakeasy night", "Jazz age night"),
    clubs: ["jazz-club", "back-room"],
    days: [0, 3],
    track: "canopy-lofi",
    color: "#e8b04a",
    situation: "event-speakeasy-night",
  },
  {
    id: "eighties-night",
    label: "'80s night",
    clubs: ["roller-rink", "arcade-bar"],
    days: [1],
    track: "roller-disco",
    color: "#ff4fa3",
    situation: "event-eighties-night",
  },
  {
    id: "goth-night",
    label: "Goth night",
    clubs: ["velvet-room", "back-room"],
    days: [1],
    track: "warehouse-acid",
    color: "#9b4dff",
    situation: "event-goth-night",
  },
  {
    id: "rave-night",
    label: "Rave night",
    clubs: ["warehouse", "pulse"],
    days: [2],
    track: "warehouse-acid",
    color: "#b14dff",
    situation: "event-rave-night",
  },
  {
    id: "kpop-night",
    label: "K-pop night",
    clubs: ["sugar-rush", "karaoke"],
    days: [2],
    track: "sugar-rush-pop",
    color: "#ff7ad9",
    situation: "event-kpop-night",
  },
  {
    id: "trivia-night",
    label: "Trivia night",
    clubs: ["wine-bar", "skate-diner"],
    days: [2],
    track: "canopy-lofi",
    color: "#7fd4ff",
    situation: "event-trivia-night",
  },
  {
    id: "open-mic-night",
    label: "Open mic night",
    clubs: ["karaoke", "espresso-lab"],
    days: [3],
    track: "canopy-lofi",
    color: "#ffb36b",
    situation: "event-open-mic-night",
  },
  {
    id: "drag-night",
    label: "Drag night",
    clubs: ["violet-hour", "velvet-room"],
    days: [4],
    track: "sugar-rush-pop",
    color: "#ff5fd2",
    situation: "event-drag-night",
  },
  {
    id: "cosmic-bowling",
    label: "Cosmic bowling",
    clubs: ["bowling", "boardwalk-arcade"],
    days: [5],
    track: "player-two-chiptune",
    color: "#5cf2ff",
    situation: "event-cosmic-bowling",
  },
  {
    id: "ladies-night",
    label: "Ladies' night",
    clubs: ["violet-hour", "rooftop-bar", "wine-bar"],
    days: [5],
    track: "roller-disco",
    color: "#ff8fb8",
    situation: "event-ladies-night",
  },
  {
    id: "house-night",
    label: "House night",
    clubs: ["warehouse", "rooftop-bar"],
    days: [6],
    track: "savanna-nightclub",
    color: "#6affc4",
    situation: "event-house-night",
  },
  {
    id: "luau-night",
    label: "Luau night",
    clubs: ["tiki-bar", "hotel-rooftop"],
    days: [6],
    track: "waterhole-twilight",
    color: "#3fe0d0",
    situation: "event-luau-night",
  },
  {
    id: "cosmic-night",
    label: "Cosmic night",
    clubs: ["orbit"],
    days: [4, 6],
    track: "savanna-nightclub",
    color: "#9b7bff",
    situation: "event-cosmic-night",
  },
  {
    id: "mall-rave",
    label: "Mall rave",
    clubs: ["galleria", "sugar-rush"],
    days: [4],
    track: "warehouse-acid",
    color: "#5cff9a",
    situation: "event-mall-rave",
    decor: "glowsticks",
  },
  {
    id: "uv-night",
    label: "UV glow night",
    clubs: ["mini-golf", "laser-tag"],
    days: [2],
    track: "player-two-chiptune",
    color: "#c3ff3d",
    situation: "event-uv-night",
    decor: "uv",
  },
  {
    id: "skate-off",
    label: "Roller skate-off",
    clubs: ["roller-rink", "skatepark"],
    days: [3],
    track: "roller-disco",
    color: "#ffb347",
    situation: "event-skate-off",
    decor: "spotlights",
  },
  {
    id: "silent-disco",
    label: "Silent disco",
    clubs: ["hotel-rooftop", "vinyl-vault"],
    days: [5],
    track: "canopy-lofi",
    color: "#7affff",
    situation: "event-silent-disco",
    decor: "halos",
  },
  {
    id: "drag-brunch",
    label: "Drag brunch",
    clubs: ["violet-hour", "bistro"],
    days: [0],
    startHour: 16,
    hours: 4,
    track: "sugar-rush-pop",
    color: "#ff9ad5",
    situation: "event-drag-brunch",
    decor: "confetti",
  },
  {
    id: "speed-friending",
    label: "Sapphic speed-friending",
    clubs: ["violet-hour"],
    days: [2],
    track: "canopy-lofi",
    color: "#ff7fb8",
    situation: "event-speed-friending",
    decor: "hearts",
  },
  {
    id: "jpop-night",
    label: "J-pop idol night",
    clubs: ["karaoke", "boba-matcha"],
    days: [4],
    track: "sugar-rush-pop",
    color: "#ffb3e6",
    situation: "event-jpop-night",
    decor: "petals",
  },
  {
    id: "salsa-lessons",
    label: "Salsa lesson night",
    clubs: ["la-noche", "pulse"],
    days: [1],
    track: "la-noche-salsa",
    color: "#ff6b3d",
    situation: "event-salsa-lessons",
    decor: "streamers",
  },
  {
    id: "poetry-slam",
    label: "Poetry slam",
    clubs: ["bookshop", "gallery", "espresso-lab"],
    days: [5],
    track: "canopy-lofi",
    color: "#c9a3ff",
    situation: "event-poetry-slam",
    decor: "fireflies",
  },
  {
    id: "karaoke-battle",
    label: "Karaoke battle",
    clubs: ["karaoke"],
    days: [5],
    track: "sugar-rush-pop",
    color: "#ff4f5e",
    situation: "event-karaoke-battle",
    decor: "spotlights",
  },
  {
    id: "talent-show",
    label: "Boardwalk talent show",
    clubs: ["boardwalk-arcade", "surf-shack"],
    days: [6],
    track: "carnival-calliope",
    color: "#ffd84f",
    situation: "event-talent-show",
    decor: "bunting",
  },
  {
    id: "stargazing",
    label: "Rooftop stargazing",
    clubs: ["hotel-rooftop", "rooftop-bar"],
    days: [1],
    track: "waterhole-twilight",
    color: "#8fb8ff",
    situation: "event-stargazing",
    decor: "stars",
  },
  {
    id: "haunted-late",
    label: "Haunted house late night",
    clubs: ["haunted-house"],
    days: [5, 6],
    track: "carnival-calliope",
    color: "#7dff9a",
    situation: "event-haunted-late",
    decor: "fog",
  },
  {
    id: "pajama-party",
    label: "Pajama party",
    clubs: ["skate-diner", "halo-halo-cafe"],
    days: [0],
    track: "canopy-lofi",
    color: "#ffc2d9",
    situation: "event-pajama-party",
    decor: "balloons",
  },
  {
    id: "fashion-show",
    label: "Runway night",
    clubs: ["catwalk", "galleria"],
    days: [6],
    track: "sugar-rush-pop",
    color: "#ff5ca8",
    situation: "event-fashion-show",
    decor: "spotlights",
  },
  {
    id: "night-market",
    label: "Night market",
    clubs: ["market", "garden"],
    days: [5],
    track: "waterhole-twilight",
    color: "#ff9a3d",
    situation: "event-night-market",
    decor: "lanterns",
  },
  {
    id: "bonfire-singalong",
    label: "Beach bonfire singalong",
    clubs: ["surf-shack", "mermaid-cove"],
    days: [3],
    track: "waterhole-twilight",
    color: "#ff8a3d",
    situation: "event-bonfire-singalong",
    decor: "embers",
  },
];

/** Milliseconds since this week's Sunday 00:00 UTC. */
const intoWeek = (ms: number) =>
  (((ms + EPOCH_WEEKDAY * DAY) % WEEK) + WEEK) % WEEK;

/** When a night starts in its day, and how long it runs (ms). */
const startOf = (night: ClubNight) =>
  night.startHour === undefined ? START : night.startHour * HOUR;
const lengthOf = (night: ClubNight) =>
  night.hours === undefined ? LENGTH : night.hours * HOUR;

/** Milliseconds since the night's latest start (each start is a week apart). */
function sinceStart(night: ClubNight, ms: number): number {
  const t = intoWeek(ms);
  const start = startOf(night);
  return Math.min(
    ...night.days.map((d) => (((t - d * DAY - start) % WEEK) + WEEK) % WEEK),
  );
}

/** Whether the night is on at `ms` (epoch ms). */
export const nightOn = (night: ClubNight, ms: number) =>
  sinceStart(night, ms) < lengthOf(night);

/** The nights on in a room at `ms`. */
export const nightsAt = (room: RoomId, ms: number) =>
  CLUB_NIGHTS.filter((n) => n.clubs.includes(room) && nightOn(n, ms));

/** One row of the calendar: on now (and how long it has left), or how long
 * until it starts. */
export type ScheduleRow = {
  id: ClubNight["id"];
  label: string;
  clubs: readonly RoomId[];
  on: boolean;
  /** Until it starts; 0 while it's on. */
  inMs: number;
  /** Until it ends, while it's on; 0 otherwise. */
  leftMs: number;
};

/** Every night, the ones on now first, then the soonest. */
export function schedule(ms: number): ScheduleRow[] {
  return CLUB_NIGHTS.map((n) => {
    const since = sinceStart(n, ms);
    const on = since < lengthOf(n);
    return {
      id: n.id,
      label: n.label,
      clubs: n.clubs,
      on,
      inMs: on ? 0 : nextStart(n, ms) - ms,
      leftMs: on ? lengthOf(n) - since : 0,
    };
  }).sort((a, b) => a.inMs - b.inMs);
}

/** The epoch ms of the night's next start after `ms`. */
function nextStart(night: ClubNight, ms: number): number {
  const t = intoWeek(ms);
  const waits = night.days.map(
    (d) => (((d * DAY + startOf(night) - t) % WEEK) + WEEK) % WEEK || WEEK,
  );
  return ms + Math.min(...waits);
}

/** The music a room plays for a night that's on there, or null. */
export const eventTrack = (room: RoomId, ms: number): TrackId | null =>
  nightsAt(room, ms)[0]?.track ?? null;

/**
 * What an NPC in `room` talks about at `ms`: Pride night in a Pride club
 * while it's on (`prideOn`), else a club night on there, else nothing.
 */
export function eventSituation(
  room: RoomId,
  ms: number,
  prideOn: boolean,
): DialogueSituation | null {
  if (prideOn) return "event-pride-night";
  return nightsAt(room, ms)[0]?.situation ?? null;
}

/** A wait for a countdown: "2d 3h", "3h 12m", "13m" (rounded up), or "now". */
export function formatWait(ms: number): string {
  if (ms <= 0) return "now";
  const minutes = Math.ceil(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
