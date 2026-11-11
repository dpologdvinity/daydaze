// Where each downloaded car body's head and tail lamps are, for the night glow
// drawn around them (src/client/city/carGlow.ts). Pure data: no three.js.

import type { BodyKey } from "./bodies.ts";

/** A lamp pair's right-hand lamp in meters, in the body's frame (x right, y up,
 * z toward the nose); the left lamp is its mirror across x = 0. */
export type LampSpot = readonly [x: number, y: number, z: number];

/** Printed as `CARLAMPS` by art/cars/import.py (scripts/import-cars.sh). */
export const BODY_LAMPS: Readonly<
  Record<BodyKey, { head: LampSpot; tail: LampSpot }>
> = {
  sedan: { head: [0.644, 0.495, 2.117], tail: [0.567, 0.724, -2.007] },
  hatch: { head: [0.631, 0.547, 1.771], tail: [0.616, 0.792, -1.672] },
  suv: { head: [0.77, 0.701, 2.133], tail: [0.705, 0.996, -2.035] },
  coupe: { head: [0.635, 0.525, 2.0], tail: [0.516, 0.75, -1.967] },
  sports: { head: [0.652, 0.587, 2.033], tail: [0.615, 0.88, -1.971] },
  cop: { head: [0.724, 0.581, 2.126], tail: [0.723, 0.885, -2.095] },
  taxi: { head: [0.658, 0.506, 2.164], tail: [0.58, 0.74, -2.052] },
  ambulance: { head: [0.865, 0.761, 2.95], tail: [1.379, 0.56, -2.885] },
  schoolbus: { head: [1.236, 0.466, 3.93], tail: [1.181, 0.655, -3.898] },
};

/** Two head and two tail halos a car (the client draws one quad for each). */
export const HALOS_PER_CAR = 4;

/** What a car's night glow costs: the halo quads and one headlight-pool quad,
 * two triangles each, in two draws shared by every car (src/game/city/budget.ts). */
export const GLOW_TRIS_PER_CAR = (HALOS_PER_CAR + 1) * 2;
export const GLOW_DRAWS = 2;
