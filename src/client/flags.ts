// Parses the client's URL flags (?quality, ?still, ?debug, ?room, ?view,
// ?slide, ?at and ?yaw, ?adult) into typed values. Invalid values become null
// or false; nothing here enforces the age gate.

import { isRoomId, type RoomId, type Spawn } from "../game/rooms.ts";
import type { View } from "./world/CameraRig.tsx";
import type { QualityTier } from "./world/quality.ts";

/** Every URL flag, already validated. */
export type Flags = {
  /** `?quality=low|high` forces a tier. */
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
  /** `?at=0,300` starts the room at that point (x, z), facing `yaw` (0). */
  at: Spawn | null;
  /** `?adult=1` opens the 18+ rooms, in a development build only (adult.ts). */
  adult: boolean;
};

const VIEW_IDS: readonly View[] = ["room", "full", "face", "detail"];

/** Reads the flags from a location.search string. */
export function readFlags(search: string): Flags {
  const q = new URLSearchParams(search);
  const quality = q.get("quality");
  const room = q.get("room");
  const slide = Number(q.get("slide") ?? Number.NaN);
  const view = VIEW_IDS.find((v) => v === q.get("view")) ?? null;
  return {
    quality: quality === "low" || quality === "high" ? quality : null,
    still: q.get("still") === "1",
    debug: q.get("debug") === "1",
    room: isRoomId(room) ? room : null,
    view,
    slide: slide >= 0 && slide <= 1 ? slide : null,
    at: spawnAt(q.get("at"), Number(q.get("yaw") ?? 0)),
    adult: q.get("adult") === "1",
  };
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
