// Street tree colors: lush by default, a minority turned in autumn, stable per spot.
import assert from "node:assert/strict";
import { test } from "node:test";
import { TURNED_SHARE, leafTint } from "./treeLook.ts";

const spots = Array.from({ length: 400 }, (_, i): [number, number] => [
  (i % 20) * 13.7,
  Math.floor(i / 20) * 9.1,
]);
/** A tint that is green: green is its strongest channel, as in summer. */
const greenish = ([r, g]: readonly [number, number, number]) => g >= r;

test("every tree is some shade of green outside autumn", () => {
  for (const [x, z] of spots)
    assert.ok(greenish(leafTint(x, z, false)), `tree at ${x},${z}`);
});

test("in autumn most trees stay green and the rest turn", () => {
  const turned = spots.filter(([x, z]) => !greenish(leafTint(x, z, true)));
  const share = turned.length / spots.length;
  assert.ok(Math.abs(share - TURNED_SHARE) < 0.1, `${share} turned`);
  // a turned tree at the same spot is the same color on every call
  for (const [x, z] of turned.slice(0, 20))
    assert.deepEqual(leafTint(x, z, true), leafTint(x, z, true));
});

test("autumn changes only the trees that turn", () => {
  for (const [x, z] of spots) {
    if (greenish(leafTint(x, z, true)))
      assert.deepEqual(leafTint(x, z, true), leafTint(x, z, false));
  }
});
