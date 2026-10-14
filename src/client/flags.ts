import { isRoomId, type RoomId } from "../game/rooms.ts";
import type { View } from "./world/CameraRig.tsx";
import type { QualityTier } from "./world/quality.ts";

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
};

const VIEW_IDS: readonly View[] = ["room", "full", "face"];

export function readFlags(search: string): Flags {
  const q = new URLSearchParams(search);
  const quality = q.get("quality");
  const room = q.get("room");
  const view = VIEW_IDS.find((v) => v === q.get("view")) ?? null;
  return {
    quality: quality === "low" || quality === "high" ? quality : null,
    still: q.get("still") === "1",
    debug: q.get("debug") === "1",
    room: isRoomId(room) ? room : null,
    view,
  };
}
