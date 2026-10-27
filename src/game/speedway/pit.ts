// Simple pit stop mechanics for Speedway races: driving into a pit box and
// holding at low speed services the car (fresh tires and refueling), resetting
// tire wear. Pure and deterministic.

import type { Vec2 } from "../walk.ts";
import type { CarState } from "../driving/car.ts";

/** Duration required stopped in pit box to complete a pit stop, in ms. */
export const PIT_SERVICE_MS = 2000;
/** Maximum speed (m/s) to count as stopped in the box for service. */
export const PIT_STOP_MAX_SPEED = 2.0;
/** Tire wear accumulation rate per meter traveled. */
export const TIRE_WEAR_PER_METER = 0.00025;

export type PitBox = {
  position: Vec2;
  radius: number;
};

export type PitState = {
  inBox: boolean;
  stoppedMs: number;
  serviced: boolean;
  stopsCompleted: number;
  tireWear: number; // 0..1, where 1 is fully worn
};

export function createPitState(): PitState {
  return {
    inBox: false,
    stoppedMs: 0,
    serviced: false,
    stopsCompleted: 0,
    tireWear: 0,
  };
}

/** Advances pit stop state by dtMs for a given car and pit box. */
export function stepPitState(
  state: PitState,
  car: CarState,
  box: PitBox,
  dtMs: number,
): PitState {
  const dist = Math.hypot(
    car.position[0] - box.position[0],
    car.position[1] - box.position[1],
  );
  const inBox = dist <= box.radius;

  // If inside pit box and stopped
  if (inBox) {
    if (Math.abs(car.speed) <= PIT_STOP_MAX_SPEED) {
      const nextStopped = state.stoppedMs + dtMs;
      if (nextStopped >= PIT_SERVICE_MS && !state.serviced) {
        return {
          inBox: true,
          stoppedMs: nextStopped,
          serviced: true,
          stopsCompleted: state.stopsCompleted + 1,
          tireWear: 0, // Fresh tires!
        };
      }
      return {
        ...state,
        inBox: true,
        stoppedMs: nextStopped,
      };
    } else {
      // Rolling through without stopping
      return {
        ...state,
        inBox: true,
        stoppedMs: 0,
      };
    }
  }

  // Outside pit box: reset inBox and serviced flag for next stop, accumulate tire wear
  const metersMoved = Math.abs(car.speed) * (dtMs / 1000);
  const newWear = Math.min(
    1,
    state.tireWear + metersMoved * TIRE_WEAR_PER_METER,
  );

  return {
    ...state,
    inBox: false,
    stoppedMs: 0,
    serviced: false,
    tireWear: newWear,
  };
}

/** Scales base car grip by tire wear (0 = fresh 100% grip, 1 = 70% grip). */
export function applyTireGrip(baseGrip: number, tireWear: number): number {
  const factor = 1 - Math.max(0, Math.min(1, tireWear)) * 0.3;
  return baseGrip * factor;
}
