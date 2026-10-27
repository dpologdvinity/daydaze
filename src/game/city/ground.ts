// What the city's ground is underfoot, for the footstep sounds: pavement,
// the boardwalk's planks, beach sand or the park lawn. Pure.
import { BOARDWALK, PARK, WATER_Z } from "./layout.ts";

export type Ground = "pavement" | "wood" | "sand" | "grass";

/** The ground at a city point (x, z in meters). */
export function groundAt(x: number, z: number): Ground {
  if (z >= BOARDWALK.z0 && z <= BOARDWALK.z1) return "wood";
  if (z > BOARDWALK.z1 && z < WATER_Z) return "sand";
  if (x >= PARK.x0 && x <= PARK.x1 && z >= PARK.z0 && z <= PARK.z1)
    return "grass";
  return "pavement";
}
