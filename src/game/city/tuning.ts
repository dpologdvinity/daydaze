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
