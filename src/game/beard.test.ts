import assert from "node:assert/strict";
import { test } from "node:test";
import { beardStrokes, type FaceMarks } from "./beard.ts";

// a face's landmarks on its texture (0..1, y down), like the doll's
const MARKS: FaceMarks = {
  noseTip: [0.5, 0.6],
  mouthL: [0.44, 0.7],
  mouthR: [0.56, 0.7],
  lCheek: [0.36, 0.58],
  rCheek: [0.64, 0.58],
};

test("no beard paints nothing", () => {
  assert.deepEqual(beardStrokes("none", MARKS), []);
});

test("a beard grows below the nose and never over the lips", () => {
  for (const kind of ["stubble", "short", "full"] as const) {
    const strokes = beardStrokes(kind, MARKS);
    assert.ok(strokes.length > 300, `${kind}: ${strokes.length}`);
    for (const s of strokes) {
      assert.ok(s.y > MARKS.noseTip[1], `${kind} above the nose at ${s.y}`);
      const lips = ((s.x - 0.5) / 0.07) ** 2 + ((s.y - 0.7) / 0.025) ** 2 < 1;
      assert.ok(!lips, `${kind} on the lips at ${s.x},${s.y}`);
    }
  }
});

test("a full beard climbs higher up the cheeks than a short one, with longer hairs", () => {
  const top = (k: "short" | "full") =>
    Math.min(
      ...beardStrokes(k, MARKS)
        .filter((s) => Math.abs(s.x - 0.5) > 0.12)
        .map((s) => s.y),
    );
  assert.ok(top("full") < top("short"));
  const len = (k: "stubble" | "full") => beardStrokes(k, MARKS)[0]?.len ?? 0;
  assert.ok(len("full") > len("stubble"));
});

test("the same face always grows the same beard", () => {
  assert.deepEqual(beardStrokes("short", MARKS), beardStrokes("short", MARKS));
});

test("the doll's own marks (left on the image's right) grow a beard too", () => {
  const doll: FaceMarks = {
    noseTip: [0.5, 0.4738],
    mouthL: [0.5812, 0.6205],
    mouthR: [0.4188, 0.6205],
    lCheek: [0.7801, 0.4783],
    rCheek: [0.2199, 0.4783],
  };
  const strokes = beardStrokes("short", doll);
  assert.ok(strokes.length > 300);
  // a mustache over the lip, and hair on the chin, not just under it
  assert.ok(strokes.some((s) => s.y < 0.6 && Math.abs(s.x - 0.5) < 0.06));
  assert.ok(strokes.some((s) => s.y > 0.66 && s.y < 0.76));
});
