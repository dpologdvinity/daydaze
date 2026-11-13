// Where to walk up to a seat from. The sit-down clips put her back to the seat
// with the hips a step ahead of it, so she must arrive in front of the seat or
// beside it, never behind: from behind she would walk through the chair back
// (or onto a stool the wrong way round). In front is blocked at a bar or a
// table, so a side then. Pure; seats.ts runs it over every seat.

import type { Vec2 } from "./walk.ts";

/** How far from the seat's middle she stands to sit. */
export const APPROACH_RADIUS = 0.5;
/** She keeps this far (m) from another seat's middle, so she never stands in it. */
const SEAT_CLEARANCE = 0.35;

/**
 * The open spot to walk up from, or null when neither the front nor either
 * side is open (the caller keeps the seat's own). Front wins; between the
 * sides, the one with more room from the neighboring seats. `yaw` is the way
 * the seat faces; `others` are the other seats' middles; `free` says whether
 * a floor point can be stood on.
 */
export function openApproach(
  at: Vec2,
  yaw: number,
  others: readonly Vec2[],
  free: (p: Vec2) => boolean,
): Vec2 | null {
  const roomAround = (p: Vec2): number =>
    others.reduce(
      (least, o) => Math.min(least, Math.hypot(p[0] - o[0], p[1] - o[1])),
      Infinity,
    );
  const spot = (turn: number): Vec2 => [
    at[0] + Math.sin(yaw + turn) * APPROACH_RADIUS,
    at[1] + Math.cos(yaw + turn) * APPROACH_RADIUS,
  ];
  const open = (p: Vec2): boolean => free(p) && roomAround(p) >= SEAT_CLEARANCE;
  const front = spot(0);
  if (open(front)) return front;
  const sides = [spot(Math.PI / 2), spot(-Math.PI / 2)].filter(open);
  sides.sort((a, b) => roomAround(b) - roomAround(a));
  return sides[0] ?? null;
}
