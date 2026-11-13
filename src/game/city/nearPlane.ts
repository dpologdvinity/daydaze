// The camera's near clip plane for a view `away` meters from the player.
// The world camera's near plane is 0.05 m so a close-up never clips, but with
// far at 600 m a 24-bit depth buffer then resolves only ~7 cm at 250 m and
// ~19 cm at 400 m, so asphalt lying 4 cm over the ground z-fights with it from
// the overview and streets show as bare dark ground between their sidewalks.
// Pulled out, nothing is that close to the lens, so the near plane follows.

/** The closest near plane (the world camera's own), in meters. */
export const NEAR_MIN = 0.05;
/** The farthest near plane: the overview never sees anything nearer. */
export const NEAR_MAX = 2;
/** Near plane per meter of camera distance. */
const NEAR_PER_METER = 0.012;
/** Near planes are rounded up to a multiple of this, so a slow zoom isn't a
 * projection rebuild every frame. */
const STEP = 0.05;

/** The near plane (meters) for a camera `away` meters from the player. */
export function nearPlaneFor(away: number): number {
  const wanted = Math.min(NEAR_MAX, Math.max(NEAR_MIN, away * NEAR_PER_METER));
  return Math.max(NEAR_MIN, Math.ceil(wanted / STEP - 1e-9) * STEP);
}
