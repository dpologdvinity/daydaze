// Drafting (slipstream) mechanics for Speedway races: trailing cars within a
// wake behind leading cars gain acceleration and top speed boosts. Pure and
// deterministic.

import type { CarSpec, CarState } from "../driving/car.ts";

export const DRAFT_MIN_DIST = 1.5;
export const DRAFT_MAX_DIST = 22;
export const DRAFT_LATERAL_TOLERANCE = 2.4;
export const DRAFT_MIN_SPEED = 12;

/**
 * Calculates draft strength (0..1) of a trailing car behind other cars.
 * Returns the highest draft factor among all cars ahead.
 */
export function calcDraft(
  trailer: CarState,
  others: readonly CarState[],
): number {
  if (trailer.speed < DRAFT_MIN_SPEED) return 0;

  // Trailer forward vector (yaw 0 is +z, pi/2 is +x)
  const sinY = Math.sin(trailer.yaw);
  const cosY = Math.cos(trailer.yaw);
  // Forward unit vector: [sinY, cosY]
  // Right unit vector: [cosY, -sinY]

  let best = 0;
  for (const lead of others) {
    if (lead === trailer || lead.speed < DRAFT_MIN_SPEED * 0.7) continue;

    const dx = lead.position[0] - trailer.position[0];
    const dz = lead.position[1] - trailer.position[1];

    // Longitudinal distance along trailer heading
    const fwdDist = dx * sinY + dz * cosY;
    if (fwdDist < DRAFT_MIN_DIST || fwdDist > DRAFT_MAX_DIST) continue;

    // Lateral distance perpendicular to trailer heading
    const latDist = Math.abs(dx * cosY - dz * sinY);
    if (latDist > DRAFT_LATERAL_TOLERANCE) continue;

    // Factor drops with forward distance and lateral offset
    const fwdFactor =
      1 - (fwdDist - DRAFT_MIN_DIST) / (DRAFT_MAX_DIST - DRAFT_MIN_DIST);
    const latFactor = 1 - latDist / DRAFT_LATERAL_TOLERANCE;
    const factor = Math.max(0, Math.min(1, fwdFactor * latFactor));
    if (factor > best) best = factor;
  }

  return best;
}

/**
 * Returns a car spec with top speed and acceleration scaled by drafting strength.
 * Up to +12% top speed and +30% acceleration at full draft.
 */
export function applyDraftBonus(spec: CarSpec, draft: number): CarSpec {
  if (draft <= 0) return spec;
  const clamped = Math.max(0, Math.min(1, draft));
  return {
    ...spec,
    topSpeed: spec.topSpeed * (1 + 0.12 * clamped),
    accel: spec.accel * (1 + 0.3 * clamped),
  };
}
