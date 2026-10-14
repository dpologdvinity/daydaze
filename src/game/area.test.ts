import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampToArea,
  isBlocked,
  roomArea,
  stepInArea,
  type WalkArea,
} from "./area.ts";
import { ROOMS } from "./rooms.ts";
import { clampToWalkable, type Vec2 } from "./walk.ts";

const open: WalkArea = {
  surfaces: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
  ],
  blockers: [
    [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
    ],
  ],
  portals: [],
};

test("a single surface clamps exactly like clampToWalkable", () => {
  const { walkable } = ROOMS.plaza;
  for (const p of [
    [0, 0],
    [-20, 3],
    [5, 30],
    [11, -2],
  ] satisfies Vec2[]) {
    assert.deepEqual(
      clampToArea(roomArea(ROOMS.plaza), p),
      clampToWalkable(walkable, p),
    );
  }
});

test("several surfaces clamp to the nearest one", () => {
  const area: WalkArea = {
    surfaces: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      [
        [10, 0],
        [11, 0],
        [11, 1],
        [10, 1],
      ],
    ],
    blockers: [],
    portals: [],
  };
  assert.deepEqual(clampToArea(area, [9, 0.5]), [10, 0.5]);
  assert.deepEqual(clampToArea(area, [0.5, 0.5]), [0.5, 0.5]);
});

test("a body keeps clear of a blocker's edge", () => {
  assert.equal(isBlocked(open, [5, 5]), true);
  assert.equal(isBlocked(open, [3.8, 5]), true);
  assert.equal(isBlocked(open, [3.5, 5]), false);
  assert.equal(isBlocked(open, [1, 1]), false);
});

test("walking into a blocker stops at its face and never enters it", () => {
  let pos: Vec2 = [1, 5];
  for (let i = 0; i < 100; i++) {
    pos = stepInArea(open, pos, [9, 5], 0.1);
    assert.equal(
      isBlocked(open, pos),
      false,
      `stepped into a blocker at ${pos}`,
    );
  }
  assert.ok(pos[0] > 3 && pos[0] < 4, `stopped at x=${pos[0]}`);
  assert.equal(pos[1], 5);
});

test("walking diagonally into a blocker slides along its face", () => {
  let pos: Vec2 = [1, 3];
  for (let i = 0; i < 200; i++) pos = stepInArea(open, pos, [9, 9], 0.1);
  // It cannot pass the blocker's left face at x = 4, so it slides past along it.
  assert.ok(pos[1] > 6, `slid to z=${pos[1]}`);
});

test("a step with bad input stays where it is", () => {
  assert.deepEqual(stepInArea(open, [1, 1], [Number.NaN, 0], 0.5), [1, 1]);
  assert.deepEqual(stepInArea(open, [1, 1], [5, 1], 0), [1, 1]);
});
