import type { Portal, RoomDefinition, Spawn } from "./rooms.ts";
import { clampToWalkable, type Vec2 } from "./walk.ts";

export function portalAt(room: RoomDefinition, p: Vec2): Portal | null {
  return (
    room.portals.find(
      ({ position: [x, z], radius }) =>
        (p[0] - x) ** 2 + (p[1] - z) ** 2 <= radius ** 2,
    ) ?? null
  );
}

export function arrive(target: RoomDefinition, spawn: Spawn): Spawn {
  return {
    position: clampToWalkable(target.walkable, spawn.position),
    yaw: Number.isFinite(spawn.yaw) ? spawn.yaw : 0,
  };
}
