import * as THREE from "three";

/** Walls: the side walls at x = ±WALL_X and the back at z = BACK_Z. The street side is open. */
export const WALL_X = 6.6;
export const BACK_Z = -7;

/** The DJ booth's counter front, against the back of the dance floor. */
export const DJ_BOOTH = new THREE.Vector3(0, 0, -5.3);
/** The bartender's counter runs down the left wall. */
export const BAR_X = -5.9;
/** The dance floor's centre on the XZ plane. */
export const DANCE = new THREE.Vector2(0, 1.2);

/** Podium centres; the dancers stand on top at PODIUM_TOP. */
export const PODIUMS: readonly THREE.Vector3[] = [
  new THREE.Vector3(-3.4, 0, -5.1),
  new THREE.Vector3(3.4, 0, -5.1),
];
export const PODIUM_TOP = 0.5;
