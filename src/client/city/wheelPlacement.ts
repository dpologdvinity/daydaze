// Puts one of a body's four wheels in its frame (BODY_WHEELS): the lone wheel
// mesh of a body GLB, centered on the origin with its hub toward +x, moved to
// the axle, turned by the road it has rolled and, at the front, by the steering.
import * as THREE from "three";
import type { WheelLayout } from "../../game/driving/wheels.ts";

/** The wheels in the order they are drawn: front right, front left, rear right, rear left. */
export const WHEELS_PER_CAR = 4;

const at = new THREE.Vector3();
const size = new THREE.Vector3();
const steer = new THREE.Quaternion();
const spin = new THREE.Quaternion();
const flip = new THREE.Quaternion();
const left = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const axle = new THREE.Vector3(1, 0, 0);
flip.setFromAxisAngle(up, Math.PI);

/**
 * Writes wheel `index` (0 to 3) of a car into `out`, in the car's frame.
 * `travel` is the meters the car has rolled forward (a wheel turns travel /
 * radius), `steerAngle` how far the front wheels are turned, and `scale` sizes
 * a wheel mesh borrowed from another body to this one's radius.
 */
export function wheelMatrix(
  out: THREE.Matrix4,
  layout: WheelLayout,
  index: number,
  travel: number,
  steerAngle: number,
  scale = 1,
): THREE.Matrix4 {
  const front = index < 2;
  const right = index % 2 === 0;
  const side = right ? 1 : -1;
  at.set(
    side * (front ? layout.frontX : layout.rearX),
    layout.radius,
    front ? layout.frontZ : layout.rearZ,
  );
  // the left wheels are the right wheel turned about, so they roll backwards
  // about their own axle
  spin.setFromAxisAngle(axle, (side * travel) / layout.radius);
  steer.setFromAxisAngle(up, front ? steerAngle : 0);
  steer.multiply(right ? spin : left.copy(flip).multiply(spin));
  return out.compose(at, steer, size.setScalar(scale));
}
