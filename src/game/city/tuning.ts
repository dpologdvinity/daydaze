// Values to tune by ear and by profile. Components and pure modules read
// these; nothing else hardcodes them.

/** Side of a streaming cell, in meters. */
export const CELL_SIZE = 64;
/** Cells within this many meters of the player are loaded. */
export const VIEW_RADIUS = 160;
/** The loaded set is rebuilt after the player moves this far, in meters. */
export const RELOAD_DISTANCE = 16;
/** Real neon point lights per quality tier; the world's key light is extra. */
export const POINT_LIGHTS = { low: 2, high: 4 } as const;
export const LIGHT_INTENSITY = 6;
export const LIGHT_DISTANCE = 34;
/** Simulation rate for walking, in steps per second. */
export const SIM_HZ = 50;
/** New York bays are drawn on buildings this near the player, per tier. */
export const BAY_RANGE = { low: 50, high: 90 } as const;
/** On the low tier, street trees past this many meters are left out. */
export const TREE_LOW_FAR = 70;
/** At most this many walkers are drawn as dolls (Pedestrians.tsx), per tier;
 * the low tier leaves the rest to the instanced crowd, a doll being 13k
 * triangles to a crowd figure's 880. */
export const PEDESTRIAN_DOLLS = { low: 1, high: 4 } as const;
/** How far (m) from the player the walkers' dolls are picked, per tier. */
export const PEDESTRIAN_DOLL_RADIUS = { low: 40, high: 55 } as const;
/** Beyond the dolls: the rest of the crowd within this far, as small people. */
export const CROWD_RADIUS = { low: 50, high: 110 } as const;
/** The crowd's cap per look (four looks), so at most four times this many. */
export const CROWD_CAP = 24;
