import assert from "node:assert/strict";
import { test } from "node:test";
import { shootingStarPoint, starField } from "./starfield.ts";

test("every star is a unit direction above the horizon, with sane size and warmth", () => {
  const f = starField(700, 300);
  assert.equal(f.count, 1000);
  for (let i = 0; i < f.count; i++) {
    const [x, y, z] = [f.dir[i * 3]!, f.dir[i * 3 + 1]!, f.dir[i * 3 + 2]!];
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-5, `unit ${i}`);
    assert.ok(y > 0.02, `above the horizon ${i}`);
    assert.ok(f.size[i]! >= 1 && f.size[i]! <= 4.5, `size ${f.size[i]}`);
    assert.ok(f.warmth[i]! >= 0 && f.warmth[i]! <= 1);
    assert.ok(f.bright[i]! > 0 && f.bright[i]! <= 1);
  }
});

test("most stars are tiny and a few are bright and large, with a spread of warmth", () => {
  const f = starField(1200, 0);
  const small = Array.from(f.size).filter((s) => s < 2).length;
  const big = Array.from(f.size).filter((s) => s > 3).length;
  assert.ok(small > 0.7 * f.count, `small ${small}`);
  assert.ok(big > 0 && big < 0.05 * f.count, `big ${big}`);
  const cool = Array.from(f.warmth).filter((w) => w < 0.35).length;
  const warm = Array.from(f.warmth).filter((w) => w > 0.65).length;
  assert.ok(cool > 50 && warm > 50);
});

test("the Milky Way is a dim band along one great circle", () => {
  const f = starField(0, 600);
  // all its stars lie near one plane through the origin
  const n = [0.35, 0.8, 0.5];
  const len = Math.hypot(n[0]!, n[1]!, n[2]!);
  let off = 0;
  for (let i = 0; i < f.count; i++) {
    off +=
      Math.abs(
        f.dir[i * 3]! * n[0]! +
          f.dir[i * 3 + 1]! * n[1]! +
          f.dir[i * 3 + 2]! * n[2]!,
      ) / len;
    assert.ok(f.bright[i]! <= 0.5, "dim");
  }
  assert.ok(
    off / f.count < 0.2,
    `mean distance from the band ${off / f.count}`,
  );
});

test("a shooting star streaks now and then, falling and always in the sky", () => {
  const out: [number, number, number] = [0, 0, 0];
  let seen = 0;
  let lastY = Infinity;
  for (let t = 0; t < 40; t += 0.05) {
    if (!shootingStarPoint(t, 0, out)) {
      lastY = Infinity;
      continue;
    }
    seen++;
    assert.ok(Math.abs(Math.hypot(...out) - 1) < 1e-5);
    assert.ok(out[1] > 0.02);
    assert.ok(out[1] < lastY, "falls");
    lastY = out[1];
  }
  // a window of about a second, a few times in forty seconds, not constantly
  assert.ok(seen > 20 && seen < 200, `seen ${seen}`);
  // a trail point lags behind the head
  assert.equal(shootingStarPoint(4.3, 0.5, out), false);
});
