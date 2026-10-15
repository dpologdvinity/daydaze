import type { Vec2 } from "../walk.ts";

/** Where the bumper arena sits in the Speedway room. */
export const ARENA_ORIGIN: Vec2 = [36, -2];

/**
 * Where each race track sits in the Speedway room, behind the grandstand. The
 * Boardwalk Loop's walls reach 69 m from its origin, so it sits 7 m clear of
 * the oval's far wall (origin z -84 + 50) on the far side.
 */
export const TRACK_ORIGINS: Readonly<
  Record<"neon-oval" | "boardwalk-loop", Vec2>
> = {
  "neon-oval": [0, -84],
  "boardwalk-loop": [0, -210],
};
