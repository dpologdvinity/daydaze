// Tests for particle bursts: seeded, inside their spread, and finished by the
// end of their lifetime.

import { test } from "node:test";
import assert from "node:assert/strict";
import { burst, particleAt, type Vec3 } from "./particles.ts";

test("the same seed gives the same burst; another seed differs", () => {
  const a = burst(7, 24, { speed: 3, lifetime: 1.2 });
  const b = burst(7, 24, { speed: 3, lifetime: 1.2 });
  const c = burst(8, 24, { speed: 3, lifetime: 1.2 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.particles.length, 24);
});

test("every particle starts at the origin, fully visible", () => {
  const b = burst(1, 16, { speed: 2, lifetime: 1 });
  for (const p of b.particles) {
    const out: Vec3 = [9, 9, 9];
    assert.equal(particleAt(b, p, 0, out), 1);
    assert.equal(Math.hypot(...out), 0);
  }
});

test("particles fly up and out, and fade out by their lifetime", () => {
  const b = burst(3, 32, { speed: 4, lifetime: 0.8, up: 1 });
  const out: Vec3 = [0, 0, 0];
  for (const p of b.particles) {
    assert.ok(p.life > 0 && p.life <= b.lifetime);
    const early = particleAt(b, p, 0.05, out);
    assert.ok(out[1] > 0, "it rises first");
    assert.ok(early > 0 && early < 1);
    assert.equal(particleAt(b, p, p.life, out), 0);
    assert.equal(particleAt(b, p, b.lifetime + 5, out), 0);
  }
});

test("a particle moves out from the origin as it flies", () => {
  const b = burst(2, 1, { speed: 1, lifetime: 1 });
  const out: Vec3 = [0, 0, 0];
  const p = b.particles[0];
  assert.ok(p);
  particleAt(b, p, 0.2, out);
  assert.ok(Math.hypot(...out) > 0.05);
});
