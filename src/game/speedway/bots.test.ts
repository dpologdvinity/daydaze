import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestPointOnPolygon } from "../walk.ts";
import { stepCar, type CarState } from "../driving/car.ts";
import { carById } from "../driving/roster.ts";
import { TRACKS, trackWalls } from "./track.ts";
import { initialLap, updateLap } from "./laps.ts";
import { botInput, type BotSkill } from "./bots.ts";

const sedan = carById("quill-lite");
if (!sedan) throw new Error("missing car");
const spec = sedan;

function drive(
  trackIndex: number,
  skill: BotSkill,
  laps: number,
  maxTicks: number,
) {
  const track = TRACKS[trackIndex];
  const walls = trackWalls(track);
  let state: CarState = {
    position: track.grid[0].position,
    yaw: track.grid[0].yaw,
    speed: 0,
  };
  let lap = initialLap(0);
  let maxOff = 0;
  for (let t = 1; t <= maxTicks && lap.lapTimesMs.length < laps; t++) {
    const next = stepCar(
      spec,
      state,
      botInput(track, spec, state, skill),
      walls,
    );
    lap = updateLap(track, lap, state.position, next.position, t * 20);
    state = next;
    const c = nearestPointOnPolygon(track.centerline, state.position);
    maxOff = Math.max(
      maxOff,
      Math.hypot(c[0] - state.position[0], c[1] - state.position[1]),
    );
  }
  return { lap, maxOff, track };
}

for (const index of [0, 1]) {
  test(`a medium bot laps ${TRACKS[index].name} three times without leaving the road`, () => {
    const { lap, maxOff, track } = drive(index, "medium", 3, 20000);
    assert.equal(lap.lapTimesMs.length, 3);
    assert.ok(
      maxOff < track.width / 2,
      `strayed ${maxOff.toFixed(2)} m from the centerline`,
    );
  });
}

test("a hard bot's best lap beats an easy bot's", () => {
  const easy = drive(1, "easy", 2, 20000).lap.bestLapMs;
  const hard = drive(1, "hard", 2, 20000).lap.bestLapMs;
  assert.ok(easy !== null && hard !== null);
  assert.ok(hard < easy, `hard ${hard} vs easy ${easy}`);
});
