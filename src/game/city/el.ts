// The El: an elevated train over Main Avenue on a steel trestle. One train
// shuttles end to end on a fixed timetable that depends only on the clock, so
// every player sees it in the same place. It stops at three stations (Little
// Manila, Downtown, and Chinatown with Koreatown) in both directions and turns
// round past the end of the line. Pure: the client draws the trestle and train
// from these numbers and rides the player along (src/client/city/ElLine.tsx,
// ElRide.tsx).
import { hash } from "./hash.ts";

export type ElStation = {
  id: "manila" | "downtown" | "chinatown";
  name: string;
  /** Where the platform's middle is along the avenue. */
  x: number;
  /** Where the stairs' top landing stands, meters east of `x`: chosen so the
   * flight clears every shop door and every cross street's mouth. */
  stairs: number;
};

export const EL_STATIONS: readonly ElStation[] = [
  { id: "manila", name: "Little Manila", x: -300, stairs: -12 },
  { id: "downtown", name: "Downtown", x: 0, stairs: 8 },
  { id: "chinatown", name: "Chinatown and Koreatown", x: 300, stairs: -8 },
];

/** The track runs down the middle of Main Avenue (z = 0). */
export const EL_Z = 0;
/** Height of the rails' top, in meters; cars and buses pass under it. */
export const EL_DECK_Y = 9;
/** The ends of the line, past the outer stations. */
export const EL_X0 = -430;
export const EL_X1 = 430;
/** Cruising speed between stops (m/s) and the pauses (s). */
export const EL_SPEED = 18;
export const EL_DWELL = 14;
export const EL_TURN_DWELL = 20;
/** The train is three cars of 12 m; its middle is `x`. */
export const EL_TRAIN_LENGTH = 36;
/** Platforms are this long, centered on the station. */
export const EL_PLATFORM = 44;
/** The stairs climb this far along the avenue, in meters, to the platform. */
export const STAIRS_RUN = 18;
/** Steps in a flight: EL_DECK_Y over this is one riser. */
const STEPS = 18;
/** The top landing is this wide along the avenue. */
const LANDING = 2.6;

/** The avenue's x range a station's landing and flight cover, from the
 * landing's near edge to the bottom step. */
export const stairsSpan = (s: ElStation): readonly [number, number] => [
  s.x + s.stairs - LANDING / 2,
  s.x + s.stairs + STAIRS_RUN,
];

type Leg =
  | {
      kind: "dwell";
      t0: number;
      t1: number;
      x: number;
      dir: 1 | -1;
      at: ElStation | null;
    }
  | {
      kind: "move";
      t0: number;
      t1: number;
      from: number;
      to: number;
      dir: 1 | -1;
    };

/** Seconds to travel `d` meters: it eases in and out, so it takes a little
 * longer than at full speed. */
const travel = (d: number) => (Math.abs(d) / EL_SPEED) * 1.25;

/** One full cycle: the train leaves the west end, stops at each station
 * going east, turns round at the east end, stops at each coming back, and
 * arrives at the west end where the next cycle begins. */
function buildCycle(): { legs: Leg[]; length: number } {
  const stations = EL_STATIONS.map((at) => ({ x: at.x, at }));
  const stops: { x: number; at: ElStation | null; dir: 1 | -1 }[] = [
    { x: EL_X0, at: null, dir: 1 },
    ...stations.map((s) => ({ ...s, dir: 1 as const })),
    { x: EL_X1, at: null, dir: -1 },
    ...[...stations].reverse().map((s) => ({ ...s, dir: -1 as const })),
  ];
  const legs: Leg[] = [];
  let t = 0;
  stops.forEach((stop, i) => {
    const dwell = stop.at ? EL_DWELL : EL_TURN_DWELL;
    legs.push({
      kind: "dwell",
      t0: t,
      t1: t + dwell,
      x: stop.x,
      dir: stop.dir,
      at: stop.at,
    });
    t += dwell;
    // the last leg runs home to the west end
    const next = stops[i + 1]?.x ?? EL_X0;
    const d = travel(next - stop.x);
    legs.push({
      kind: "move",
      t0: t,
      t1: t + d,
      from: stop.x,
      to: next,
      dir: next > stop.x ? 1 : -1,
    });
    t += d;
  });
  return { legs, length: t };
}

const CYCLE = buildCycle();
/** Seconds from one departure from the west end to the next. */
export const EL_CYCLE = CYCLE.length;

const smooth = (u: number) => u * u * (3 - 2 * u);

export type ElTrain = {
  /** Middle of the train along the avenue. */
  x: number;
  /** +1 heading east, -1 west. */
  dir: 1 | -1;
  /** The station it is stopped at, with its doors open; else null. */
  at: ElStation | null;
  /** Meters per second, signed by direction (0 while stopped). */
  speed: number;
};

