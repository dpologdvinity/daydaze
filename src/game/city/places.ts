// Fast-travel spots: one sidewalk point per neighborhood, for the city map.
import { ROOMS, type RoomId, type Spawn } from "../rooms.ts";
import {
  BUILDINGS,
  CITY_SPAWN,
  GALLERY_Z,
  SHORE_Z,
  VOLLEYBALL,
  type Neighborhood,
} from "./layout.ts";
import { neighborhoodAt } from "./cells.ts";
import { BUS_STOPS } from "./transit.ts";
import { ADULT_ROOMS } from "../age.ts";

export type Place = { id: Neighborhood; label: string; spawn: Spawn };

export const CITY_PLACES: readonly Place[] = [
  { id: "downtown", label: "Downtown", spawn: CITY_SPAWN },
  {
    id: "nightlife-row",
    label: "Nightlife Row",
    spawn: { position: [100, 9], yaw: 0 },
  },
  {
    id: "little-manila",
    label: "Little Manila",
    spawn: { position: [-345, 9], yaw: 0 },
  },
  {
    id: "chinatown-koreatown",
    label: "Chinatown & Koreatown",
    spawn: { position: [290, 9], yaw: 0 },
  },
  {
    id: "arts-district",
    label: "Arts District",
    spawn: { position: [-40, GALLERY_Z + 8], yaw: Math.PI },
  },
  { id: "uptown", label: "Uptown", spawn: { position: [250, -280], yaw: 0 } },
  {
    id: "suburbia",
    label: "Suburbia",
    spawn: { position: [-400, GALLERY_Z + 8], yaw: Math.PI },
  },
  {
    id: "beachside",
    label: "Beachside",
    spawn: { position: [8, 290], yaw: 0 },
  },
  {
    id: "fairground",
    label: "The Fairground",
    spawn: { position: [300, SHORE_Z - 13.5], yaw: 0 },
  },
];

/** Outdoor destinations with no door, for the map's directory. */
export const OUTDOOR_SPOTS: readonly {
  label: string;
  neighborhood: Neighborhood;
  spawn: Spawn;
}[] = [
  ...BUS_STOPS.map((s) => ({
    label: `Bus stop: ${s.name}`,
    neighborhood: neighborhoodAt(s.at),
    spawn: { position: s.at, yaw: s.yaw },
  })),
  {
    label: "Beach volleyball",
    neighborhood: "beachside",
    // on the sand at the near end of the net, facing it
    spawn: {
      position: [VOLLEYBALL.x - VOLLEYBALL.half - 2, VOLLEYBALL.z + 2],
      yaw: Math.PI / 2,
    },
  },
];

export type VenuePlace = {
  room: RoomId;
  label: string;
  neighborhood: Neighborhood;
  /** Just outside its city door, facing away from it. */
  spawn: Spawn;
};

/** Every venue with a door on the city's streets, for the map's directory:
 * you land on the sidewalk outside it, where its exit puts you. */
export const VENUE_PLACES: readonly VenuePlace[] = BUILDINGS.flatMap(
  (b): VenuePlace[] => {
    const room = b.door?.target;
    // the 18+ rooms stay off the map until the age check ships
    if (!room || room === "city" || ADULT_ROOMS.has(room)) return [];
    const out = ROOMS[room].portals.find((p) => p.target === "city");
    if (!out) return [];
    return [
      {
        room,
        label: ROOMS[room].name,
        neighborhood: b.neighborhood,
        spawn: out.targetSpawn,
      },
    ];
  },
).filter((p, i, all) => all.findIndex((q) => q.room === p.room) === i);
