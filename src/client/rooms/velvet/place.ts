import * as THREE from "three";
import { Batch, type Pose } from "../shared/batch.ts";

const UP = new THREE.Vector3(0, 1, 0);

/** Where a wall or prop sits in the room. Pieces are authored in its local space. */
export type Frame = {
  x?: number;
  y?: number;
  z?: number;
  ry?: number;
  s?: number;
};

/** Adds pieces authored in a frame's local space, baked to room space. */
export function inFrame(batch: Batch, frame: Frame) {
  const base = new THREE.Matrix4().compose(
    new THREE.Vector3(frame.x ?? 0, frame.y ?? 0, frame.z ?? 0),
    new THREE.Quaternion().setFromAxisAngle(UP, frame.ry ?? 0),
    new THREE.Vector3(frame.s ?? 1, frame.s ?? 1, frame.s ?? 1),
  );
  return {
    add(
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      pose: Pose = {},
    ) {
      const g = geometry
        .clone()
        .applyMatrix4(base.clone().multiply(local(pose)));
      batch.add(g, material);
      return this;
    },
  };
}

function local({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: Pose) {
  const s =
    typeof scale === "number"
      ? new THREE.Vector3(scale, scale, scale)
      : new THREE.Vector3(...scale);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    s,
  );
}