/** Where the train is at clock time `t` (seconds). */
export function elTrainAt(t: number): ElTrain {
  const local = ((t % EL_CYCLE) + EL_CYCLE) % EL_CYCLE;
  const leg =
    CYCLE.legs.find((l) => local >= l.t0 && local < l.t1) ?? CYCLE.legs[0];
  if (leg.kind === "dwell")
    return { x: leg.x, dir: leg.dir, at: leg.at, speed: 0 };
  const u = (local - leg.t0) / (leg.t1 - leg.t0);
  const x = leg.from + (leg.to - leg.from) * smooth(u);
  const slope = (6 * u * (1 - u) * (leg.to - leg.from)) / (leg.t1 - leg.t0);
  return { x, dir: leg.dir, at: null, speed: slope };
}

export type ElStop = {
  station: ElStation;
  dir: 1 | -1;
  arrive: number;
  depart: number;
};

/** The stops the train makes from `t` on, in order, as many as `count`. */
export function elStopsFrom(t: number, count: number): ElStop[] {
  const out: ElStop[] = [];
  const first = Math.floor(t / EL_CYCLE);
  for (let cycle = first; out.length < count && cycle < first + 4; cycle++) {
    for (const leg of CYCLE.legs) {
      if (leg.kind !== "dwell" || !leg.at) continue;
      const depart = cycle * EL_CYCLE + leg.t1;
      if (depart <= t) continue;
      out.push({
        station: leg.at,
        dir: leg.dir,
        arrive: cycle * EL_CYCLE + leg.t0,
        depart,
      });
      if (out.length >= count) break;
    }
  }
  return out;
}

export type ElTrip = {
  from: ElStation;
  to: ElStation;
  /** When the doors open at the boarding station, and when the train leaves it. */
  board: number;
  leave: number;
  /** When the doors open at the destination. */
  arrive: number;
};

/** The first train from `from` toward `to` that a rider can still catch at
 * clock time `t` (the doors must have at least `EL_BOARD_MARGIN` s to go). */
export const EL_BOARD_MARGIN = 3;
export function planTrip(from: ElStation, to: ElStation, t: number): ElTrip {
  const dir = Math.sign(to.x - from.x);
  if (dir === 0) throw new Error("the El needs two different stations");
  const stops = elStopsFrom(t, 12);
  const boarding = stops.find(
    (s) =>
      s.station.id === from.id &&
      s.dir === dir &&
      s.depart - t >= EL_BOARD_MARGIN,
  );
  if (!boarding) throw new Error("no train in sight");
  const after = elStopsFrom(boarding.depart, 6).find(
    (s) => s.station.id === to.id && s.dir === dir,
  );
  if (!after) throw new Error("the train never reaches that station");
  return {
    from,
    to,
    board: boarding.arrive,
    leave: boarding.depart,
    arrive: after.arrive,
  };
}

/** The station nearest to `x` along the avenue (where a rider gets off if
 * she leaves the train between stops). */
export function nearestStation(x: number): ElStation {
  return EL_STATIONS.reduce((best, s) =>
    Math.abs(s.x - x) < Math.abs(best.x - x) ? s : best,
  );
}

/** Whether a rider waiting on `trip.from`'s platform is aboard at clock time
 * `t`: once the doors have opened. She stands there the whole dwell, so a
 * frame that skips it (a slow device, a hitch) still finds her on the train;
 * a check for the doors being open in that frame missed every train. */
export const hasBoarded = (trip: ElTrip, t: number): boolean => t >= trip.board;

/** Whether a rider bound for `trip.to` is to step off at clock time `t`: the
 * doors are open there, or (a throttled tab skipped the stop) the dwell is
 * over, so she is never carried on forever. */
export function hasArrived(trip: ElTrip, train: ElTrain, t: number): boolean {
  if (t < trip.arrive) return false;
  return train.at?.id === trip.to.id || t >= trip.arrive + EL_DWELL;
}

/** Trestle columns: where the pairs stand along the avenue, every
 * `spacing` meters, skipping `gaps` (cross streets) by `clear` meters. */
export function trestleColumns(
  gaps: readonly number[],
  spacing = 24,
  clear = 9,
): number[] {
  const out: number[] = [];
  for (let x = EL_X0; x <= EL_X1; x += spacing) {
    // a column that would stand in a crossing slides to its edge
    const gap = gaps.find((g) => Math.abs(x - g) < clear);
    const at = gap === undefined ? x : gap + Math.sign(x - gap || 1) * clear;
    // none stands in a station's stairs (the curb pair would pierce them)
    const inStairs = EL_STATIONS.some((s) => {
      const [x0, x1] = stairsSpan(s);
      return at > x0 - 2 && at < x1 + 2;
    });
    if (!inStairs && !out.some((o) => Math.abs(o - at) < 2)) out.push(at);
  }
  return out.map((x) => Math.round(x * 10) / 10).sort((a, b) => a - b);
}

