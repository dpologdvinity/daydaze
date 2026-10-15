import { test } from "node:test";
import assert from "node:assert/strict";
import { carById } from "../driving/roster.ts";
import { TRACKS } from "./track.ts";
import { hudOf, startBumpers, startRace, stepSession } from "./session.ts";

const KART = carById("zip-kart");
if (!KART) throw new Error("missing kart");
const GAS = { throttle: 1, brake: 0, steer: 0 };

test("a race session counts down, then the player's throttle moves the car", () => {
  const session = startRace(TRACKS[0], KART, 2, "easy");
  assert.equal(session.race.phase, "countdown");
  // 3000 ms is 150 ticks at 50 Hz
  for (let i = 0; i < 150; i++) stepSession(session, GAS);
  assert.equal(session.race.phase, "racing");
  const start = session.race.cars[0].state.position;
  for (let i = 0; i < 50; i++) stepSession(session, GAS);
  const moved = session.race.cars[0].state.position;
  assert.ok(Math.hypot(moved[0] - start[0], moved[1] - start[1]) > 1);
});

test("stepping keeps the previous race for interpolation", () => {
  const session = startRace(TRACKS[1], KART, 2, "medium");
  const before = session.race;
  stepSession(session, GAS);
  assert.equal(session.prev, before);
  assert.notEqual(session.race, before);
  assert.equal(session.ticks, 1);
});

test("the HUD reports the player's place out of the field", () => {
  const session = startRace(TRACKS[0], KART, 3, "medium");
  const hud = hudOf(session);
  assert.equal(hud.field, 4);
  assert.ok(hud.place >= 1 && hud.place <= 4);
  assert.equal(hud.lap, 0);
  assert.equal(hud.lapMs, 0);
  assert.equal(hud.bestMs, null);
});

test("the HUD clamps the lap to the last one and shows the total time once finished", () => {
  const session = startRace(TRACKS[0], KART, 2, "easy");
  const [player] = session.race.cars;
  // Three laps of 30, 31 and 32 s, the last crossing the line at 93 s.
  const finished = {
    ...player,
    lap: {
      ...player.lap,
      lap: 4,
      lapStartMs: 93000,
      bestLapMs: 30000,
      lapTimesMs: [30000, 31000, 32000],
    },
    finishedMs: 93000,
  };
  session.race = {
    ...session.race,
    phase: "finished",
    cars: [finished, ...session.race.cars.slice(1)],
  };
  const hud = hudOf(session);
  assert.equal(hud.lap, 3);
  assert.equal(hud.laps, 3);
  assert.equal(hud.lapMs, 93000);
});

test("a bumper session steps six cars with the player among them and stays finite", () => {
  const session = startBumpers();
  assert.equal(session.cars.length, 6);
  assert.equal(session.cars[0].isPlayer, true);
  for (let i = 0; i < 3000; i++) stepSession(session, GAS);
  for (const car of session.cars) {
    assert.ok(Number.isFinite(car.state.position[0]));
    assert.ok(Number.isFinite(car.state.position[1]));
  }
  assert.equal(hudOf(session).phase, "bumpers");
  assert.equal(hudOf(session).field, 6);
});
