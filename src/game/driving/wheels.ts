// Where each downloaded car body's wheels sit, and how they turn. The wheels
// are not part of a body's GLB meshes (public/models/cars/): the `tyre` and
// `rim` meshes hold ONE wheel around the origin, axle along x, which the client
// instances four times so each can spin by distance traveled and the front pair
// can steer. Pure data and arithmetic: no three.js, so the tests can read it.

import type { BodyKey } from "./bodies.ts";

/** One body's wheels in meters, in the body's frame (x right, y up, z toward
 * the nose). The wheels rest on the road, so a wheel's center is `radius` high. */
export type WheelLayout = {
  radius: number;
  /** Half the track at the front and rear axles. */
  frontX: number;
  rearX: number;
  /** The axles' distance along the body (front positive, rear negative). */
  frontZ: number;
  rearZ: number;
};

/** Printed as `CARWHEELS` by art/cars/import.py (scripts/import-cars.sh). */
export const BODY_WHEELS: Readonly<Record<BodyKey, WheelLayout>> = {
  sedan: {
    radius: 0.279,
    frontX: 0.735,
    rearX: 0.734,
    frontZ: 1.272,
    rearZ: -1.329,
  },
  hatch: {
    radius: 0.292,
    frontX: 0.776,
    rearX: 0.776,
    frontZ: 1.219,
    rearZ: -1.132,
  },
  suv: {
    radius: 0.365,
    frontX: 0.857,
    rearX: 0.887,
    frontZ: 1.471,
    rearZ: -1.397,
  },
  coupe: {
    radius: 0.288,
    frontX: 0.795,
    rearX: 0.764,
    frontZ: 1.317,
    rearZ: -1.391,
  },
  sports: {
    radius: 0.321,
    frontX: 0.831,
    rearX: 0.804,
    frontZ: 1.434,
    rearZ: -1.439,
  },
  cop: {
    radius: 0.354,
    frontX: 0.916,
    rearX: 0.886,
    frontZ: 1.47,
    rearZ: -1.483,
  },
  taxi: {
    radius: 0.285,
    frontX: 0.752,
    rearX: 0.75,
    frontZ: 1.3,
    rearZ: -1.358,
  },
  ambulance: {
    radius: 0.296,
    frontX: 1.04,
    rearX: 1.283,
    frontZ: 2.018,
    rearZ: -1.833,
  },
  schoolbus: {
    radius: 0.286,
    frontX: 1.22,
    rearX: 1.306,
    frontZ: 2.923,
    rearZ: -3.26,
  },
};

/**
 * The procedural jeepney's wheels in the same frame as a body's (x right, z
 * toward the nose): it is modeled with its nose on +x and its axles on z, so the
 * traffic turns this frame a quarter turn onto the jeepney (Traffic.tsx). The
 * 4 m wheelbase steers its front pair like any car's.
 */
export const JEEPNEY_WHEELS: WheelLayout = {
  radius: 0.36,
  frontX: 0.9,
  rearX: 0.9,
  frontZ: 1.95,
  rearZ: -1.7,
};

/** The front wheels never turn further than this, in radians (about 35 degrees). */
export const MAX_STEER = 0.6;

/**
 * The angle the front wheels are turned for a car that moved `ds` meters
 * (negative in reverse) while its heading changed by `dYaw` radians (positive
 * turns toward +x from +z): the bicycle model's atan(wheelbase * yaw rate /
 * speed). Zero when the car is not rolling, so a car turning on a spot or a
 * showroom turntable keeps its wheels straight.
 */
export function steerAngle(
  wheelbase: number,
  dYaw: number,
  ds: number,
): number {
  if (!(Math.abs(ds) > 1e-3) || !Number.isFinite(dYaw)) return 0;
  const wrapped = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  const angle = Math.atan((wheelbase * wrapped) / ds);
  return Math.max(-MAX_STEER, Math.min(MAX_STEER, angle));
}
