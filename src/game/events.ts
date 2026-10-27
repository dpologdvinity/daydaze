// The weekly club nights: seventeen of them (Y2K, Latin, chiptune, disco,
// house, rave, K-pop, drag, goth, speakeasy, luau and more), at set clubs on
// set evenings, two or more every night of the week. Every player sees the
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
/** Every night starts at 23:00 UTC and runs six hours. */
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
    | "luau-night";
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
};

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
];

/** Milliseconds since this week's Sunday 00:00 UTC. */
const intoWeek = (ms: number) =>
  (((ms + EPOCH_WEEKDAY * DAY) % WEEK) + WEEK) % WEEK;

/** Milliseconds since the night's latest start (each start is a week apart). */
function sinceStart(night: ClubNight, ms: number): number {
  const t = intoWeek(ms);
  return Math.min(
    ...night.days.map((d) => (((t - d * DAY - START) % WEEK) + WEEK) % WEEK),
  );
}

/** Whether the night is on at `ms` (epoch ms). */
export const nightOn = (night: ClubNight, ms: number) =>
  sinceStart(night, ms) < LENGTH;

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
    const on = since < LENGTH;
    return {
      id: n.id,
      label: n.label,
      clubs: n.clubs,
      on,
      inMs: on ? 0 : nextStart(n, ms) - ms,
      leftMs: on ? LENGTH - since : 0,
    };
  }).sort((a, b) => a.inMs - b.inMs);
}

/** The epoch ms of the night's next start after `ms`. */
function nextStart(night: ClubNight, ms: number): number {
  const t = intoWeek(ms);
  const waits = night.days.map(
    (d) => (((d * DAY + START - t) % WEEK) + WEEK) % WEEK || WEEK,
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
