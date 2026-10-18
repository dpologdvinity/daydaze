import { TICK_HZ, type StepClock } from "../driving/fixedStep.ts";
import type { CarInput, CarSpec, CarState } from "../driving/car.ts";
import { stepCityCar } from "../city/drive.ts";
import type { Vec2 } from "../walk.ts";
import { BUMPER_CAR } from "../driving/roster.ts";
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
  car: CarState;
  prev: CarState;
  traffic: [number, number][];
  ticks: number;
  clock: StepClock;
};

export type Session = RaceSession | BumperSession | CitySession;

export function startCity(
  spec: CarSpec,
  color: string,
  at: Vec2,
  yaw: number,
): CitySession {
  const car: CarState = { position: at, yaw, speed: 0 };
  return {
    kind: "city",
    spec,
    color,
    car,
    prev: car,
    traffic: [],
    ticks: 0,
    clock: { accumulator: 0 },
  };
}

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
    session.car = stepCityCar(
      session.spec,
      session.car,
      input,
      session.traffic,
    );
  } else {
    session.prev = session.cars;
    session.cars = stepBumpers(session.cars, input, session.ticks);
  }
}

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
  };
}
