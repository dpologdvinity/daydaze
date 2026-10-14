// Values to tune by ear and by profile. Components and pure modules read
// these; nothing else hardcodes them.

/** Side of a streaming cell, in metres. */
export const CELL_SIZE = 64;
/** Cells within this many metres of the player are loaded. */
export const VIEW_RADIUS = 160;
/** The loaded set is rebuilt after the player moves this far, in metres. */
export const RELOAD_DISTANCE = 16;
/** Real neon point lights per quality tier; the world's key light is extra. */
export const POINT_LIGHTS = { low: 2, high: 6 } as const;
export const LIGHT_INTENSITY = 6;
export const LIGHT_DISTANCE = 34;
/** Simulation rate for walking, in steps per second. */
export const SIM_HZ = 50;
