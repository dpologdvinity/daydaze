// The avenue's wear marks: on the road, off the crossings, the same every time.
import assert from "node:assert/strict";
import { test } from "node:test";
import { EL_X0, EL_X1 } from "./el.ts";
import { avenueWear, shadeOffset, WEAR_TRIANGLES } from "./wear.ts";

test("the marks lie on the avenue, west to east, and are stable", () => {
  const marks = avenueWear();
  assert.ok(marks.length > 200 && marks.length < 900, `${marks.length}`);
  for (const m of marks) {
    assert.ok(m.x > EL_X0 - 10 && m.x < EL_X1 + 10);
    assert.ok(Math.abs(m.z) <= 7 + 0.01, `${m.kind} at z ${m.z}`);
    assert.ok(m.sx > 0 && m.sz > 0);
  }
  assert.deepEqual(avenueWear(), marks);
  assert.equal(WEAR_TRIANGLES, 2);
});

test("tracks, oil and patches stay out of the cross streets' mouths", () => {
  for (const m of avenueWear()) {
    if (m.kind === "drain" || m.kind === "cover") continue;
    for (const cross of [-320, -64, 64, 320])
      assert.ok(
        Math.abs(m.x - cross) > 5 + (m.kind === "track" ? 0 : 0),
        `${m.kind} at x ${m.x} by the cross street at ${cross}`,
      );
  }
});

test("a drain stands in each curb on every column pair", () => {
  const drains = avenueWear().filter((m) => m.kind === "drain");
  assert.ok(drains.length >= 60);
  assert.ok(drains.every((d) => Math.abs(Math.abs(d.z) - 6.55) < 0.01));
});

test("the deck's shade slides with the sun and stays on the road", () => {
  assert.equal(shadeOffset([0, 1, 0]), 0);
  assert.ok(shadeOffset([0, 0.5, 0.5]) < 0);
  assert.ok(shadeOffset([0, 0.5, -0.5]) > 0);
  assert.equal(shadeOffset([0, 0.1, 5]), -4);
  assert.equal(shadeOffset([0, -0.5, 0.2]), 0);
});
