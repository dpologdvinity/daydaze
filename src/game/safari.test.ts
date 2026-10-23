import assert from "node:assert/strict";
import { test } from "node:test";
import {
  finalScore,
  framing,
  huntDone,
  huntList,
  newHunt,
  RANGE,
  snap,
} from "./safari.ts";
import { animalsAt, BLOCKERS, BOUNDS } from "./zoo.ts";

test("a list is four different animals", () => {
  for (const seed of [1, 2, 99, 12345]) {
    const list = huntList(seed);
    assert.equal(list.length, 4);
    assert.equal(new Set(list).size, 4);
  }
});

test("only what's in front, and in range, is in the frame", () => {
  // facing +z from the origin
  assert.ok((framing([0, 0], 0, [0, 5]) ?? 0) > 0.5);
  assert.equal(framing([0, 0], 0, [0, -5]), null, "behind");
  assert.equal(framing([0, 0], 0, [5, 1]), null, "off to the side");
  assert.equal(framing([0, 0], 0, [0, RANGE + 1]), null, "too far");
  assert.ok(
    (framing([0, 0], 0, [0, 3]) ?? 0) > (framing([0, 0], 0, [0, 10]) ?? 0),
  );
});

test("snapping ticks the listed animals in frame, once each", () => {
  const animals = [
    { kind: "lion" as const, at: [0, 4] as [number, number] },
    { kind: "lion" as const, at: [0, 9] as [number, number] },
    { kind: "zebra" as const, at: [0, -4] as [number, number] },
  ];
  const h = {
    list: ["lion", "zebra", "giraffe", "penguin"] as const,
    shots: [],
  };
  const first = snap(h, [0, 0], 0, animals);
  assert.deepEqual(first.got, ["lion"]);
  assert.equal(first.hunt.shots.length, 1);
  assert.equal(snap(first.hunt, [0, 0], 0, animals).got.length, 0);
  // turned round, the zebra
  const second = snap(first.hunt, [0, 0], Math.PI, animals);
  assert.deepEqual(second.got, ["zebra"]);
  assert.equal(huntDone(second.hunt), false);
  assert.equal(
    finalScore(second.hunt, 50),
    second.hunt.shots.reduce((s, x) => s + x.points, 0),
  );
});

test("every animal can be photographed from the zoo's paths", () => {
  const inside = ([x, z]: readonly [number, number]) =>
    BLOCKERS.some(
      (b) =>
        x >= Math.min(...b.map((p) => p[0])) &&
        x <= Math.max(...b.map((p) => p[0])) &&
        z >= Math.min(...b.map((p) => p[1])) &&
        z <= Math.max(...b.map((p) => p[1])),
    );
  const spots: [number, number][] = [];
  for (let x = BOUNDS.x0 + 0.5; x < BOUNDS.x1; x += 1)
    for (let z = BOUNDS.z0 + 0.5; z < BOUNDS.z1; z += 1)
      if (!inside([x, z])) spots.push([x, z]);
  for (const kind of [
    "giraffe",
    "zebra",
    "elephant",
    "lion",
    "penguin",
    "flamingo",
  ] as const) {
    const hunt = newHunt(1);
    const h = { ...hunt, list: [kind] };
    const seen = spots.some((from) =>
      [0, Math.PI / 2, Math.PI, -Math.PI / 2].some(
        (yaw) => snap(h, from, yaw, animalsAt(10)).got.length > 0,
      ),
    );
    assert.ok(seen, kind);
  }
});
