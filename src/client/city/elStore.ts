// What the El ride looks like to the HUD: where you are in the trip, the
// station you stand near, and your request for a trip. ElRide (in the 3D
// scene) drives it; ElPanel (in the dock) reads it and files requests.
import type { ElStation, ElTrip } from "../../game/city/el.ts";
import { createStore } from "../rooms/shared/store.ts";

export type ElStatus =
  | { kind: "idle" }
  /** Standing on the platform, the train not in yet. */
  | { kind: "waiting"; trip: ElTrip }
  | { kind: "riding"; trip: ElTrip };

export type ElRequest = { to: ElStation["id"] } | "cancel" | null;
type ElState = {
  status: ElStatus;
  /** The station whose stairs she is near, else null. */
  near: ElStation | null;
  /** A trip the panel asks for: to this station id, or "cancel". */
  request: ElRequest;
};
const IDLE: ElState = { status: { kind: "idle" }, near: null, request: null };

export const elRide = createStore<ElState>(IDLE);
/** Back to nothing happening (the scene unmounted). */
export const resetElRide = () => elRide.set(IDLE);
