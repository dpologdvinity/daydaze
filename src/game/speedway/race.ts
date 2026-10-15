import type { Vec2 } from "../walk.ts";
import {
  stepCar,
  type CarInput,
  type CarSpec,
  type CarState,
} from "../driving/car.ts";
import { TICK_HZ } from "../driving/fixedStep.ts";
import { botInput, type BotSkill } from "./bots.ts";
import { initialLap, updateLap, type LapState } from "./laps.ts";
import { trackWalls, type Track } from "./track.ts";

export type RacePhase = "grid" | "countdown" | "racing" | "finished";

export type RaceCar = {
  id: string;
  spec: CarSpec;
  state: CarState;
  lap: LapState;
  isPlayer: boolean;
  skill?: BotSkill;
  finishedMs: number | null;
};

export type Race = {
  track: Track;
  laps: number;
  phase: RacePhase;
  countdownMs: number;
  cars: readonly RaceCar[];
};

export const COUNTDOWN_MS = 3000;
const TICK_MS = 1000 / TICK_HZ;
const IDLE: CarInput = { throttle: 0, brake: 0, steer: 0 };

const wallCache = new WeakMap<Track, readonly (readonly Vec2[])[]>();
function wallsOf(track: Track): readonly (readonly Vec2[])[] {
  let walls = wallCache.get(track);
  if (!walls) {
    walls = trackWalls(track);
    wallCache.set(track, walls);
  }
  return walls;
}

export function createRace(
  track: Track,
  laps: number,
  playerSpec: CarSpec,
  bots: number,
  skill: BotSkill,
  nowMs: number,
): Race {
  const count = Math.min(track.grid.length, bots + 1);
  const cars: RaceCar[] = [];
  for (let i = 0; i < count; i++) {
    const slot = track.grid[i];
    cars.push({
      id: i === 0 ? "player" : `bot-${i}`,
      spec: playerSpec,
      state: { position: slot.position, yaw: slot.yaw, speed: 0 },
      lap: initialLap(nowMs),
      isPlayer: i === 0,
      skill: i === 0 ? undefined : skill,
      finishedMs: null,
    });
  }
  return { track, laps, phase: "countdown", countdownMs: COUNTDOWN_MS, cars };
}

/**
 * Advances the race by one fixed tick. "autopilot" lets a medium bot drive the
 * player's car (attract mode and tests).
 */
export function stepRace(
  race: Race,
  playerInput: CarInput | "autopilot",
  nowMs: number,
): Race {
  if (race.phase === "grid") return race;
  if (race.phase === "countdown") {
    const countdownMs = race.countdownMs - TICK_MS;
    return countdownMs > 0
      ? { ...race, countdownMs }
      : { ...race, countdownMs: 0, phase: "racing" };
  }
  const walls = wallsOf(race.track);
  const cars = race.cars.map((car): RaceCar => {
    // Finished cars coast to a stop.
    const input =
      car.finishedMs !== null
        ? IDLE
        : car.isPlayer
          ? playerInput === "autopilot"
            ? botInput(race.track, car.spec, car.state, "medium")
            : playerInput
          : botInput(race.track, car.spec, car.state, car.skill ?? "medium");
    const state = stepCar(car.spec, car.state, input, walls);
    const lap = updateLap(
      race.track,
      car.lap,
      car.state.position,
      state.position,
      nowMs,
    );
    const finishedMs =
      car.finishedMs ?? (lap.lapTimesMs.length >= race.laps ? nowMs : null);
    return { ...car, state, lap, finishedMs };
  });
  const playerDone = cars.some((c) => c.isPlayer && c.finishedMs !== null);
  return { ...race, cars, phase: playerDone ? "finished" : "racing" };
}

function progress(race: Race, car: RaceCar): [number, number, number] {
  const n = race.track.checkpoints.length;
  // nextCheckpoint 0 means every checkpoint of this lap is done.
  const passed =
    car.lap.lap === 0
      ? 0
      : car.lap.nextCheckpoint === 0
        ? n
        : car.lap.nextCheckpoint;
  const cp = race.track.checkpoints[car.lap.nextCheckpoint];
  const mid: Vec2 = [(cp.a[0] + cp.b[0]) / 2, (cp.a[1] + cp.b[1]) / 2];
  const distance = Math.hypot(
    mid[0] - car.state.position[0],
    mid[1] - car.state.position[1],
  );
  return [car.lap.lap, passed, -distance];
}

/** Car ids, leader first: finishers by finish time, then by lap, checkpoint and distance. */
export function standings(race: Race): readonly string[] {
  // Nobody has crossed the line yet, so the grid order decides.
  if (race.cars.every((c) => c.lap.lap === 0))
    return race.cars.map((c) => c.id);
  return [...race.cars]
    .sort((x, y) => {
      if (x.finishedMs !== null || y.finishedMs !== null) {
        if (x.finishedMs === null) return 1;
        if (y.finishedMs === null) return -1;
        return x.finishedMs - y.finishedMs;
      }
      const px = progress(race, x);
      const py = progress(race, y);
      for (let k = 0; k < 3; k++) if (px[k] !== py[k]) return py[k] - px[k];
      return 0;
    })
    .map((c) => c.id);
}
