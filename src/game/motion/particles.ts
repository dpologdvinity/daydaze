// Seeded particle bursts for the in-world games: sand puffs, splashes, light
// bursts on a hit. A burst is data (one direction, speed and lifetime per
// particle); a scene samples it each frame into its instanced mesh.

import { seeded } from "../penalty.ts";

/** A point in meters: x, y (up), z. */
export type Vec3 = [number, number, number];

/** One particle: a unit direction, a launch speed and a lifetime. */
export type Particle = {
  dir: Vec3;
  speed: number;
  /** Seconds until it has faded out, at most the burst's lifetime. */
  life: number;
};

/** A seeded burst of particles from the origin. */
export type Burst = {
  particles: readonly Particle[];
  /** The longest any particle lives, seconds. */
  lifetime: number;
  /** Downward pull, m/s². */
  gravity: number;
};

/** How a burst flies: top speed, lifetime, and how upward it throws (0-1). */
export type BurstSpec = {
  speed: number;
  lifetime: number;
  /** 0 throws mostly sideways (a sand puff), 1 mostly up (a splash). */
  up?: number;
  gravity?: number;
};

/** A burst of `count` particles; the same seed always gives the same burst. */
export function burst(seed: number, count: number, spec: BurstSpec): Burst {
  const rand = seeded(seed);
  const up = Math.min(1, Math.max(0, spec.up ?? 0.5));
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    // always some lift, more as `up` grows
    const y = 0.25 + up * (0.45 + 0.3 * rand());
    const flat = Math.sqrt(Math.max(0, 1 - y * y));
    particles.push({
      dir: [Math.cos(angle) * flat, y, Math.sin(angle) * flat],
      speed: spec.speed * (0.55 + 0.45 * rand()),
      life: spec.lifetime * (0.6 + 0.4 * rand()),
    });
  }
  return { particles, lifetime: spec.lifetime, gravity: spec.gravity ?? 9.81 };
}

/**
 * Where particle `p` is `t` seconds into the burst, written into `out`;
 * returns its opacity, 1 at the start and 0 from the end of its life.
 */
export function particleAt(
  b: Burst,
  p: Particle,
  t: number,
  out: Vec3,
): number {
  const s = Math.min(Math.max(0, t), p.life);
  const v = p.speed * s;
  out[0] = p.dir[0] * v;
  out[1] = p.dir[1] * v - 0.5 * b.gravity * s * s;
  out[2] = p.dir[2] * v;
  return t >= p.life ? 0 : 1 - Math.max(0, t) / p.life;
}
