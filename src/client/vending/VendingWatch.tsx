// Measures, once a frame, whether the player is within reach of a vending
// machine (the room's own, or the avenue's from the city plan) and tells the
// panel. Nothing is allocated per frame: the machine lists are built once.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import { FURNITURE } from "../../game/city/dressing.ts";
import type { RoomId } from "../../game/rooms.ts";
import {
  ROOM_MACHINES,
  machineNear,
  type Machine,
} from "../../game/vending.ts";
import type { Player } from "../world/PlayerController.tsx";
import { vendingNear } from "./vendingNear.ts";

const STREET: readonly Machine[] = FURNITURE.filter(
  (f) => f.kind === "vending",
);

/** The machines in `room`: the city's along its avenues, else the venue's own. */
export function machinesIn(room: RoomId): readonly Machine[] {
  if (room === "city") return STREET;
  return room in ROOM_MACHINES
    ? ROOM_MACHINES[room as keyof typeof ROOM_MACHINES]
    : [];
}

export function VendingWatch({
  room,
  player,
}: {
  room: RoomId;
  player: Player;
}): JSX.Element | null {
  const machines = useMemo(() => machinesIn(room), [room]);
  useEffect(() => () => vendingNear.set({ near: false }), [machines]);
  useFrame(() => {
    if (machines.length === 0) return;
    const near =
      !player.seat && machineNear(machines, player.pos.x, player.pos.z);
    if (near !== vendingNear.get().near) vendingNear.set({ near });
  });
  return null;
}
