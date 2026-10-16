import * as THREE from "three";

/** Half the room's width: walls stand at x = ±ROOM and z = -ROOM. */
export const ROOM = 6;
export const BOOTH = new THREE.Vector3(4.2, 0, 0.7);
export const DANCE = new THREE.Vector3(-2.4, 0, 1.5);

/** Close-up camera pose on the bar's glowing back shelves. */
export const DETAIL_SHOT = {
  eye: [-1.4, 1.7, -2.6] as const,
  look: [-1.0, 1.7, -5.6] as const,
};
