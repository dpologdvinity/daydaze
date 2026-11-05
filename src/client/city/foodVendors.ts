// Shared walk-up counter state; live checks protect purchases after leaving a stop.
import { createStore } from "../rooms/shared/store.ts";
import type { Player } from "../world/PlayerController.tsx";
import { driving } from "../world/driving.ts";
import {
  ICE_CREAM_ROUTE,
  canOrderFood,
  type FoodKind,
} from "../../game/city/vendors.ts";
export const foodVendors = createStore({
  near: null as FoodKind | null,
  vendors: 0,
  stop: -1,
});
export const foodMotion = {
  player: null as Player | null,
  origin: null as number | null,
  pose: { x: 0, z: 0, yaw: 0, stop: -1, next: 0 },
};
export function walkingForFood(): boolean {
  const player = foodMotion.player;
  return (
    !!player &&
    !player.seat &&
    !player.walk.leaving &&
    !driving.session &&
    !driving.passenger
  );
}
export function foodCounterOpen(kind: FoodKind): boolean {
  const player = foodMotion.player;
  if (!player || foodMotion.origin === null) return false;
  ICE_CREAM_ROUTE.at(
    performance.now() / 1000 - foodMotion.origin,
    foodMotion.pose,
  );
  return canOrderFood(
    kind,
    [player.pos.x, player.pos.z],
    foodMotion.pose,
    walkingForFood(),
  );
}
