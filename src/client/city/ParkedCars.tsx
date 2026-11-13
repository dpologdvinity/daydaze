// The cars parked along Downtown's kerbs (PARKED_CARS in
// src/game/city/dressing.ts), drawn from the same downloaded bodies as the
// traffic (trafficBodies.ts): one instanced draw per body and level of detail,
// only the cars within range of the player, repacked when she has moved.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { PARKED_CARS, parkedRange } from "../../game/city/dressing.ts";
import type { Player } from "../world/PlayerController.tsx";
import { useQuality } from "../world/quality.ts";
import { NEAR_BODY, useTrafficBodies } from "./trafficBodies.ts";

/** She must move this far before the cars are repacked. */
const REPACK = 2;

export function ParkedCars({ player }: { player: Player }) {
  const tier = useQuality();
  const bodies = useTrafficBodies(PARKED_CARS.length);
  const colors = useMemo(
    () => PARKED_CARS.map((car) => new THREE.Color(car.color)),
    [],
  );
  const packed = useRef({ x: Infinity, z: Infinity, tier: "" });

  useFrame(() => {
    const { x, z } = player.pos;
    const last = packed.current;
    if (Math.hypot(x - last.x, z - last.z) < REPACK && last.tier === tier)
      return;
    last.x = x;
    last.z = z;
    last.tier = tier;
    bodies.reset();
    PARKED_CARS.forEach((car, i) => {
      const distance = Math.hypot(car.x - x, car.z - z);
      if (distance > parkedRange(car, tier)) return;
      bodies.put(
        car.body,
        colors[i],
        car.x,
        car.z,
        car.yaw,
        tier === "low" || distance > NEAR_BODY,
      );
    });
    bodies.flush();
  });

  return (
    <>
      {bodies.all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}
