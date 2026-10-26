import assert from "node:assert/strict";
import { test } from "node:test";
import { carById } from "../driving/roster.ts";
import { TICK_HZ } from "../driving/fixedStep.ts";
import { COUNTDOWN_MS } from "./race.ts";
import { stepSession } from "./session.ts";
import {
  encodeRace,
  parseRaceMessage,
  startFriendRace,
  verdict,
} from "./friendRace.ts";
import { TRACKS } from "./track.ts";

const KART = carById("zip-kart")!;
const TICK_MS = 1000 / TICK_HZ;
const IDLE = { throttle: 0, brake: 0, steer: 0 };

/** The wall-clock time a client's countdown ends, starting the race at `now`. */
function greenLight(startAt: number, now: number) {
  const session = startFriendRace(TRACKS[0], KART, startAt, now);
  let t = now;
  while (session.race.phase === "countdown") {
    stepSession(session, IDLE);
    t += TICK_MS;
  }
  return t;
}

test("two friends who hear 'go' at different times start together", () => {
  const startAt = 10_000;
  const a = greenLight(startAt, 5_000);
  const b = greenLight(startAt, 5_150);
  assert.ok(Math.abs(a - b) <= TICK_MS, `${a} vs ${b}`);
  assert.ok(Math.abs(a - startAt) <= TICK_MS);
});

test("a wildly wrong clock still gets an ordinary countdown", () => {
  // a start an hour away, or already past, means the clocks disagree
  const far = startFriendRace(TRACKS[0], KART, 3_600_000, 0);
  assert.equal(far.race.countdownMs, COUNTDOWN_MS);
  const past = startFriendRace(TRACKS[0], KART, 0, 60_000);
  assert.equal(past.race.countdownMs, COUNTDOWN_MS);
});

test("a friend race is the two of you: no bots on the grid", () => {
  const s = startFriendRace(TRACKS[1], KART, 5_000, 0);
  assert.equal(s.race.cars.length, 1);
  assert.equal(s.track.id, TRACKS[1].id);
});

test("race messages round-trip; bad ones are dropped", () => {
  for (const m of [
    { k: "race-ask", track: "neon-oval" },
    { k: "race-yes" },
    { k: "race-no" },
    { k: "race-go", track: "boardwalk-loop", startAt: 1_700_000_000_000 },
    { k: "race-done", ms: 61_234 },
  ] as const)
    assert.deepEqual(parseRaceMessage(encodeRace(m)), m);
  for (const bad of [
    { k: "race-ask", track: "moon" },
    { k: "race-go", track: "neon-oval", startAt: -1 },
    { k: "race-go", track: "neon-oval" },
    { k: "race-done", ms: -5 },
    { k: "race-done", ms: Infinity },
    { k: "race-cheat" },
  ])
    assert.equal(parseRaceMessage(JSON.stringify(bad)), null);
  assert.equal(parseRaceMessage("{nope"), null);
});

test("the faster total time wins", () => {
  assert.equal(verdict(60_000, 61_000), "won");
  assert.equal(verdict(61_000, 60_000), "lost");
  assert.equal(verdict(60_000, 60_000), "tie");
});
