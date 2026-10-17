import assert from "node:assert/strict";
import test from "node:test";
import {
  grade,
  LANDED_Y,
  marchSpeed,
  newGame,
  pointsFor,
  step,
  W,
  type Game,
  type Input,
} from "./engine.ts";

const IDLE: Input = { left: false, right: false, fire: false };

function run(g: Game, input: Input, seconds: number): Game {
  let out = g;
  for (let t = 0; t < seconds; t += 1 / 60) out = step(out, input, 1 / 60);
  return out;
}

test("the ship slides along the bottom and stops at the edges", () => {
  const g = run(newGame(1), { ...IDLE, right: true }, 5);
  assert.ok(g.ship <= W && g.ship > W - 10);
  const back = run(g, { ...IDLE, left: true }, 5);
  assert.ok(back.ship >= 0 && back.ship < 10);
});

/** A fleet of just `aliens`, right over a ship that won't be bombed. */
function setUp(aliens: Game["aliens"]): Game {
  return { ...newGame(1), ship: 50, bombIn: 99, aliens };
}

test("only one shot flies at a time, and a hit scores by row", () => {
  let g = setUp([
    { x: 50, y: 110, row: 3, alive: true },
    { x: 90, y: 16, row: 0, alive: true },
  ]);
  g = step(g, { ...IDLE, fire: true }, 1 / 60);
  const shot = g.shot;
  assert.ok(shot);
  g = step(g, { ...IDLE, fire: true }, 1 / 60);
  assert.equal(g.shot?.x, shot.x);
  g = run(g, IDLE, 0.3);
  assert.deepEqual(
    g.aliens.map((a) => a.alive),
    [false, true],
  );
  assert.equal(g.score, pointsFor(3));
});

test("bombs cost a ship, then the ship blinks safe for a moment", () => {
  let g: Game = { ...newGame(2), bombIn: 99 };
  g = { ...g, bombs: [{ x: g.ship, y: 125 }] };
  g = run(g, IDLE, 0.3);
  assert.equal(g.lives, 2);
  g = { ...g, bombs: [{ x: g.ship, y: 125 }] };
  g = run(g, IDLE, 0.3);
  assert.equal(g.lives, 2);
});

test("clearing a wave pays a bonus and brings a faster fleet", () => {
  let g = setUp([{ x: 50, y: 110, row: 0, alive: true }]);
  g = step(g, { ...IDLE, fire: true }, 1 / 60);
  g = run(g, IDLE, 0.3);
  assert.equal(g.wave, 2);
  assert.equal(g.score, pointsFor(0) + 100);
  assert.equal(g.aliens.filter((a) => a.alive).length, 24);
  assert.ok(marchSpeed(2, 24) > marchSpeed(1, 24));
});

test("the game ends when the fleet lands or the last ship is lost", () => {
  const landed = step(
    { ...newGame(4), aliens: [{ x: 50, y: LANDED_Y, row: 0, alive: true }] },
    IDLE,
    1 / 60,
  );
  assert.equal(landed.over, true);
  const lost = run(
    { ...newGame(4), lives: 1, bombIn: 99, bombs: [{ x: 50, y: 126 }] },
    IDLE,
    0.3,
  );
  assert.equal(lost.over, true);
  assert.deepEqual(step(lost, { ...IDLE, right: true }, 1), lost);
});

test("grades run S to C on the score", () => {
  assert.deepEqual([1500, 900, 400, 0].map(grade), ["S", "A", "B", "C"]);
});
