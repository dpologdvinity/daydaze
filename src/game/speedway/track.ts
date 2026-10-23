import type { Vec2 } from "../walk.ts";

export type Track = {
  id: string;
  name: string;
  /** Closed loop, driven in index order. Index 0 sits on the start and finish line. */
  centerline: readonly Vec2[];
  width: number;
  /** Checkpoint 0 is the start and finish line. */
  checkpoints: readonly { a: Vec2; b: Vec2 }[];
  /** Unit driving direction across each checkpoint. */
  checkpointForward: readonly Vec2[];
  grid: readonly { position: Vec2; yaw: number }[];
};

const BARRIER_THICKNESS = 3;
const CHECKPOINTS = 8;

function arc(
  cx: number,
  cz: number,
  r: number,
  from: number,
  to: number,
  steps: number,
): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 1; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    out.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return out;
}

function line(a: Vec2, b: Vec2, spacing: number): Vec2[] {
  const n = Math.max(
    1,
    Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / spacing),
  );
  const out: Vec2[] = [];
  for (let i = 1; i <= n; i++)
    out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  return out;
}

/** A rounded rectangle loop starting mid bottom edge, heading +x. */
function roundedLoop(halfX: number, halfZ: number, r: number): Vec2[] {
  const sx = halfX - r;
  const sz = halfZ - r;
  const pts: Vec2[] = [[0, -halfZ]];
  pts.push(...line([0, -halfZ], [sx, -halfZ], 8));
  pts.push(...arc(sx, -sz, r, -Math.PI / 2, 0, 8));
  if (sz > 0) pts.push(...line([halfX, -sz], [halfX, sz], 8));
  pts.push(...arc(sx, sz, r, 0, Math.PI / 2, 8));
  pts.push(...line([sx, halfZ], [-sx, halfZ], 8));
  pts.push(...arc(-sx, sz, r, Math.PI / 2, Math.PI, 8));
  if (sz > 0) pts.push(...line([-halfX, sz], [-halfX, -sz], 8));
  pts.push(...arc(-sx, -sz, r, Math.PI, (3 * Math.PI) / 2, 8));
  pts.push(...line([-sx, -halfZ], [0, -halfZ], 8));
  pts.pop(); // the last point repeats the first
  return pts;
}

/** Smooth 0..1..0 bump over [start, end] with ramps of `ramp` meters. */
function bump(x: number, start: number, end: number, ramp: number): number {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  if (x <= start || x >= end) return 0;
  if (x < start + ramp) return smooth((x - start) / ramp);
  if (x > end - ramp) return smooth((end - x) / ramp);
  return 1;
}

function tangentAt(pts: readonly Vec2[], i: number): Vec2 {
  const n = pts.length;
  const a = pts[(i - 1 + n) % n];
  const b = pts[(i + 1) % n];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
}

/** Left of the driving direction. */
function normalAt(pts: readonly Vec2[], i: number): Vec2 {
  const [tx, tz] = tangentAt(pts, i);
  return [-tz, tx];
}

function build(
  id: string,
  name: string,
  centerline: Vec2[],
  width: number,
): Track {
  const n = centerline.length;
  const checkpoints: { a: Vec2; b: Vec2 }[] = [];
  const checkpointForward: Vec2[] = [];
  const half = width / 2 + 0.5;
  for (let k = 0; k < CHECKPOINTS; k++) {
    const i = Math.round((k * n) / CHECKPOINTS) % n;
    const p = centerline[i];
    const nm = normalAt(centerline, i);
    checkpoints.push({
      a: [p[0] + nm[0] * half, p[1] + nm[1] * half],
      b: [p[0] - nm[0] * half, p[1] - nm[1] * half],
    });
    checkpointForward.push(tangentAt(centerline, i));
  }
  // Two columns, three rows behind the start line, facing the driving direction.
  const start = centerline[0];
  const fwd = tangentAt(centerline, 0);
  const left = normalAt(centerline, 0);
  const yaw = Math.atan2(fwd[0], fwd[1]);
  const grid: { position: Vec2; yaw: number }[] = [];
  for (let row = 1; row <= 3; row++) {
    for (const side of [1, -1]) {
      const back = row * 7 - (side === 1 ? 0 : 3.5);
      grid.push({
        position: [
          start[0] - fwd[0] * back + left[0] * side * (width / 4),
          start[1] - fwd[1] * back + left[1] * side * (width / 4),
        ],
        yaw,
      });
    }
  }
  return { id, name, centerline, width, checkpoints, checkpointForward, grid };
}

const neonOval = build("neon-oval", "Neon Oval", roundedLoop(100, 40, 40), 14);

const boardwalkLoop = build(
  "boardwalk-loop",
  "Boardwalk Loop",
  // A chicane jogs the back straight 9 m inwards.
  roundedLoop(110, 60, 30).map(([x, z]): Vec2 =>
    z > 59 ? [x, z - 9 * bump(x, -45, 45, 25)] : [x, z],
  ),
  12,
);

export const TRACKS: readonly Track[] = [neonOval, boardwalkLoop];

/** The Marina's jet-ski course out past the yachts, marked by buoys. */
export const HARBOR_RUN = build(
  "harbor-run",
  "Harbor Run",
  roundedLoop(45, 18, 14),
  10,
);

/** Solid barrier quads along both edges of the road. */
export function trackWalls(track: Track): readonly (readonly Vec2[])[] {
  const pts = track.centerline;
  const n = pts.length;
  const inner = track.width / 2;
  const outer = inner + BARRIER_THICKNESS;
  const offset = (i: number, side: number, d: number): Vec2 => {
    const nm = normalAt(pts, i);
    return [pts[i][0] + nm[0] * side * d, pts[i][1] + nm[1] * side * d];
  };
  const walls: Vec2[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    for (const side of [1, -1]) {
      walls.push([
        offset(i, side, inner),
        offset(j, side, inner),
        offset(j, side, outer),
        offset(i, side, outer),
      ]);
    }
  }
  return walls;
}
