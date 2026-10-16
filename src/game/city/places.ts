// Fast-travel spots: one sidewalk point per neighbourhood, for the city map.
import type { Spawn } from "../rooms.ts";
import { CITY_SPAWN, GALLERY_Z, SHORE_Z, type Neighborhood } from "./layout.ts";

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
