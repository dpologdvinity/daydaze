import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ballSeconds,
  matchOver,
  NEW_RALLY,
  opponentSpots,
  play,
  shotFlight,
  spikeSpot,
  digSpot,
  TO_WIN,
  type Court,
  type Rally,
  type Shot,
} from "./volleyball.ts";
import { ballAt, type Vec3 } from "./motion/ball.ts";

test("a dig, then a perfect spike, is your point", () => {
  let m: Rally = NEW_RALLY;
  ({ match: m } = play(m, "good"));
  assert.equal(m.touch, "spike");
  const r = play(m, "perfect");
  assert.equal(r.outcome, "kill");
  assert.deepEqual([r.match.you, r.match.them, r.match.touch], [1, 0, "dig"]);
});

test("a missed dig or a spike into the net is theirs", () => {
  assert.equal(play(NEW_RALLY, "late").match.them, 1);
  const spike = play(NEW_RALLY, "perfect").match;
  const r = play(spike, "early");
  assert.equal(r.outcome, "lost");
  assert.equal(r.match.them, 1);
});

test("a good spike gets dug: the rally goes on, quicker", () => {
  const spike = play(NEW_RALLY, "perfect").match;
  const r = play(spike, "good");
  assert.equal(r.outcome, "rally");
  assert.equal(r.match.rally, 1);
  assert.equal(r.match.touch, "dig");
  assert.ok(ballSeconds(r.match) < ballSeconds(NEW_RALLY));
});

test("first to seven takes the match, and nothing plays after", () => {
  let m: Rally = NEW_RALLY;
  for (let i = 0; i < TO_WIN; i++) {
    m = play(m, "good").match;
    m = play(m, "perfect").match;
  }
  assert.equal(m.you, TO_WIN);
  assert.ok(matchOver(m));
  assert.equal(play(m, "perfect").match, m);
});

const BEACH: Court = { half: 4, depth: 8, net: 2.45 };

/** Samples a shot: where it lands, and how high it is crossing the net. */
function trace(shot: Shot, seconds: number, lane: number) {
  const flight = shotFlight(BEACH, shot, seconds, lane);
  const end = ballAt(flight, seconds, [0, 0, 0]);
  const start = ballAt(flight, 0, [0, 0, 0]);
  let crossing: number | null = null;
  const at: Vec3 = [0, 0, 0];
  for (let i = 1; i <= 400; i++) {
    ballAt(flight, (i / 400) * seconds, at);
    const before = ballAt(flight, ((i - 1) / 400) * seconds, [0, 0, 0]);
    if (Math.sign(before[2]) !== Math.sign(at[2])) crossing = at[1];
  }
  return { start, end, crossing };
}

test("their attacks cross the net high and land on your side", () => {
  for (const lane of [-1, -0.3, 0, 0.6, 1])
    for (const seconds of [0.7, 1, 1.4]) {
      const { start, end, crossing } = trace("attack", seconds, lane);
      assert.ok(start[2] > 0 && end[2] < 0, "theirs to yours");
      assert.ok(
        crossing !== null && crossing > BEACH.net + 0.1,
        `clears at ${crossing}`,
      );
      assert.ok(Math.abs(end[0]) <= BEACH.half);
    }
});

test("your set stays your side; kills and their digs land on theirs", () => {
  for (const lane of [-1, 0, 1]) {
    const set = trace("set", 1, lane);
    assert.ok(set.start[2] < 0 && set.end[2] < 0 && set.crossing === null);
    assert.ok(set.end[1] > BEACH.net, "set up above the net");
    for (const shot of ["kill", "their-dig"] as const) {
      const t = trace(shot, 0.8, lane);
      assert.ok(t.end[2] > 0, shot);
      assert.ok(
        t.crossing !== null && t.crossing > BEACH.net,
        `${shot} clears`,
      );
    }
    assert.ok(
      Math.abs(trace("kill", 0.6, lane).end[1] - 0.11) < 1e-6,
      "kill hits sand",
    );
  }
});

test("a spike into the net and a shanked dig stay on your side", () => {
  for (const shot of ["net", "miss"] as const) {
    const t = trace(shot, 0.6, 0.4);
    assert.ok(t.end[2] < 0 && t.crossing === null, shot);
  }
});

test("the opponents follow the ball on their side", () => {
  const [digger, setter] = opponentSpots(BEACH, [2.5, 0.7, 4.4]);
  assert.equal(digger[0], 2.5);
  assert.ok(digger[1] > 0 && setter[1] > 0 && setter[1] < digger[1]);
  // a ball on your side: they wait in their base spots, inside the court
  const [d2] = opponentSpots(BEACH, [3, 0.7, -4]);
  assert.ok(Math.abs(d2[0]) < Math.abs(3));
  // a ball wide of the court: the digger stops at the line
  assert.equal(opponentSpots(BEACH, [9, 0.7, 4])[0][0], BEACH.half);
});

test("a low pool net brings every touch down within a wader's reach", () => {
  const pool: Court = { half: 3.5, depth: 6, net: 1.25 };
  assert.ok(spikeSpot(pool, 0)[1] < 1.9, "spike within reach");
  assert.ok(spikeSpot(pool, 0)[1] > pool.net, "spike above the net");
  assert.ok(digSpot(pool, 0)[1] < 0.5, "dig just over the water");
  for (const lane of [-1, 0, 1]) {
    const flight = shotFlight(pool, "attack", 1, lane);
    const at: Vec3 = [0, 0, 0];
    let crossing = -1;
    for (let i = 1; i <= 400; i++) {
      const before = ballAt(flight, ((i - 1) / 400) * 1, [0, 0, 0]);
      ballAt(flight, i / 400, at);
      if (Math.sign(before[2]) !== Math.sign(at[2])) crossing = at[1];
    }
    assert.ok(crossing > pool.net && crossing < 3, `crosses at ${crossing}`);
  }
});
