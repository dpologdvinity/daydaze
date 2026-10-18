import type { Vec2 } from "../walk.ts";
import type { CarInput, CarSpec, CarState } from "../driving/car.ts";
import type { Track } from "./track.ts";

export type BotSkill = "easy" | "medium" | "hard";

const LOOKAHEAD: Record<BotSkill, number> = { easy: 6, medium: 9, hard: 12 };
const SPEED_CAP: Record<BotSkill, number> = {
  easy: 0.7,
  medium: 0.85,
  hard: 0.97,
};
/** Bots read this far ahead to slow for corners. */
const CORNER_PREVIEW = 30;

function nearestIndex(line: readonly Vec2[], p: Vec2): number {
  let best = 0;
  let bestSq = Infinity;
  for (let i = 0; i < line.length; i++) {
    const sq = (line[i][0] - p[0]) ** 2 + (line[i][1] - p[1]) ** 2;
    if (sq < bestSq) {
      bestSq = sq;
      best = i;
    }
  }
  return best;
}

/** Walks `distance` meters along the closed centerline from index `from`. */
function pointAhead(
  line: readonly Vec2[],
  from: number,
  distance: number,
): Vec2 {
  const n = line.length;
  let left = distance;
  let i = from;
  for (let k = 0; k < n; k++) {
    const a = line[i];
    const b = line[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len >= left)
      return [
        a[0] + ((b[0] - a[0]) * left) / len,
        a[1] + ((b[1] - a[1]) * left) / len,
      ];
    left -= len;
    i = (i + 1) % n;
  }
  return line[from];
}

function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const yawOf = (from: Vec2, to: Vec2) =>
  Math.atan2(to[0] - from[0], to[1] - from[1]);

/** Pure pursuit along the centerline, slowing for the sharpest bend in view. */
export function botInput(
  track: Track,
  spec: CarSpec,
  state: CarState,
  skill: BotSkill,
): CarInput {
  const line = track.centerline;
  const i = nearestIndex(line, state.position);
  const target = pointAhead(
    line,
    i,
    LOOKAHEAD[skill] + Math.max(0, state.speed) * 0.25,
  );
  const steer = Math.max(
    -1,
    Math.min(1, wrap(yawOf(state.position, target) - state.yaw) * 2.5),
  );

  // Turn radius the bend needs, from the heading change over the preview distance.
  const near = pointAhead(line, i, 2);
  const mid = pointAhead(line, i, CORNER_PREVIEW / 2);
  const far = pointAhead(line, i, CORNER_PREVIEW);
  const bend = Math.abs(wrap(yawOf(mid, far) - yawOf(near, mid))) + 1e-6;
  const radius = CORNER_PREVIEW / 2 / bend;
  const cornerSpeed = spec.turnRate * spec.grip * radius * 0.8;
  const desired = Math.min(spec.topSpeed * SPEED_CAP[skill], cornerSpeed);

  if (state.speed < desired) return { throttle: 1, brake: 0, steer };
  if (state.speed > desired + 1)
    return {
      throttle: 0,
      brake: Math.min(1, (state.speed - desired) / 5),
      steer,
    };
  return { throttle: 0, brake: 0, steer };
}
