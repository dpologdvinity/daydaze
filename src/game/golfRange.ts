// The driving range: a bucket of ten balls hit at target greens out on the
// range. A swing is a power and a strike: the strike's error (early or
// late) bends the ball left or right and costs distance. Pure and
// deterministic.
//
// Range space: x across, z out from the tee (+z downrange). Metres.

export type Vec3 = readonly [x: number, y: number, z: number];
export type Vec2 = readonly [x: number, z: number];

export const BALLS = 10;
export const MAX_CARRY = 230;

/** The target greens: where they sit, and the rings' radii. */
export const TARGETS: readonly { at: Vec2; points: number; color: string }[] = [
  { at: [-12, 60], points: 1, color: "#ff4fb3" },
  { at: [10, 100], points: 2, color: "#ffd84f" },
  { at: [-6, 150], points: 3, color: "#4fe3ff" },
  { at: [14, 200], points: 4, color: "#7dff6b" },
];
export const RINGS = [
  { r: 5, points: 100 },
  { r: 11, points: 50 },
  { r: 18, points: 20 },
] as const;

export type Swing = {
  /** 0..1 how far back the backswing went. */
  power: number;
  /** The strike's timing, -1 (early) .. 1 (late); 0 is pure. */
  strike: number;
};

export type Shot = {
  /** Where it came to rest. */
  rest: Vec2;
  /** Its flight, for playback, 30 frames a second. */
  frames: readonly Vec3[];
  points: number;
  /** Which target it scored on, if any. */
  target: number | null;
};

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

export function hit(input: Swing): Shot {
  const power = Math.max(0, Math.min(1, finite(input.power)));
  const strike = Math.max(-1, Math.min(1, finite(input.strike)));
  // a mishit loses carry and bends: early pulls left, late pushes right
  const carry = MAX_CARRY * power * (1 - Math.abs(strike) * 0.35) + 10;
  const bend = strike * carry * 0.22;
  const height = 8 + carry * 0.12;
  const rollout = carry * 0.08;
  const frames: Vec3[] = [];
  const steps = Math.max(30, Math.round(carry / 3));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // the curve bends late in the flight, as a slice or hook does
    frames.push([bend * t * t, Math.sin(t * Math.PI) * height, carry * t]);
  }
  const rest: Vec2 = [bend * (1 + (rollout / carry) * 2), carry + rollout];
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    frames.push([bend + (rest[0] - bend) * t, 0, carry + rollout * t]);
  }
  let points = 0;
  let target: number | null = null;
  TARGETS.forEach((tg, i) => {
    const d = Math.hypot(rest[0] - tg.at[0], rest[1] - tg.at[1]);
    for (const ring of RINGS)
      if (d <= ring.r && ring.points * tg.points > points) {
        points = ring.points * tg.points;
        target = i;
      }
  });
  return { rest, frames, points, target };
}

export type Bucket = { shots: readonly Shot[] };
export const NEW_BUCKET: Bucket = { shots: [] };

export function bucketScore(b: Bucket): number {
  return b.shots.reduce((sum, s) => sum + s.points, 0);
}

export function bucketEmpty(b: Bucket): boolean {
  return b.shots.length >= BALLS;
}

export function addShot(b: Bucket, s: Shot): Bucket {
  return bucketEmpty(b) ? b : { shots: [...b.shots, s] };
}
