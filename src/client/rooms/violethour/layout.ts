import * as THREE from "three";

/** Walls: the side walls at x = ±WALL_X and the back at z = BACK_Z. The front is open to the street. */
export const WALL_X = 6;
export const BACK_Z = -6;
export const HEIGHT = 4;

/** The bar counter's front, along the back wall. */
export const BAR_Z = -4.9;
export const BAR_CENTRE_X = -2.3;
export const BAR_LENGTH = 6;

/** The pool table sits past the floor's right edge. */
export const POOL_TABLE = new THREE.Vector3(4.7, 0, -0.6);

/** The small dance floor's centre on the XZ plane. */
export const DANCE = new THREE.Vector2(-1, 1.4);

/** The regulars' corner: a round table and a sofa on the left wall. */
export const CORNER_TABLE = new THREE.Vector3(-4.3, 0, 3.6);
