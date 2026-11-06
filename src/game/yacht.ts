// Pure route and timing logic for the Starlight yacht cruise: a loop around
// Starboard Bay, with waypoints, speed, progress and "board / return to dock"
// lifecycle. No React or three.js; tested in src/game/yacht.test.ts.

/** One waypoint on the cruise route: position in world XZ, label for debug. */
export interface Waypoint {
  readonly x: number;
  readonly z: number;
  readonly label: string;
}

/**
 * The cruise route: a closed loop of waypoints around Starboard Bay. The ship
 * leaves the dock (index 0), rounds the bay anti-clockwise and returns. Units
 * are meters in the room's local space.
 */
export const ROUTE: readonly Waypoint[] = [
  { x: 0, z: 0, label: "dock" },
  { x: -18, z: -8, label: "west-channel" },
  { x: -32, z: -28, label: "north-west" },
  { x: -18, z: -50, label: "open-bay" },
  { x: 0, z: -58, label: "far-north" },
  { x: 18, z: -50, label: "east-open" },
  { x: 30, z: -28, label: "north-east" },
  { x: 18, z: -8, label: "east-channel" },
];

/** Total waypoint count. */
export const LEG_COUNT = ROUTE.length;

/**
 * Speed of the yacht along the route, in meters per second. Gentle cruise.
 */
export const CRUISE_SPEED = 2.4;

/** Radius at which the ship is considered to have reached a waypoint. */
export const WAYPOINT_RADIUS = 1.5;

/** Seconds at dock before the cruise begins (boarding window). */
export const BOARD_WINDOW_S = 15;

/**
 * Full period of one loop: the boarding window plus the time to cruise every
 * leg at {@link CRUISE_SPEED}. This ensures all legs are reachable.
 */
export const LOOP_PERIOD_S: number =
  BOARD_WINDOW_S +
  ((): number => {
    let total = 0;
    for (let i = 0; i < ROUTE.length; i++) {
      const a = ROUTE[i];
      const b = ROUTE[(i + 1) % ROUTE.length];
      total += Math.hypot(b.x - a.x, b.z - a.z);
    }
    return total / CRUISE_SPEED;
  })();

/** The yacht's state at a given time. */
export interface YachtState {
  /** Current world position in the room's local XZ space. */
  x: number;
  z: number;
  /** Heading in radians (atan2 of forward direction, 0 = +Z). */
  heading: number;
  /** Whether the ship is at the dock and boarding is open. */
  atDock: boolean;
  /** Progress through the full loop, 0..1. */
  loopProgress: number;
  /** Active leg index (0 = dock → west-channel, etc.). */
  leg: number;
}

/**
 * Compute the yacht's position and heading at `tSec` seconds (a monotonic
 * clock, e.g. `Date.now() / 1000` or elapsed from a fixed epoch).
 *
 * The ship loops continuously. During the first {@link BOARD_WINDOW_S} of each
 * loop it sits at the dock (atDock = true); after that it cruises the route.
 */
export function yachtStateAt(tSec: number): YachtState {
  // Wrap into one loop period.
  const phase = ((tSec % LOOP_PERIOD_S) + LOOP_PERIOD_S) % LOOP_PERIOD_S;

  if (phase < BOARD_WINDOW_S) {
    const dock = ROUTE[0];
    const next = ROUTE[1];
    return {
      x: dock.x,
      z: dock.z,
      heading: Math.atan2(next.x - dock.x, next.z - dock.z),
      atDock: true,
      loopProgress: 0,
      leg: 0,
    };
  }

  // Cruise phase: map elapsed cruise time to distance along route.
  const cruiseElapsed = phase - BOARD_WINDOW_S;
  const cruiseDist = cruiseElapsed * CRUISE_SPEED;

  // Walk the route legs to find position.
  let remaining = cruiseDist;
  for (let i = 0; i < ROUTE.length; i++) {
    const a = ROUTE[i];
    const b = ROUTE[(i + 1) % ROUTE.length];
    const legDist = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= legDist || i === ROUTE.length - 1) {
      const t = legDist > 0 ? Math.min(remaining / legDist, 1) : 0;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      return {
        x,
        z,
        heading,
        atDock: false,
        loopProgress: phase / LOOP_PERIOD_S,
        leg: i,
      };
    }
    remaining -= legDist;
  }

  // Fallback: return dock (should never be reached).
  const dock = ROUTE[0];
  return {
    x: dock.x,
    z: dock.z,
    heading: 0,
    atDock: true,
    loopProgress: 1,
    leg: 0,
  };
}

/**
 * How much the deck bobs vertically at `tSec`. Returns a Y offset in meters;
 * the caller adds it to the deck group's position.
 */
export function deckBob(tSec: number): number {
  return Math.sin(tSec * 0.52) * 0.06 + Math.sin(tSec * 0.83) * 0.03;
}

/**
 * Gentle deck roll (rotation around Z-axis) in radians, for a subtle tilt.
 */
export function deckRoll(tSec: number): number {
  return Math.sin(tSec * 0.44) * 0.015 + Math.sin(tSec * 0.71) * 0.008;
}

/** Total route length in meters (for distance-to-time conversions). */
export const ROUTE_LENGTH_M: number = ((): number => {
  let total = 0;
  for (let i = 0; i < ROUTE.length; i++) {
    const a = ROUTE[i];
    const b = ROUTE[(i + 1) % ROUTE.length];
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
})();

/** Gangway portal center in the marina's room space (on the dock). */
export const GANGWAY_AT: readonly [number, number] = [0, -4.8];

/** Where the player spawns when they board the yacht. */
export const YACHT_SPAWN: readonly [number, number] = [0, 2.0];

/** Where the player stands to disembark (gangway exit on the yacht). */
export const DISEMBARK_AT: readonly [number, number] = [0, -6.0];
