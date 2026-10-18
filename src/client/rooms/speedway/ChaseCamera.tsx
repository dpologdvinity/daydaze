import { useFrame, useThree } from "@react-three/fiber";
import type { RefObject } from "react";
import * as THREE from "three";
import { driving } from "../../world/driving.ts";
import { useReducedMotion } from "../../motion.ts";

// Reduced motion gets the steadier, higher shot with no shake. Damping is
// the share of the gap closed per 60 Hz frame, so it holds at any frame rate.
const CHASE = {
  calm: { back: 9, up: 5, damping: 0.05, shake: 0 },
  lively: { back: 6, up: 2.5, damping: 0.1, shake: 0.03 },
} as const;
const SIDE = { out: 10, up: 3.5 };

const goal = new THREE.Vector3();
const aim = new THREE.Vector3();

/**
 * Follows the player's car from behind, or from its right in side view. The
 * car's yaw uses walk.ts's convention: forward is (sin yaw, cos yaw) in x, z.
 */
export function ChaseCamera({
  target,
}: {
  target: RefObject<THREE.Object3D | null>;
}) {
  const camera = useThree((s) => s.camera);
  const calm = useReducedMotion();
  useFrame((state, dt) => {
    const car = target.current;
    const session = driving.session;
    if (!car || !session) return;
    const { x, z } = car.position;
    const fx = Math.sin(car.rotation.y);
    const fz = Math.cos(car.rotation.y);
    const base = calm ? CHASE.calm : CHASE.lively;
    // the arena is far smaller than a track, so its shot stands further off
    const scale = session.kind === "bumpers" ? 2 : 1;
    const back = base.back * scale;
    const up = base.up * scale;
    const speed =
      session.kind === "race"
        ? session.race.cars[0].state.speed
        : session.kind === "city"
          ? session.car.speed
          : session.cars[0].state.speed;
    const shake =
      base.shake *
      Math.min(1, Math.abs(speed) / 20) *
      Math.sin(state.clock.elapsedTime * 31);
    if (driving.sideView) {
      // the right-hand side, which is (-fz, fx) for this heading
      goal.set(x - fz * SIDE.out, SIDE.up, z + fx * SIDE.out);
      aim.set(x, 1, z);
    } else {
      goal.set(x - fx * back, up, z - fz * back);
      aim.set(x + fx * 2, 1, z + fz * 2);
    }
    goal.x += shake;
    const ease = 1 - Math.pow(1 - base.damping, dt * 60);
    camera.position.lerp(goal, ease);
    camera.lookAt(aim);
  });
  return null;
}
