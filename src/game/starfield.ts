// The night sky for the stargazing night: where each star sits on the dome,
// how big and how warm it is, plus a faint Milky Way band and the path of an
// occasional shooting star. Pure, no React or three.js: the client
// (src/client/rooms/StarDome.tsx) draws it far behind the scene.

/** A fixed pseudo-random 0..1 per index and slot. */
function rand(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Stars as parallel arrays, ready to become vertex attributes. */
export type StarField = {
  count: number;
  /** Unit directions from the viewer, three floats a star, all above the horizon. */
  dir: Float32Array;
  /** On-screen size in pixels, 1.3 to 5. */
  size: Float32Array;
  /** 0 a cool blue-white, 0.5 white, 1 a warm gold. */
  warmth: Float32Array;
  /** Brightness 0..1. */
  bright: Float32Array;
  /** A random phase for each star's twinkle. */
  phase: Float32Array;
};

/** The lowest a star may sit (sine of its elevation): the sky, not the rooftops. */
const HORIZON = 0.03;

/** The Milky Way's plane normal, tilted across the sky. */
const BAND: readonly [number, number, number] = (() => {
  const n: [number, number, number] = [0.35, 0.8, 0.5];
  const l = Math.hypot(...n);
  return [n[0] / l, n[1] / l, n[2] / l];
})();

/**
 * `field` scattered stars over the whole sky, and `band` dim ones crowded along
 * the Milky Way. Most are tiny points; a few are bright and large.
 */
export function starField(field: number, band: number): StarField {
  const count = field + band;
  const f: StarField = {
    count,
    dir: new Float32Array(count * 3),
    size: new Float32Array(count),
    warmth: new Float32Array(count),
    bright: new Float32Array(count),
    phase: new Float32Array(count),
  };
  // two axes in the band's plane to walk round it
  const u: [number, number, number] = [BAND[1], -BAND[0], 0];
  const ul = Math.hypot(...u);
  u[0] /= ul;
  u[1] /= ul;
  const v: [number, number, number] = [
    BAND[1] * u[2] - BAND[2] * u[1],
    BAND[2] * u[0] - BAND[0] * u[2],
    BAND[0] * u[1] - BAND[1] * u[0],
  ];
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;
    const inBand = i >= field;
    // draw directions until one is above the horizon
    for (let tries = 0; ; tries++) {
      const k = tries * 7;
      if (inBand) {
        const a = rand(i, 1 + k) * Math.PI * 2;
        // a bell-shaped spread across the band, a few percent of the sky wide
        const off =
          (rand(i, 2 + k) + rand(i, 3 + k) + rand(i, 4 + k) - 1.5) * 0.28;
        x = Math.cos(a) * u[0] + Math.sin(a) * v[0] + off * BAND[0];
        y = Math.cos(a) * u[1] + Math.sin(a) * v[1] + off * BAND[1];
        z = Math.cos(a) * u[2] + Math.sin(a) * v[2] + off * BAND[2];
      } else {
        // uniform on the sphere
        y = rand(i, 1 + k) * 2 - 1;
        const a = rand(i, 2 + k) * Math.PI * 2;
        const r = Math.sqrt(1 - y * y);
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      }
      const l = Math.hypot(x, y, z);
      x /= l;
      y /= l;
      z /= l;
      if (y > HORIZON || tries > 40) {
        if (y <= HORIZON) y = HORIZON + 0.01 + rand(i, 99) * 0.3;
        const m = Math.hypot(x, y, z);
        x /= m;
        y /= m;
        z /= m;
        break;
      }
    }
    f.dir.set([x, y, z], i * 3);
    const big = rand(i, 5);
    f.size[i] = inBand ? 1.3 + big * 0.6 : 1.6 + 3.4 * big ** 24;
    f.bright[i] = inBand ? 0.15 + big * 0.3 : 0.45 + 0.55 * rand(i, 6);
    f.warmth[i] = rand(i, 7);
    f.phase[i] = rand(i, 8);
  }
  return f;
}

/** Seconds between shooting stars, when in the cycle one starts, and its length. */
const STREAK_EVERY = 11;
const STREAK_AT = 4;
const STREAK_LEN = 0.9;

/**
 * Where a shooting star is at clock `t`, `lag` seconds behind its head (for a
 * trail), as a unit direction into `out`; false when it isn't streaking. Each
 * one starts somewhere new, high in the sky, and falls across it.
 */
export function shootingStarPoint(
  t: number,
  lag: number,
  out: [number, number, number],
): boolean {
  const cycle = Math.floor(t / STREAK_EVERY);
  const local = t - cycle * STREAK_EVERY - STREAK_AT;
  if (local < 0 || local > STREAK_LEN) return false;
  const p = (local - lag) / STREAK_LEN;
  if (p < 0 || p > 1) return false;
  const az = rand(cycle, 11) * Math.PI * 2 + p * 0.5;
  // from high (sine 0.9) down to about 0.45 over the streak
  const y = 0.55 + rand(cycle, 12) * 0.35 - p * 0.4;
  const r = Math.sqrt(1 - y * y);
  out[0] = Math.cos(az) * r;
  out[1] = y;
  out[2] = Math.sin(az) * r;
  return true;
}
