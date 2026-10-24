// A game's camera shot: while the game is active the camera eases to a fixed
// eye and target (snaps under reduced motion) and CameraRig's orbit stands
// down via cameraHold; it hands the view back when the game ends.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../../../game/motion/ball.ts";
import { useReducedMotion } from "../../../motion.ts";
import { cameraHold } from "../../../world/cameraHold.ts";

/**
 * Holds the camera at `eye` looking at `target` while `active`. The tuples are
 * read every frame, so a caller may move them (a following shot) by writing
 * into the same arrays.
 */
export function useGameShot(
  by: string,
  active: boolean,
  eye: Readonly<Vec3>,
  target: Readonly<Vec3>,
): void {
  const camera = useThree((s) => s.camera);
  const calm = useReducedMotion();
  const want = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      if (cameraHold.by === by) cameraHold.by = null;
    },
    [by],
  );
  useFrame((_, dt) => {
    if (!active) {
      if (cameraHold.by === by) cameraHold.by = null;
      return;
    }
    const first = cameraHold.by !== by;
    cameraHold.by = by;
    want.set(eye[0], eye[1], eye[2]);
    look.set(target[0], target[1], target[2]);
    const k = calm || first ? 1 : 1 - Math.exp(-dt * 4);
    camera.position.lerp(want, k);
    aim.lerp(look, k);
    camera.lookAt(aim);
  });
}