/** A small stable wobble per column so a row of them is not a picket fence. */
export const columnSeed = (x: number) => hash(x, 3);

/** A box of the trestle or a station: its material, center and size. */
export type ElBox = {
  kind: "steel" | "stone" | "rail" | "roof";
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
};

/** The ground a station's landing, flight and handrail cover: x0, z0, x1, z1.
 * The flight stands at the curb, along the avenue, on its south side. */
export function stairsRect(s: ElStation): [number, number, number, number] {
  const [x0, x1] = stairsSpan(s);
  return [x0, 6.3, x1, 8.9];
}

/** Where she steps on and off: the foot of a station's stairs, on the avenue's
 * south sidewalk, just past the bottom step. */
export const stairsFoot = (station: ElStation): [number, number] => [
  stairsSpan(station)[1] + 2,
  8.4,
];
/** Every box of the line: the trestle over the avenue, then each station's
 * platform, roof and stairs. `gaps` are the cross streets' x. */
export function elBoxes(gaps: readonly number[]): ElBox[] {
  const out: ElBox[] = [];
  const y = EL_DECK_Y;
  const length = EL_X1 - EL_X0 + 20;
  const mid = (EL_X0 + EL_X1) / 2;
  // the deck, two girders under it and the rails on top
  out.push({
    kind: "steel",
    x: mid,
    y: y - 0.2,
    z: 0,
    sx: length,
    sy: 0.3,
    sz: 5.6,
  });
  for (const z of [-2.2, 2.2])
    out.push({
      kind: "steel",
      x: mid,
      y: y - 0.9,
      z,
      sx: length,
      sy: 1.1,
      sz: 0.5,
    });
  for (const z of [-0.72, 0.72])
    out.push({
      kind: "rail",
      x: mid,
      y: y + 0.08,
      z,
      sx: length,
      sy: 0.16,
      sz: 0.12,
    });
  // pairs of columns at the curbs, joined across by a beam
  for (const x of trestleColumns(gaps)) {
    for (const z of [-7.6, 7.6])
      out.push({
        kind: "steel",
        x,
        y: (y - 1.4) / 2,
        z,
        sx: 0.8,
        sy: y - 1.4,
        sz: 0.8,
      });
    out.push({
      kind: "steel",
      x,
      y: y - 1.2,
      z: 0,
      sx: 0.7,
      sy: 0.7,
      sz: 16.4,
    });
  }
  for (const s of EL_STATIONS) {
    const x = s.x;
    // the platform on the south side, level with the cars' floor
    out.push({
      kind: "stone",
      x,
      y: y - 0.05,
      z: 3.6,
      sx: EL_PLATFORM,
      sy: 0.3,
      sz: 3.4,
    });
    // the roof on posts, over the platform
    out.push({
      kind: "roof",
      x,
      y: y + 4.2,
      z: 3.8,
      sx: EL_PLATFORM - 4,
      sy: 0.25,
      sz: 4.4,
    });
    for (const dx of [-EL_PLATFORM / 2 + 4, 0, EL_PLATFORM / 2 - 4])
      out.push({
        kind: "steel",
        x: x + dx,
        y: y + 2.1,
        z: 5.0,
        sx: 0.3,
        sy: 4.2,
        sz: 0.3,
      });
    // a railing along the platform's outer edge
    out.push({
      kind: "steel",
      x,
      y: y + 0.55,
      z: 5.2,
      sx: EL_PLATFORM,
      sy: 0.08,
      sz: 0.08,
    });
    // the walkway from the stairs to the platform, then the stairs down
    const top = x + s.stairs;
    out.push({
      kind: "stone",
      x: top,
      y: y - 0.05,
      z: 6.6,
      sx: LANDING,
      sy: 0.3,
      sz: 3.0,
    });
    for (let i = 0; i < STEPS; i++) {
      const rise = y / STEPS;
      // each step is a solid block from the ground up to its tread
      const tread = y - rise * (i + 1) - 0.05;
      out.push({
        kind: "stone",
        x: top + 1.3 + ((STAIRS_RUN - 1.3) / STEPS) * (i + 0.5),
        y: Math.max(tread, 0.1) / 2,
        z: 7.6,
        sx: (STAIRS_RUN - 1.3) / STEPS,
        sy: Math.max(tread, 0.1),
        sz: 2.6,
      });
    }
    // stair handrail on the avenue side
    out.push({
      kind: "steel",
      x: top + STAIRS_RUN / 2,
      y: y / 2 + 1,
      z: 8.9,
      sx: STAIRS_RUN,
      sy: 0.08,
      sz: 0.08,
    });
  }
  return out;
}
