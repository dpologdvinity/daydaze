import { test } from "node:test";
import assert from "node:assert/strict";
import { carById } from "../driving/roster.ts";
import { TRACKS } from "./track.ts";
import { createRace, standings, stepRace } from "./race.ts";

const spec = carById("quill-lite");
if (!spec) throw new Error("missing car");
const GAS = { throttle: 1, brake: 0, steer: 0 };

test("a new race counts down and ignores player input until it is over", () => {
  let race = createRace(TRACKS[0], 3, spec, 3, "medium", 0);
  assert.equal(race.phase, "countdown");
  assert.equal(race.cars.length, 4);
  const start = race.cars[0].state.position;
  for (let t = 1; t <= 100; t++) race = stepRace(race, GAS, t * 20); // 2 s
  assert.equal(race.phase, "countdown");
  assert.deepEqual(race.cars[0].state.position, start);
  for (let t = 101; t <= 200; t++) race = stepRace(race, GAS, t * 20);
  assert.equal(race.phase, "racing");
  assert.notDeepEqual(race.cars[0].state.position, start);
});

test("standings put a car on lap 2 ahead of a car on lap 1", () => {
  const race = createRace(TRACKS[0], 3, spec, 1, "easy", 0);
  const [player, bot] = race.cars;
  const ahead = {
    ...race,
    cars: [
      { ...player, lap: { ...player.lap, lap: 1, nextCheckpoint: 5 } },
      {
        ...bot,
        lap: { ...bot.lap, lap: 2, nextCheckpoint: 1, lapTimesMs: [40000] },
      },
    ],
  };
  assert.deepEqual(standings(ahead), [bot.id, player.id]);
});

test("the race finishes when the player completes the last lap", () => {
  let race = createRace(TRACKS[0], 1, spec, 1, "hard", 0);
  // Let a hard bot drive the player's car too, by copying the bot's input logic via autopilot.
  for (let t = 1; t <= 20000 && race.phase !== "finished"; t++)
    race = stepRace(race, "autopilot", t * 20);
  assert.equal(race.phase, "finished");
  assert.ok(race.cars[0].finishedMs !== null);
});

test("after the player finishes, their car coasts to a stop while a bot keeps driving", () => {
  let race = createRace(TRACKS[0], 1, spec, 1, "easy", 0);
  let t = 1;
  for (; t <= 20000 && race.phase !== "finished"; t++)
    race = stepRace(race, "autopilot", t * 20);
  assert.equal(race.phase, "finished");
  assert.equal(race.cars[1].finishedMs, null);
  const finishSpeed = race.cars[0].state.speed;
  const botAtFinish = race.cars[1].state.position;
  for (let i = 0; i < 100; i++, t++) race = stepRace(race, GAS, t * 20);
  assert.equal(race.phase, "finished");
  assert.ok(Math.abs(race.cars[0].state.speed) < Math.abs(finishSpeed));
  assert.notDeepEqual(race.cars[1].state.position, botAtFinish);
});

test("before anyone crosses the line, standings follow the grid", () => {
  const race = createRace(TRACKS[0], 3, spec, 3, "medium", 0);
  assert.deepEqual(
    standings(race),
    race.cars.map((c) => c.id),
  );
  assert.equal(standings(race)[0], "player");
});
