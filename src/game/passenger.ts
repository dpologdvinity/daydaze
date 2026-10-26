// Passengers: a driver offers a friend a ride over the `game` relay; the
// friend accepts and rides along, out of sight in the car, carried by the
// driver's moves (their own position follows the car's passenger seat, so
// their name tag and the camera ride along too). Either side can stop. Pure:
// the codec and the seat geometry; src/client/net/ride.ts does the sending.

import { MAX_GAME_DATA } from "../net/networkProtocol.ts";

export type RideMessage =
  { k: "ride-offer" } | { k: "ride-accept" } | { k: "ride-stop" };

export const encodeRide = (m: RideMessage) => JSON.stringify(m);

/** A relayed message, if it's a ride message and well formed. */
export function parseRideMessage(data: string): RideMessage | null {
  if (data.length > MAX_GAME_DATA) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const k: unknown = Reflect.get(value, "k");
  return k === "ride-offer" || k === "ride-accept" || k === "ride-stop"
    ? { k }
    : null;
}

/** Meters from the car's middle to the passenger seat. */
const SEAT = 0.4;
/** Meters from the car's middle to where a passenger stands after getting out. */
const DOOR = 1.6;

/** `d` meters to the right of a car at (x, z) facing `yaw` (0 faces +z),
 * written into `out` (a frame loop passes its own, to allocate nothing). */
function rightOf(
  x: number,
  z: number,
  yaw: number,
  d: number,
  out: [number, number],
): [number, number] {
  out[0] = x - d * Math.cos(yaw);
  out[1] = z + d * Math.sin(yaw);
  return out;
}

/** Where the passenger is, for a car at (x, z) facing `yaw`. */
export const passengerSeat = (
  x: number,
  z: number,
  yaw: number,
  out: [number, number] = [0, 0],
) => rightOf(x, z, yaw, SEAT, out);

/** Where the passenger stands after getting out, by the passenger door. */
export const stepOut = (x: number, z: number, yaw: number) =>
  rightOf(x, z, yaw, DOOR, [0, 0]);
