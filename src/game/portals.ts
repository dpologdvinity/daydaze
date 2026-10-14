import { areaOf, clampToArea } from "./area.ts";
import type { Portal, RoomDefinition, Spawn } from "./rooms.ts";
import type { Vec2 } from "./walk.ts";

export function portalAt(
  room: Pick<RoomDefinition, "portals">,
  p: Vec2,
): Portal | null {
  return (
    room.portals.find(
      ({ position: [x, z], radius }) =>
        (p[0] - x) ** 2 + (p[1] - z) ** 2 <= radius ** 2,
    ) ?? null
  );
}

export function arrive(target: RoomDefinition, spawn: Spawn): Spawn {
  return {
    position: clampToArea(areaOf(target), spawn.position),
    yaw: Number.isFinite(spawn.yaw) ? spawn.yaw : 0,
  };
}
