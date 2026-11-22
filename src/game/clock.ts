// Event clocks for schedules every player shares (dance-offs, Pride night,
// fireworks, the parade). Tests and screenshots pin a clock to a moment in an
// event so a slow page load can never miss the window.

/** A clock in seconds on an event's schedule. */
export interface EventClock {
  /** The clock's time, seconds. */
  read(): number;
  /** Lets a held clock run on from where it was held; no-op otherwise. */
  release(): void;
}

/** Milliseconds to add to this device's clock to get the server's (0: unsynced). */
let serverOffset = 0;
let synced = false;
/** Offsets closer than this to the current one are network jitter, not drift. */
const RESYNC_MS = 250;
/** The largest time a `Date` can hold, ms. */
const MAX_DATE_MS = 8.64e15;

/**
 * Takes the server's clock (epoch ms, as it stamped a message) against this
 * device's `localMs` at receipt, so every player's shared schedules (lights,
 * walkers, events, traffic) run on the server's time, not on each device's
 * own. Later readings move the offset only past `RESYNC_MS`. A value that is
 * not a plausible time is ignored.
 */
export function syncServerClock(serverMs: number, localMs = Date.now()): void {
  if (!Number.isFinite(serverMs) || serverMs < 0 || serverMs > MAX_DATE_MS)
    return;
  const offset = serverMs - localMs;
  if (!synced || Math.abs(offset - serverOffset) > RESYNC_MS) {
    serverOffset = offset;
    synced = true;
  }
}

/** True once a server time has arrived (online and connected). */
export const clockSynced = (): boolean => synced;

/** Back to the device's own clock (tests). A session that loses its server
 * keeps the offset: server time is still the best guess, and resetting would
 * make every shared schedule jump. */
export function resetServerClock(): void {
  serverOffset = 0;
  synced = false;
}

/** The shared wall clock, seconds: the server's once synced, else the device's. */
export const wallSeconds = (): number => (Date.now() + serverOffset) / 1000;

/**
 * A clock held `into` seconds into an event that comes round every `every`
 * seconds, until `release()`; from then it runs on at real speed from the
 * held moment.
 */
export function heldClock(
  every: number,
  into: number,
  now: () => number = wallSeconds,
  slot = 1000,
): EventClock {
  const held = every * slot + into;
  let releasedAt: number | null = null;
  return {
    read: () => (releasedAt === null ? held : held + now() - releasedAt),
    release: () => {
      releasedAt ??= now();
    },
  };
}

/**
 * A clock shifted on its first read so it stands `into` seconds into an event
 * (negative: that long before one starts), then runs at real speed.
 */
export function shiftedClock(
  every: number,
  into: number,
  now: () => number = wallSeconds,
): EventClock {
  let offset: number | null = null;
  return {
    read: () => {
      const t = now();
      offset ??= every - (t % every) + into;
      return t + offset;
    },
    release: () => {},
  };
}

/**
 * Seconds to add to clock time `t` so it stands at the start of the next run
 * of an event that comes round every `every` seconds (0 if one starts now).
 * The dev panel uses it to set an event off on demand.
 */
export function toNextStart(t: number, every: number): number {
  const into = ((t % every) + every) % every;
  return into === 0 ? 0 : every - into;
}

/**
 * Seconds from `start` to `t`, rounded to the millisecond. Wall-clock seconds
 * run into the millions, so a plain `t - start` carries float noise
 * (74.89999999990687 for 74.9) that breaks exact comparisons.
 */
export function secondsSince(t: number, start: number): number {
  return Math.round((t - start) * 1000) / 1000;
}
