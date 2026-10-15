import { nearestPointOnPolygon, pointInPolygon, type Vec2 } from "../walk.ts";
import { TICK_HZ } from "./fixedStep.ts";

export type CarClass =
  "beater" | "everyday" | "y2k" | "luxury" | "exotic" | "kart" | "bumper";

/** Units: m/s, m/s², rad/s, 0..1, m, coins. `basedOn` is a designer note, never shown in the UI. */
export type CarSpec = {
  id: string;
  name: string;
  basedOn: string;
  class: CarClass;
  topSpeed: number;
  accel: number;
  brake: number;
  turnRate: number;
  grip: number;
  length: number;
  width: number;
  seats: number;
  price: number;
};

/** throttle and brake 0..1, steer -1..1 (positive turns yaw positive). */
export type CarInput = { throttle: number; brake: number; steer: number };

/** Yaw follows walk.ts: 0 faces +z, pi/2 faces +x. Negative speed is reverse. */
export type CarState = { position: Vec2; yaw: number; speed: number };

const DT = 1 / TICK_HZ;
const COAST_DRAG = 2; // m/s² towards rest with no pedal pressed
const REVERSE_SHARE = 0.3; // reverse top speed as a share of topSpeed
const FULL_STEER_SPEED = 3; // m/s at which steering reaches full authority

function unit(value: number, min: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(min, value)) : 0;
}

function wrapYaw(yaw: number): number {
  const wrapped = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

function nextSpeed(
  spec: CarSpec,
  speed: number,
  throttle: number,
  brake: number,
): number {
  if (throttle > 0)
    return Math.min(spec.topSpeed, speed + spec.accel * throttle * DT);
  if (brake > 0) {
    // Brake while rolling forward; once stopped, the brake pedal reverses.
    if (speed > 0) return Math.max(0, speed - spec.brake * brake * DT);
    return Math.max(
      -spec.topSpeed * REVERSE_SHARE,
      speed - spec.accel * 0.6 * brake * DT,
    );
  }
  const drag = COAST_DRAG * DT;
  return Math.abs(speed) <= drag ? 0 : speed - Math.sign(speed) * drag;
}

/** Pushes a circle out of every wall; returns the outward normal of the last hit, or null. */
function resolveWalls(
  center: Vec2,
  radius: number,
  walls: readonly (readonly Vec2[])[],
): { center: Vec2; normal: Vec2 | null } {
  let c = center;
  let normal: Vec2 | null = null;
  // shortcut: tests every wall each substep; add an AABB pre-reject if a profile shows GC pressure.
  for (const wall of walls) {
    const nearest = nearestPointOnPolygon(wall, c);
    const dx = c[0] - nearest[0];
    const dz = c[1] - nearest[1];
    const d = Math.hypot(dx, dz);
    if (pointInPolygon(wall, c)) {
      // Centre is inside: leave through the nearest edge.
      const n: Vec2 = d > 1e-9 ? [-dx / d, -dz / d] : [0, -1];
      c = [nearest[0] + n[0] * radius, nearest[1] + n[1] * radius];
      normal = n;
    } else if (d < radius) {
      const n: Vec2 = d > 1e-9 ? [dx / d, dz / d] : [0, -1];
      c = [nearest[0] + n[0] * radius, nearest[1] + n[1] * radius];
      normal = n;
    }
  }
  return { center: c, normal };
}

/** One fixed tick of an arcade bicycle model. Walls are solid polygons the car stays out of. */
export function stepCar(
  spec: CarSpec,
  state: CarState,
  input: CarInput,
  walls: readonly (readonly Vec2[])[],
): CarState {
  const throttle = unit(input.throttle, 0);
  const brake = unit(input.brake, 0);
  const steer = unit(input.steer, -1);
  let speed = nextSpeed(
    spec,
    Number.isFinite(state.speed) ? state.speed : 0,
    throttle,
    brake,
  );

  // Lower grip loses steering authority as speed rises.
  const speedShare = Math.min(1, Math.abs(speed) / spec.topSpeed);
  const authority =
    Math.min(1, Math.abs(speed) / FULL_STEER_SPEED) *
    (spec.grip + (1 - spec.grip) * (1 - speedShare));
  const yaw = wrapYaw(
    state.yaw + steer * spec.turnRate * authority * Math.sign(speed) * DT,
  );

  const forward: Vec2 = [Math.sin(yaw), Math.cos(yaw)];
  const radius = spec.width / 2;
  const travel = Math.abs(speed) * DT;
  const substeps = Math.max(1, Math.ceil(travel / (radius * 0.5)));
  let position = state.position;
  for (let i = 0; i < substeps; i++) {
    const moved: Vec2 = [
      position[0] + (forward[0] * speed * DT) / substeps,
      position[1] + (forward[1] * speed * DT) / substeps,
    ];
    const hit = resolveWalls(moved, radius, walls);
    position = hit.center;
    if (hit.normal) {
      const into =
        (forward[0] * hit.normal[0] + forward[1] * hit.normal[1]) *
        Math.sign(speed);
      // Only the part of the motion that drives into the wall is lost.
      if (into < 0) speed *= 1 + into;
    }
  }
  return { position, yaw, speed };
}
