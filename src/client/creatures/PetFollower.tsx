// Your pet in the world: it trots after you through the city and every room
// (pet.ts followStep keeps it beside you, never through you, sitting when you
// sit) and sleeps in the corner of your apartment until you come close. It is
// drawn with the Creature component, so it costs one draw call and a mixer.
// The canvas carries `data-pet-dist` and `data-pet-clip` for the browser tests.

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import { isBlocked, type WalkArea } from "../../game/area.ts";
import {
  followStep,
  placeBeside,
  sleeping,
  type Follower,
  type PetSave,
} from "../../game/pet.ts";
import type { RoomId } from "../../game/rooms.ts";
import type { Vec2 } from "../../game/walk.ts";
import type { Player } from "../world/PlayerController.tsx";
import { Creature, type CreaturePose } from "./Creature.tsx";

/** Where the pet's bed is in the apartment. */
export const PET_BED: Vec2 = [2.8, -1.6];

export function PetFollower({
  pet,
  room,
  area,
  player,
}: {
  pet: PetSave;
  room: RoomId;
  area: WalkArea;
  player: Player;
}): JSX.Element {
  const canvas = useThree((s) => s.gl.domElement);
  const frame = useRef(0);
  // a fresh start beside you (or in its bed) in every new room or arrival
  const state = useRef<Follower>({ x: 0, z: 0, yaw: 0, clip: "idle" });
  useMemo(() => {
    const you = { x: player.pos.x, z: player.pos.z, yaw: player.yaw };
    state.current =
      room === "apartment"
        ? { x: PET_BED[0], z: PET_BED[1], yaw: 0, clip: "sleep" }
        : placeBeside(you);
  }, [player, room]);
  useFrame(() => {
    frame.current += 1;
    if (frame.current % 20 !== 0) return;
    const f = state.current;
    canvas.dataset.petDist = String(
      Math.round(Math.hypot(player.pos.x - f.x, player.pos.z - f.z) * 10) / 10,
    );
    canvas.dataset.petClip = f.clip;
  });
  // reused every frame: where you are, and the wall test
  const you = useRef({ x: 0, z: 0, yaw: 0 }).current;
  const blocked = useMemo(() => (at: Vec2) => isBlocked(area, at), [area]);
  const drive = (dt: number, pose: CreaturePose) => {
    you.x = player.pos.x;
    you.z = player.pos.z;
    you.yaw = player.yaw;
    const f = state.current;
    // the next state is written over the last one, in place
    if (room === "apartment") sleeping(f, you, PET_BED, f);
    else
      followStep(
        f,
        you,
        Math.min(dt, 0.1),
        player.sitting || player.seat?.sit === true,
        blocked,
        f,
      );
    pose.x = f.x;
    pose.z = f.z;
    pose.yaw = f.yaw;
    pose.clip = f.clip;
  };
  return <Creature key={pet.kind} kind={pet.kind} drive={drive} />;
}
