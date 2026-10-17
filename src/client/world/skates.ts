import type { RoomId } from "../../game/rooms.ts";
import { createStore } from "../rooms/shared/store.ts";

/** Where skates can go on: out on the streets, the rink and the skatepark. */
export const SKATE_ROOMS: ReadonlySet<RoomId> = new Set<RoomId>([
  "city",
  "roller-rink",
  "skatepark",
]);

/** How much faster than walking she rolls on skates. */
export const SKATE_SPEED = 1.8;

/** Whether the player has her roller skates on. */
export const skates = createStore({ on: false });

export function setSkates(on: boolean) {
  if (skates.get().on !== on) skates.set({ on });
}
