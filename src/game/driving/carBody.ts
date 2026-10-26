// Car bodies lofted from a side profile. The profile is the car seen from the
// side ([z as a share of length, height in meters], nose at +z, as in
// src/client/rooms/speedway/carModels.ts). Slicing it along the length gives,
// at each slice, how high the body runs; each slice becomes a rounded cross
// section (a superellipse) that narrows toward the roof (tumblehome) and,
// near the nose and tail, toward the middle (plan taper), so the shell has
// the soft sides and rounded corners of a real car instead of slab sides.
// Pure: returns plain position and index arrays (x across, y up, z forward).

export type Pt = readonly [number, number];

export type LoftOptions = {
  length: number;
  width: number;
  /** Slices along the length, and points around each slice. */
  sections?: number;
  ring?: number;
  /** How much the top narrows, 0..1 (a greenhouse leans in more). */
  tumble?: number;
  /** How much the nose and tail narrow, 0..1. */
  taper?: number;
  /** Superellipse exponent: 2 is an ellipse, higher is boxier. */
  round?: number;
};

/** The profile's [low, high] at `z` (a share of length), or null outside it. */
export function profileSpan(
  pts: readonly Pt[],
  z: number,
): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (!a || !b) continue;
    const [z0, y0] = a;
    const [z1, y1] = b;
    if (z < Math.min(z0, z1) || z > Math.max(z0, z1)) continue;
    // a vertical edge spans its whole height at that z
    const ys = z0 === z1 ? [y0, y1] : [y0 + ((z - z0) / (z1 - z0)) * (y1 - y0)];
    for (const y of ys) {
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  return hi > lo ? [lo, hi] : null;
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** A closed shell lofted from `pts`: positions (xyz) and triangle indices,
 * wound outward. */
export function loftBody(
  pts: readonly Pt[],
  {
    length,
    width,
    sections = 40,
    ring = 24,
    tumble = 0.14,
    taper = 0.22,
    round = 5,
  }: LoftOptions,
): { positions: Float32Array; indices: Uint32Array } {
  const zs = pts.map((p) => p[0]);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const rings: { z: number; lo: number; hi: number }[] = [];
  for (let k = 0; k <= sections; k++) {
    // slices bunch up at the ends, where the shape turns fastest
    const s = 0.5 - 0.5 * Math.cos((Math.PI * k) / sections);
    const z = z0 + 0.001 + s * (z1 - z0 - 0.002);
    const span = profileSpan(pts, z);
    if (span) rings.push({ z, lo: span[0], hi: span[1] });
  }
  const positions: number[] = [];
  const indices: number[] = [];
  const e = 2 / round;
  for (const { z, lo, hi } of rings) {
    const share = (2 * Math.abs(z - (z0 + z1) / 2)) / (z1 - z0);
    const half = (width / 2) * (1 - taper * smooth((share - 0.65) / 0.35) ** 2);
    const mid = (lo + hi) / 2;
    const tall = (hi - lo) / 2;
    for (let i = 0; i < ring; i++) {
      const a = (2 * Math.PI * i) / ring;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const y = mid + Math.sign(s) * Math.abs(s) ** e * tall;
      // the upper part of the side leans in toward the top
      const up = smooth((y - (lo + 0.45 * (hi - lo))) / (0.55 * (hi - lo)));
      const x = Math.sign(c) * Math.abs(c) ** e * half * (1 - tumble * up * up);
      positions.push(x, y, z * length);
    }
  }
  const n = rings.length;
  for (let k = 0; k + 1 < n; k++)
    for (let i = 0; i < ring; i++) {
      const a = k * ring + i;
      const b = k * ring + ((i + 1) % ring);
      const c = (k + 1) * ring + i;
      const d = (k + 1) * ring + ((i + 1) % ring);
      indices.push(a, b, c, b, d, c);
    }
  // caps: a fan from each end slice's middle
  for (const [k, face] of [
    [0, -1],
    [n - 1, 1],
  ] as const) {
    const r = rings[k];
    if (!r) continue;
    const centre = positions.length / 3;
    positions.push(0, (r.lo + r.hi) / 2, r.z * length);
    for (let i = 0; i < ring; i++) {
      const p = k * ring + i;
      const q = k * ring + ((i + 1) % ring);
      if (face > 0) indices.push(centre, p, q);
      else indices.push(centre, q, p);
    }
  }
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
  };
}
