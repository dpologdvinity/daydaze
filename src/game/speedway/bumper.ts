import type { Vec2 } from "../walk.ts";
import { stepCar, type CarInput, type CarState } from "../driving/car.ts";
import { BUMPER_CAR } from "../driving/roster.ts";

const HALF_X = 12;
const HALF_Z = 8;
const THICK = 3;
const RESTITUTION = 0.8;
const RADIUS = BUMPER_CAR.width / 2 + 0.1;

// shortcut: square corners, not rounded; round them if the scene wants softer corners.
export const ARENA: { walls: readonly (readonly Vec2[])[]; size: Vec2 } = {
  size: [HALF_X * 2, HALF_Z * 2],
  walls: [
    [
      [-HALF_X - THICK, HALF_Z],
      [HALF_X + THICK, HALF_Z],
      [HALF_X + THICK, HALF_Z + THICK],
      [-HALF_X - THICK, HALF_Z + THICK],
    ],
    [
      [-HALF_X - THICK, -HALF_Z - THICK],
      [HALF_X + THICK, -HALF_Z - THICK],
      [HALF_X + THICK, -HALF_Z],
      [-HALF_X - THICK, -HALF_Z],
    ],
    [
      [HALF_X, -HALF_Z],
      [HALF_X + THICK, -HALF_Z],
      [HALF_X + THICK, HALF_Z],
      [HALF_X, HALF_Z],
    ],
    [
      [-HALF_X - THICK, -HALF_Z],
      [-HALF_X, -HALF_Z],
      [-HALF_X, HALF_Z],
      [-HALF_X - THICK, HALF_Z],
    ],
  ],
};

export type Bumper = {
  id: string;
  state: CarState;
  isPlayer: boolean;
  hits: number;
};

function botInput(
  self: Bumper,
  all: readonly Bumper[],
  index: number,
  tick: number,
): CarInput {
  let target: Bumper | null = null;
  let best = Infinity;
  for (const other of all) {
    if (other === self) continue;
    const d = Math.hypot(
      other.state.position[0] - self.state.position[0],
      other.state.position[1] - self.state.position[1],
    );
    if (d < best) {
      best = d;
      target = other;
    }
  }
  // Wander: a slow per-car weave on top of chasing the nearest car.
  const weave = Math.sin(tick * 0.03 + index * 1.7) * 0.6;
  if (!target) return { throttle: 0.8, brake: 0, steer: weave };
  const want = Math.atan2(
    target.state.position[0] - self.state.position[0],
    target.state.position[1] - self.state.position[1],
  );
  const diff = Math.atan2(
    Math.sin(want - self.state.yaw),
    Math.cos(want - self.state.yaw),
  );
  return {
    throttle: 1,
    brake: 0,
    steer: Math.max(-1, Math.min(1, diff * 2 + weave)),
  };
}

function clampInside(p: Vec2): Vec2 {
  return [
    Math.max(-HALF_X + RADIUS, Math.min(HALF_X - RADIUS, p[0])),
    Math.max(-HALF_Z + RADIUS, Math.min(HALF_Z - RADIUS, p[1])),
  ];
}

/** One fixed tick: drive every car, then bounce overlapping pairs apart. */
export function stepBumpers(
  cars: readonly Bumper[],
  playerInput: CarInput,
  tick: number,
): readonly Bumper[] {
  const next = cars.map((car, i) => ({
    ...car,
    state: stepCar(
      BUMPER_CAR,
      car.state,
      car.isPlayer ? playerInput : botInput(car, cars, i, tick),
      ARENA.walls,
    ),
  }));
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < next.length; i++) {
      for (let j = i + 1; j < next.length; j++) {
        const a = next[i];
        const b = next[j];
        const dx = b.state.position[0] - a.state.position[0];
        const dz = b.state.position[1] - a.state.position[1];
        const d = Math.hypot(dx, dz);
        if (d >= 2 * RADIUS) continue;
        const n: Vec2 = d > 1e-9 ? [dx / d, dz / d] : [1, 0];
        const fa: Vec2 = [Math.sin(a.state.yaw), Math.cos(a.state.yaw)];
        const fb: Vec2 = [Math.sin(b.state.yaw), Math.cos(b.state.yaw)];
        const va: Vec2 = [fa[0] * a.state.speed, fa[1] * a.state.speed];
        const vb: Vec2 = [fb[0] * b.state.speed, fb[1] * b.state.speed];
        const closing = (vb[0] - va[0]) * n[0] + (vb[1] - va[1]) * n[1];
        let sa = a.state.speed;
        let sb = b.state.speed;
        let ha = a.hits;
        let hb = b.hits;
        if (closing < 0) {
          // Equal masses: exchange the normal component with restitution.
          const k = (-(1 + RESTITUTION) * closing) / 2;
          const nva: Vec2 = [va[0] - k * n[0], va[1] - k * n[1]];
          const nvb: Vec2 = [vb[0] + k * n[0], vb[1] + k * n[1]];
          const cap = BUMPER_CAR.topSpeed;
          sa = Math.max(-cap, Math.min(cap, nva[0] * fa[0] + nva[1] * fa[1]));
          sb = Math.max(-cap, Math.min(cap, nvb[0] * fb[0] + nvb[1] * fb[1]));
          ha++;
          hb++;
        }
        const push = (2 * RADIUS - d) / 2 + 1e-6;
        next[i] = {
          ...a,
          hits: ha,
          state: {
            ...a.state,
            speed: sa,
            position: clampInside([
              a.state.position[0] - n[0] * push,
              a.state.position[1] - n[1] * push,
            ]),
          },
        };
        next[j] = {
          ...b,
          hits: hb,
          state: {
            ...b.state,
            speed: sb,
            position: clampInside([
              b.state.position[0] + n[0] * push,
              b.state.position[1] + n[1] * push,
            ]),
          },
        };
      }
    }
  }
  return next;
}
