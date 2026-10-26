// Racing a friend at the Speedway: one asks over the `game` relay, the other
// says yes, and the asker sends `race-go` with the track and a wall-clock
// start a few seconds ahead. Each player then runs their own race of the same
// track (no bots; driving is deterministic, so the track is all they share)
// with the countdown set to end at that moment, so both get the green light
// together however late the message arrived. Each sees the other's kart
// through their moves; finish times go over the relay. Pure.

import { MAX_GAME_DATA } from "../../net/networkProtocol.ts";
import type { CarSpec } from "../driving/car.ts";
import { COUNTDOWN_MS } from "./race.ts";
import { startRace, type RaceSession } from "./session.ts";
import type { Track } from "./track.ts";

/** The tracks two friends can race, by Track id. */
export const FRIEND_TRACKS = ["neon-oval", "boardwalk-loop"] as const;
export type FriendTrack = (typeof FRIEND_TRACKS)[number];

const isFriendTrack = (v: unknown): v is FriendTrack =>
  FRIEND_TRACKS.some((t) => t === v);

/** How far ahead the asker sets the start: time for `race-go` to arrive. */
export const LEAD_MS = 5000;
/** A start further off than this means the two clocks disagree. */
const MAX_WAIT_MS = 15_000;

export type RaceMessage =
  | { k: "race-ask"; track: FriendTrack }
  | { k: "race-yes" }
  | { k: "race-no" }
  /** Start the race on `track`; the light goes green at `startAt` (epoch ms). */
  | { k: "race-go"; track: FriendTrack; startAt: number }
  /** Finished, in `ms` over all laps. */
  | { k: "race-done"; ms: number };

export const encodeRace = (m: RaceMessage) => JSON.stringify(m);

const positive = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

/** A relayed message, if it's a race message and well formed. */
export function parseRaceMessage(data: string): RaceMessage | null {
  if (data.length > MAX_GAME_DATA) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const k: unknown = Reflect.get(value, "k");
  const track: unknown = Reflect.get(value, "track");
  if (k === "race-yes" || k === "race-no") return { k };
  if (k === "race-ask") return isFriendTrack(track) ? { k, track } : null;
  if (k === "race-go") {
    const startAt: unknown = Reflect.get(value, "startAt");
    return isFriendTrack(track) && positive(startAt)
      ? { k, track, startAt }
      : null;
  }
  if (k === "race-done") {
    const ms: unknown = Reflect.get(value, "ms");
    return positive(ms) ? { k, ms } : null;
  }
  return null;
}

/**
 * A race against nobody but your friend's ghost, whose countdown ends at
 * `startAt` (epoch ms) given the time `now`. A start that's already past or
 * implausibly far off (clocks that disagree) gets the usual countdown.
 */
export function startFriendRace(
  track: Track,
  spec: CarSpec,
  startAt: number,
  now: number,
): RaceSession {
  const session = startRace(track, spec, 0, "medium");
  const wait = startAt - now;
  const countdownMs = wait > 0 && wait <= MAX_WAIT_MS ? wait : COUNTDOWN_MS;
  session.race = { ...session.race, countdownMs };
  session.prev = session.race;
  return session;
}

/** Your total time against theirs: lower wins. */
export function verdict(mine: number, theirs: number): "won" | "lost" | "tie" {
  return mine < theirs ? "won" : mine > theirs ? "lost" : "tie";
}
