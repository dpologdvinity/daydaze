import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dive,
  DIVES,
  entryAt,
  entryOf,
  gameOver,
  newDives,
  diveTurn,
  splashSize,
  total,
  TRICKS,
  type TrickId,
} from "./cliffDive.ts";

test("entries grade from a rip to a belly flop by distance from the middle", () => {
  assert.equal(entryOf(0.5), "rip");
  assert.equal(entryOf(0.6), "clean");
  assert.equal(entryOf(0.75), "splash");
  assert.equal(entryOf(0.02), "flop");
});

test("harder tricks pay more for the same entry, and a flop pays nothing", () => {
  const easy = dive(newDives(), "pencil", 0.5);
  const hard = dive(newDives(), "twist", 0.5);
  assert.ok(total(hard) > total(easy));
  assert.equal(total(dive(newDives(), "twist", 0)), 0);
});

test("the entry meter sweeps 0..1, faster on harder tricks", () => {
  for (const t of [0, 0.3, 1.7, 9])
    for (const trick of TRICKS) {
      const v = entryAt(trick.id, t);
      assert.ok(v >= 0 && v <= 1);
    }
  // after a short beat the twist's meter has moved further than the pencil's
  assert.ok(entryAt("twist", 0.2) > entryAt("pencil", 0.2));
});

test("five dives make a set, and nothing counts after", () => {
  let g = newDives();
  for (let i = 0; i < DIVES; i++) g = dive(g, "swan", 0.5);
  assert.ok(gameOver(g));
  assert.equal(dive(g, "swan", 0.5), g);
});

test("each trick turns its own way through the flight and enters upright", () => {
  const want: Record<TrickId, [number, number]> = {
    pencil: [0, 0],
    swan: [Math.PI, 0],
    backflip: [-2 * Math.PI, 0],
    twist: [2 * Math.PI, 2 * Math.PI],
  };
  for (const t of TRICKS) {
    const [pitch, twist] = want[t.id];
    const start = diveTurn(t.id, "rip", 0);
    const end = diveTurn(t.id, "rip", 1);
    assert.equal(start.pitch, 0, t.id);
    assert.equal(start.twist, 0, t.id);
    assert.ok(Math.abs(end.pitch - pitch) < 1e-9, `${t.id} pitch ${end.pitch}`);
    assert.ok(Math.abs(end.twist - twist) < 1e-9, `${t.id} twist ${end.twist}`);
    // "upright": the body enters along the vertical, feet or head first
    const along = Math.abs(Math.sin(end.pitch));
    assert.ok(along < 1e-9, `${t.id} enters at an angle`);
    // the turn never runs backward
    let last = 0;
    for (let i = 0; i <= 50; i++) {
      const p = Math.abs(diveTurn(t.id, "rip", i / 50).pitch);
      assert.ok(p >= last - 1e-9, `${t.id} turns back at ${i}`);
      last = p;
    }
  }
});

test("a worse entry finishes off the vertical; a flop lands flat", () => {
  const off = (e: Parameters<typeof diveTurn>[1]) =>
    Math.abs(diveTurn("swan", e, 1).pitch - Math.PI);
  assert.equal(off("rip"), 0);
  assert.ok(off("clean") > 0 && off("clean") < off("splash"));
  assert.ok(Math.abs(off("flop") - Math.PI / 2) < 1e-9);
});

test("splash size grows with a worse entry", () => {
  const sizes = (["rip", "clean", "splash", "flop"] as const).map(splashSize);
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i]! > sizes[i - 1]!);
  assert.ok(sizes[0]! > 0 && sizes[3]! <= 2);
});
