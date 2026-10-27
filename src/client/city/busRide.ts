// Bus scene/HUD bridge; requests are validated against the live route pose.
import { createStore } from "../rooms/shared/store.ts";
import type { BusPose } from "../../game/city/transit.ts";
export const busMotion: {
  active: boolean;
  seconds: number;
  pose: BusPose;
  request: "board" | "leave" | null;
} = {
  active: false,
  seconds: 0,
  pose: { x: 0, z: 0, yaw: 0, stop: -1, next: 0 },
  request: null,
};
export const busRide = createStore({
  riding: false,
  near: -1,
  stop: -1,
  next: 0,
  eta: 0,
});
