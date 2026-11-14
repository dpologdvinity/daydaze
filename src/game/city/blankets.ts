// The picnic blankets in front of the park's band shell and the seats on
// them. Kept apart from bandShell.ts so seats.ts (on the first load) doesn't
// pull in the band's tunes and, through them, the whole karaoke songbook.
import type { Vec2 } from "../walk.ts";
import { AUDIENCE, BLANKETS } from "./park.ts";

/** Blankets in front of the stage (the park's others are elsewhere). */
export const STAGE_BLANKETS: readonly Vec2[] = BLANKETS.filter(
  ([x, z]) =>
    x > AUDIENCE.x0 && x < AUDIENCE.x1 && z > AUDIENCE.z0 && z < AUDIENCE.z1,
);

/** A seat on a blanket: you sit on the grass, facing the stage. */
export type BlanketSeat = { id: string; at: Vec2 };

/** Seats are free spots on the blankets the crowd leaves, one per blanket
 * beside the two seated there (the middle). */
export const BLANKET_SEATS: readonly BlanketSeat[] = STAGE_BLANKETS.map(
  ([x, z], i) => ({
    id: `park-blanket-${i}`,
    at: [x, z + 0.1] as Vec2,
  }),
);
