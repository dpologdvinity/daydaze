// Driving sessions the client runs at a fixed tick: a Speedway race, a bumper
// car game or your own car on the city streets. Sessions are mutated in place
// by stepSession, and each keeps the previous tick so the renderer can
// interpolate. hudOf turns any session into what the HUD shows.

import type { CarMods } from "../city/drive.ts";
import { TICK_HZ, type StepClock } from "../driving/fixedStep.ts";
import type { CarInput, CarSpec, CarState } from "../driving/car.ts";
import { stepCityCar } from "../city/drive.ts";
import { TANK_RANGE } from "../city/gasStations.ts";
import type { Vec2 } from "../walk.ts";
import { stepBumpers, type Bumper } from "./bumper.ts";
import { type BotSkill } from "./bots.ts";
import { createRace, standings, stepRace, type Race } from "./race.ts";
import type { Track } from "./track.ts";

const TICK_MS = 1000 / TICK_HZ;
const RACE_LAPS = 3;
const BUMPER_CARS = 6;

/** One time-trial race. `prev` is the tick before `race`, for interpolation. */
export type RaceSession = {
  kind: "race";
  track: Track;
  race: Race;
  prev: Race;
  ticks: number;
  clock: StepClock;
};

/** One bumper car game. `prev` is the tick before `cars`, for interpolation. */
export type BumperSession = {
  kind: "bumpers";
  cars: readonly Bumper[];
  prev: readonly Bumper[];
  ticks: number;
  clock: StepClock;
};

/** Your own car out on the city streets. `traffic` is refreshed by the
 * client each frame with the other cars' centers. */
export type CitySession = {
  kind: "city";
  spec: CarSpec;
  color: string;
  /** Rims, underglow and tint, as the car was parked with. */
  mods: CarMods;
  car: CarState;
  prev: CarState;
  traffic: [number, number][];
  /** The tank, 0..1; an empty tank won't take the gas pedal. */
  fuel: number;
  ticks: number;
  clock: StepClock;
};

/** Any driving session; switch on `kind`. */
export type Session = RaceSession | BumperSession | CitySession;

/**
 * Puts your car on the street at `at` facing `yaw`, stopped. `fuel` is the
 * tank, 0..1; `mods` are the car's cosmetic upgrades.
 */
export function startCity(
  spec: CarSpec,
  color: string,
  at: Vec2,
  yaw: number,
  fuel = 1,
  mods: CarMods = {},
): CitySession {
  const car: CarState = { position: at, yaw, speed: 0 };
  return {
    kind: "city",
    spec,
    color,
    mods,
    car,
    prev: car,
    traffic: [],
    fuel,
    ticks: 0,
    clock: { accumulator: 0 },
  };
}

/** Starts a 3-lap race against `bots` bots of one skill, its clock at 0. */
export function startRace(
  track: Track,
  spec: CarSpec,
  bots: number,
  skill: BotSkill,
): RaceSession {
  const race = createRace(track, RACE_LAPS, spec, bots, skill, 0);
  return {
    kind: "race",
    track,
    race,
    prev: race,
    ticks: 0,
    clock: { accumulator: 0 },
  };
}

/**
 * Starts a bumper car game: six cars in a 5 m ring, each facing along the ring,
 * the player first.
 */
export function startBumpers(): BumperSession {
  const cars: Bumper[] = Array.from({ length: BUMPER_CARS }, (_, i) => {
    const a = (i / BUMPER_CARS) * Math.PI * 2;
    return {
      id: i === 0 ? "player" : `bot-${i}`,
      state: {
        position: [5 * Math.cos(a), 5 * Math.sin(a)],
        yaw: a + Math.PI / 2,
        speed: 0,
      },
      isPlayer: i === 0,
      hits: 0,
    };
  });
  return {
    kind: "bumpers",
    cars,
    prev: cars,
    ticks: 0,
    clock: { accumulator: 0 },
  };
}

/** Advances one fixed tick. `input` is the player's controls for this tick. */
export function stepSession(session: Session, input: CarInput): void {
  session.ticks++;
  if (session.kind === "race") {
    session.prev = session.race;
    session.race = stepRace(session.race, input, session.ticks * TICK_MS);
  } else if (session.kind === "city") {
    session.prev = session.car;
    const pedals = session.fuel > 0 ? input : { ...input, throttle: 0 };
    session.car = stepCityCar(
      session.spec,
      session.car,
      pedals,
      session.traffic,
    );
    const [ax, az] = session.prev.position;
    const [bx, bz] = session.car.position;
    session.fuel = Math.max(
      0,
      session.fuel - Math.hypot(bx - ax, bz - az) / TANK_RANGE,
    );
  } else {
    session.prev = session.cars;
    session.cars = stepBumpers(session.cars, input, session.ticks);
  }
}

/**
 * Numbers for the driving HUD. Race-only fields (laps, times, place) read 0 or
 * null in the city and at the bumper cars.
 */
export type Hud = {
  phase: string;
  /** Lap being driven, 1-based; 0 before the first start-line crossing. */
  lap: number;
  laps: number;
  /** Time into the lap being driven, in ms. */
  lapMs: number;
  bestMs: number | null;
  place: number;
  field: number;
  hits: number;
  /** The player's car, m/s; negative in reverse. */
  speed: number;
  /** The city car's tank, 0..1; 1 elsewhere. */
  fuel: number;
};

/** What the HUD shows. The player is always the first car. */
export function hudOf(session: Session): Hud {
  if (session.kind === "city") {
    return {
      phase: "city",
      lap: 0,
      laps: 0,
      lapMs: 0,
      bestMs: null,
      place: 1,
      field: 1,
      hits: 0,
      speed: session.car.speed,
      fuel: session.fuel,
    };
  }
  if (session.kind === "bumpers") {
    return {
      phase: "bumpers",
      lap: 0,
      laps: 0,
      lapMs: 0,
      bestMs: null,
      place: 1,
      field: session.cars.length,
      hits: session.cars[0].hits,
      speed: session.cars[0].state.speed,
      fuel: 1,
    };
  }
  const { race, ticks } = session;
  const me = race.cars[0];
  const nowMs = ticks * TICK_MS;
  // After the finish the lap counter has run past the last lap, so show the total.
  const finished = me.finishedMs !== null;
  return {
    phase: race.phase,
    lap: Math.min(me.lap.lap, race.laps),
    laps: race.laps,
    lapMs: finished
      ? me.lap.lapTimesMs.reduce((sum, ms) => sum + ms, 0)
      : me.lap.lap === 0
        ? 0
        : nowMs - me.lap.lapStartMs,
    bestMs: me.lap.bestLapMs,
    place: standings(race).indexOf("player") + 1,
    field: race.cars.length,
    hits: 0,
    speed: me.state.speed,
    fuel: 1,
  };
}
