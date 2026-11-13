import assert from "node:assert/strict";
import { test } from "node:test";
import { openApproach } from "./seatApproach.ts";

const all = () => true;
// a seat at the origin facing +z: front is +z, the sides are +x and -x

test("the front wins when it is open", () => {
  const p = openApproach([0, 0], 0, [], all);
  assert.ok(p && Math.abs(p[0]) < 1e-9 && Math.abs(p[1] - 0.5) < 1e-9);
});

test("a blocked front (a bar, a table) is walked up to from a side, never behind", () => {
  const p = openApproach([0, 0], 0, [], (q) => q[1] < 0.1);
  assert.ok(p);
  // beside the seat, level with it
  assert.ok(Math.abs(Math.abs(p[0]) - 0.5) < 1e-9 && Math.abs(p[1]) < 1e-9);
  // behind is never offered, even when it is the only open spot
  assert.equal(
    openApproach([0, 0], 0, [], (q) => q[1] < -0.4),
    null,
  );
});

test("the side with more room from the next seats is picked", () => {
  // a stool in a row: a neighbor 0.9 to the -x side
  const p = openApproach([0, 0], 0, [[-0.9, 0]], (q) => q[1] < 0.1);
  assert.ok(p && p[0] > 0.4);
});

test("a spot standing in another seat is not open", () => {
  // neighbors 0.5 to each side leave nowhere
  assert.equal(
    openApproach(
      [0, 0],
      0,
      [
        [0.5, 0],
        [-0.5, 0],
        [0, 0.5],
      ],
      all,
    ),
    null,
  );
});

test("it works for any facing", () => {
  const yaw = Math.PI / 2; // facing +x
  const p = openApproach([2, 3], yaw, [], all);
  assert.ok(p && Math.abs(p[0] - 2.5) < 1e-9 && Math.abs(p[1] - 3) < 1e-9);
});
