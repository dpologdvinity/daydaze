// A ball's flight for the in-world games (volleyball, the water guns' spray,
// a dive's arc): physics-lite parabolas under gravity, and bounces that lose
// energy. Pure math, no three.js; positions are written into a caller's
// vector so a scene allocates nothing per frame.

/** A point or velocity in meters (per second): x, y (up), z. */
export type Vec3 = [number, number, number];

/** Gravity, m/s². */
export const GRAVITY = 9.81;

/** A flight: where it left, how fast, and how long until it lands. */
export type Flight = {
  from: Vec3;
  /** Launch velocity, m/s. */
  velocity: Vec3;
  /** Seconds from launch to landing. */
  duration: number;
};

/**
 * A lob from `from` to `to` that peaks at height `apex` (raised to clear
 * both ends if it is lower), under real gravity.
 */
export function lob(from: Vec3, to: Vec3, apex: number): Flight {
  const top = Math.max(apex, from[1], to[1]);
  const vy = Math.sqrt(2 * GRAVITY * (top - from[1]));
  const duration = vy / GRAVITY + Math.sqrt((2 * (top - to[1])) / GRAVITY);
  // a lob with no height and no drop still takes a moment to arrive
  const t = Math.max(duration, 1e-3);
  return {
    from: [from[0], from[1], from[2]],
    velocity: [(to[0] - from[0]) / t, vy, (to[2] - from[2]) / t],
    duration: t,
  };
}

/** Where the ball is `t` seconds into the flight, written into `out`. */
export function ballAt(flight: Flight, t: number, out: Vec3): Vec3 {
  const [x, y, z] = flight.from;
  const [vx, vy, vz] = flight.velocity;
  out[0] = x + vx * t;
  out[1] = y + vy * t - 0.5 * GRAVITY * t * t;
  out[2] = z + vz * t;
  return out;
}

/**
 * The hop after a landing: the ball leaves the landing spot with its speed
 * scaled by `restitution` (clamped to [0, 0.95], so it always loses energy)
 * and comes back down to the same height.
 */
export function bounce(flight: Flight, restitution: number): Flight {
  const e = Math.min(0.95, Math.max(0, restitution));
  const from = ballAt(flight, flight.duration, [0, 0, 0]);
  const [vx, vy, vz] = flight.velocity;
  const up = Math.abs(vy - GRAVITY * flight.duration) * e;
  return {
    from,
    velocity: [vx * e, up, vz * e],
    duration: Math.max((2 * up) / GRAVITY, 1e-3),
  };
}
