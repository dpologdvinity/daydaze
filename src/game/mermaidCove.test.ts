import assert from "node:assert/strict";
import test from "node:test";
import {
  COVE_ROCKS,
  SAND,
  SINGER_SPOT,
  SWIM_LOOPS,
  swimPose,
} from "./mermaidCove.ts";

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test("a swimmer stays on her loop's ellipse", () => {
  for (const loop of SWIM_LOOPS) {
    for (let t = 0; t < 60; t += 0.7) {
      const { x, z } = swimPose(loop, t);
      const u = (x - loop.center[0]) / loop.radii[0];
      const v = (z - loop.center[1]) / loop.radii[1];
      assert.ok(near(u * u + v * v, 1, 1e-9));
    }
  }
});

test("a swimmer's nose (her -z) points where she swims next", () => {
  for (const loop of SWIM_LOOPS) {
    for (let t = 0; t < 30; t += 1.3) {
      const now = swimPose(loop, t);
      const next = swimPose(loop, t + 0.01);
      const dx = next.x - now.x;
      const dz = next.z - now.z;
      const len = Math.hypot(dx, dz);
      // yaw turns the model's -z to (-sin yaw, -cos yaw)
      const dot = (-Math.sin(now.yaw) * dx + -Math.cos(now.yaw) * dz) / len;
      assert.ok(dot > 0.999, `loop at t=${t}: heading off by ${dot}`);
    }
  }
});

test("swimPose fills and returns the object it is given", () => {
  const out = { x: 0, z: 0, yaw: 0 };
  const loop = SWIM_LOOPS[0];
  assert.ok(loop);
  assert.equal(swimPose(loop, 3, out), out);
  assert.deepEqual(out, swimPose(loop, 3));
});

test("the swim loops stay in the lagoon and clear of the rocks", () => {
  for (const loop of SWIM_LOOPS) {
    for (let t = 0; t < 60; t += 0.25) {
      const { x, z } = swimPose(loop, t);
      // a mermaid is about 3 m long, so keep 1.5 m of water to the sand
      assert.ok(z < SAND.z0 - 1.5, `z ${z} is too near the beach`);
      for (const rock of COVE_ROCKS) {
        const gap = Math.hypot(x - rock.x, z - rock.z) - rock.r;
        assert.ok(gap > 1, `loop passes ${gap.toFixed(2)} m from a rock`);
      }
    }
  }
});

test("the singer comes in to sing in the water, in front of the shells", () => {
  const [x, z] = SINGER_SPOT;
  assert.ok(z < SAND.z0 && z > SAND.z0 - 3);
  assert.ok(x > SAND.x0 && x < SAND.x1);
});
