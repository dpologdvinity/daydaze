// Pure selection of the ambience appropriate to a place and its daylight.
import type { RoomId } from "../game/rooms.ts";
import type { Neighborhood } from "../game/city/layout.ts";
import { daylightAt } from "../game/city/daylight.ts";

export type AmbienceId =
  "city-day" | "city-night" | "beach" | "park" | "stadium" | "fountain";
export function ambienceFor(
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
