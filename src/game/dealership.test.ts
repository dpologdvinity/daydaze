import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  BLOCKERS,
  BOUNDS,
  DESK,
  DISPLAY,
  PLINTH,
  SHOWPIECES,
  SPAWN,
  TABLE,
} from "./dealership.ts";

type Rect = { x0: number; x1: number; z0: number; z1: number };
const rect = (
  [x, z]: readonly [number, number],
  [hx, hz]: readonly [number, number],
): Rect => ({
  x0: x - hx,
  x1: x + hx,
  z0: z - hz,
  z1: z + hz,
});
const overlap = (a: Rect, b: Rect) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

test("the showpieces stand inside the showroom, clear of every turntable, the desk and the door", () => {
  const others: Rect[] = [
    ...DISPLAY.map((d) => rect(d.at, TABLE)),
    DESK,
    // the spawn and a body's width round it
    rect(SPAWN, [0.8, 0.8]),
  ];
  const plinths = SHOWPIECES.map((s) => rect(s.at, PLINTH));
  plinths.forEach((p, i) => {
    assert.ok(p.x0 >= BOUNDS.x0 && p.x1 <= BOUNDS.x1, SHOWPIECES[i]!.id);
    assert.ok(p.z0 >= BOUNDS.z0 && p.z1 <= BOUNDS.z1, SHOWPIECES[i]!.id);
    others.forEach((o) => assert.ok(!overlap(p, o), SHOWPIECES[i]!.id));
  });
  assert.ok(!overlap(plinths[0]!, plinths[1]!));
  // each plinth blocks the floor
  assert.equal(BLOCKERS.length, DISPLAY.length + SHOWPIECES.length + 1);
});

test("a showpiece has its model and a made-up placard name, not a real marque's", () => {
  for (const s of SHOWPIECES) {
    assert.ok(existsSync(`public/models/showroom/${s.id}.glb`), s.id);
    assert.ok(s.name.length > 0 && s.name === s.name.toUpperCase());
    assert.doesNotMatch(s.name, /jaguar|daimler|xj|future|haupt|fishboe/i);
  }
  assert.equal(new Set(SHOWPIECES.map((s) => s.id)).size, SHOWPIECES.length);
});
