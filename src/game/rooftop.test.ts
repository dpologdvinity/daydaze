import { test } from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon, type Vec2 } from "./walk.ts";
import { BLOCKERS, FLOOR, LOUNGE_CHAIRS, STOOL_XS } from "./rooftop.ts";

test("each lounge armchair stands on the deck, blocks it alone, and can be walked up to from behind", () => {
  for (const { at, yaw } of LOUNGE_CHAIRS) {
    assert.ok(pointInPolygon(FLOOR, at));
    // only its own blocker covers its center
    assert.equal(
      BLOCKERS.filter((b) => pointInPolygon(b, at)).length,
      1,
      `${at}`,
    );
    // they face the fire, so the way in is from behind: a body's width there is walkable
    const back: Vec2 = [
      at[0] - Math.sin(yaw) * 1.1,
      at[1] - Math.cos(yaw) * 1.1,
    ];
    assert.ok(pointInPolygon(FLOOR, back), "behind is on the deck");
    assert.ok(
      !BLOCKERS.some((b) => pointInPolygon(b, back)),
      "behind is clear",
    );
  }
  // clear of the bar stools
  assert.ok(STOOL_XS.every((x) => x > -4.5));
});
