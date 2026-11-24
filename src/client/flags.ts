// Parses the client's URL flags (?quality, ?still, ?debug, ?room, ?view,
// ?slide, ?at and ?yaw, ?spot, ?adult) into typed values. Invalid values become null
// or false; nothing here enforces the age gate.

import {
  isRoomId,
  SOLO_ROOMS,
  type RoomId,
  type Spawn,
} from "../game/rooms.ts";
import { spotFor } from "../game/city/spots.ts";
import { loadSave } from "../game/save.ts";
import { VIEW_IDS, type View } from "./world/view.ts";
import type { QualityTier } from "./world/quality.ts";

export type CamFlag =
  | {
      kind: "world";
      eye: readonly [number, number, number];
      look: readonly [number, number, number];
    }
  | {
      kind: "relative";
      off: readonly [number, number, number];
    };

/** Every URL flag, already validated. */
export type Flags = {
  /** `?quality=low|high|ultra` forces a tier. */
  quality: QualityTier | null;
  /** `?still=1` renders a few frames and stops, for screenshots. */
  still: boolean;
  /** `?debug=1` shows the room jump buttons. */
  debug: boolean;
  /** `?room=plaza` starts somewhere other than the Velvet Room. */
  room: RoomId | null;
  /** `?view=face` starts on another camera shot. */
  view: View | null;
  /** `?slide=0.4` starts the Water Park's first slide 40% of the way down. */
  slide: number | null;
  /** `?at=0,300` starts the room at that point (x, z), facing `yaw` (0).
   * `?spot=<building-id>` starts in the city in front of that building
   * (spots.ts), her back to it unless `yaw` is given. */
  at: Spawn | null;
  /** `?adult=1` opens the 18+ rooms, in a development build only (adult.ts). */
  adult: boolean;
  /** `?join=karaoke.3` opens straight into that room copy, online (an
   * invite link from inviteLink). */
  join: { room: RoomId; copy: number } | null;
  /** `?fov=45` overrides the camera field of view in degrees (15..120). */
  fov: number | null;
  /** `?dist=10` pulls the follow camera back to that distance in meters (0.5..100). */
  dist: number | null;
  /** `?pitch=15` tilts the follow camera up (+) or down (-) in degrees (-85..85). */
  pitch: number | null;
  /** `?height=2` sets camera eye height above player feet in meters (-20..60). */
  height: number | null;
  /** `?cam=ex,ey,ez,lx,ly,lz` (world) or `?cam=dx,dy,dz` (relative). */
  cam: CamFlag | null;
  /** `?heistend=caught|escape` selects how a held preview heist ends. */
  heistend: "caught" | "escape" | null;
};

/** Room copies are numbered 1 to 99 (OnlineSession's MAX_COPY). */
const MAX_COPY = 99;

/** Safe access to location.search; returns empty string in Node or environments without location. */
export function locationSearch(): string {
  return typeof location !== "undefined" ? location.search : "";
}

/** Reads the flags from a location.search string. */
export function readFlags(search: string = locationSearch()): Flags {
  const q = new URLSearchParams(search);
  const quality = q.get("quality");
  const room = q.get("room");
  const slide = Number(q.get("slide") ?? Number.NaN);
  const view = VIEW_IDS.find((v) => v === q.get("view")) ?? null;
  const yaw = q.get("yaw");
  const spot = spotFor(q.get("spot") ?? "");
  if (spot && yaw !== null && Number.isFinite(Number(yaw)))
    spot.yaw = Number(yaw);
  const fovNum = Number(q.get("fov") ?? Number.NaN);
  const fov =
    Number.isFinite(fovNum) && fovNum >= 15 && fovNum <= 120 ? fovNum : null;
  const distNum = Number(q.get("dist") ?? Number.NaN);
  const dist =
    Number.isFinite(distNum) && distNum >= 0.5 && distNum <= 100
      ? distNum
      : null;
  const pitchNum = Number(q.get("pitch") ?? Number.NaN);
  const pitch =
    Number.isFinite(pitchNum) && pitchNum >= -85 && pitchNum <= 85
      ? pitchNum
      : null;
  const heightNum = Number(q.get("height") ?? Number.NaN);
  const height =
    Number.isFinite(heightNum) && heightNum >= -20 && heightNum <= 60
      ? heightNum
      : null;
  const heistendRaw = q.get("heistend");
  const heistend =
    heistendRaw === "caught" || heistendRaw === "escape" ? heistendRaw : null;
  return {
    quality:
      quality === "low" || quality === "high" || quality === "ultra"
        ? quality
        : null,
    still: q.get("still") === "1",
    debug: q.get("debug") === "1",
    room: spot ? "city" : isRoomId(room) ? room : null,
    view,
    slide: slide >= 0 && slide <= 1 ? slide : null,
    at: spot ?? spawnAt(q.get("at"), Number(yaw ?? 0)),
    adult: q.get("adult") === "1",
    join: joinAt(q.get("join")),
    fov,
    dist,
    pitch,
    height,
    cam: parseCamFlag(q.get("cam")),
    heistend,
  };
}

export function parseCamFlag(value: string | null): CamFlag | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) {
    return { kind: "relative", off: [parts[0], parts[1], parts[2]] };
  }
  if (parts.length === 6) {
    return {
      kind: "world",
      eye: [parts[0], parts[1], parts[2]],
      look: [parts[3], parts[4], parts[5]],
    };
  }
  return null;
}

function joinAt(value: string | null): Flags["join"] {
  const match = /^([a-z0-9-]+)\.([0-9]{1,2})$/.exec(value ?? "");
  const room = match?.[1] ?? null;
  const copy = Number(match?.[2]);
  // your own flat or cell has no copy anyone else can join
  if (!isRoomId(room) || SOLO_ROOMS.has(room)) return null;
  return copy >= 1 && copy <= MAX_COPY ? { room, copy } : null;
}

/** The link that brings a friend into this room copy (`?join=`). */
export function inviteLink(origin: string, room: RoomId, copy: number): string {
  return `${origin}/?join=${room}.${copy}`;
}

function spawnAt(value: string | null, yaw: number): Spawn | null {
  const parts = value?.split(",").map(Number);
  if (!parts || parts.length !== 2 || !parts.every(Number.isFinite))
    return null;
  return {
    position: [parts[0], parts[1]],
    yaw: Number.isFinite(yaw) ? yaw : 0,
  };
}

/**
 * The tier this visit starts on, before React runs: the `?quality` flag,
 * else the saved setting (`rawSave` is the stored save, or null). Null
 * means auto, which starts high and steps down only if frames struggle.
 */
export function bootTier(
  search: string,
  rawSave: string | null,
): QualityTier | null {
  const saved = loadSave(rawSave, "").settings.graphics;
  return (
    readFlags(search).quality ?? (saved.preset === "auto" ? null : saved.tier)
  );
}
