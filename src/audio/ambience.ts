// Pure selection of the ambience appropriate to a place and its daylight.
import type { RoomId } from "../game/rooms.ts";
import type { Neighborhood } from "../game/city/layout.ts";
import { daylightAt } from "../game/city/daylight.ts";

/** Every looped sound file (public/audio/<id>.ogg). */
export const AMBIENCE_IDS = [
  "city-day",
  "city-night",
  "beach",
  "park",
  "stadium",
  "fountain",
  "music-boardwalk",
  "music-lounge",
] as const;
export type AmbienceId = (typeof AMBIENCE_IDS)[number];

/** Ids that are music beds: played on the music bus, instead of a jukebox track. */
export function isMusicBed(id: AmbienceId): boolean {
  return id.startsWith("music-");
}

const BED = 0.2;
const BOARDWALK_ROOMS: readonly RoomId[] = ["surf-shack", "tiki-bar"];
const LOUNGE_ROOMS: readonly RoomId[] = [
  "velvet-room",
  "violet-hour",
  "green-haze",
  "wine-bar",
];

/** Ambience plus the quiet music bed (if any) for a place. */
export function ambienceFor(
  room: RoomId,
  district: Neighborhood,
  hour: number,
  inPark = false,
): Partial<Record<AmbienceId, number>> {
  const levels = ambienceBase(room, district, hour);
  // in Uptown's park: birdsong and the fountain, the traffic fading
  if (room === "city" && inPark) {
    levels.park = 0.3;
    levels.fountain = 0.2;
    for (const k of ["city-day", "city-night"] as const)
      if (levels[k]) levels[k] = (levels[k] ?? 0) * 0.5;
  }
  if (
    BOARDWALK_ROOMS.includes(room) ||
    (room === "city" && district === "beachside")
  )
    levels["music-boardwalk"] = BED;
  if (LOUNGE_ROOMS.includes(room)) levels["music-lounge"] = BED;
  return levels;
}

function ambienceBase(
  room: RoomId,
  district: Neighborhood,
  hour: number,
): Partial<Record<AmbienceId, number>> {
  if (room === "city") {
    if (district === "beachside") return { beach: 0.3 };
    if (district === "suburbia") return { park: 0.3 };
    const night = daylightAt(hour).neon;
    return { "city-day": 0.3 * (1 - night), "city-night": 0.3 * night };
  }
  if (room === "stadium" || room === "gridiron" || room === "speedway")
    return { stadium: 0.3 };
  if (room === "marina" || room === "mermaid-cove" || room === "mini-golf")
    return { beach: 0.3 };
  if (room === "zoo") return { park: 0.3 };
  if (room === "plaza") return { fountain: 0.3 };
  return {};
}

/**
 * Whether the sound files cover a place's ambience: some non-music file in
 * `levels` is audible and has not `failed` (to load or decode, as on a
 * browser without Ogg Opus). When they don't, the synthesized bed plays.
 */
export function filesCover(
  levels: Partial<Record<AmbienceId, number>>,
  failed: ReadonlySet<AmbienceId>,
): boolean {
  return AMBIENCE_IDS.some(
    (id) => !!levels[id] && !isMusicBed(id) && !failed.has(id),
  );
}
