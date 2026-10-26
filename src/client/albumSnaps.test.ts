import assert from "node:assert/strict";
import { test } from "node:test";
import { addSnap, parseSnaps, SNAP_LIMIT } from "./albumSnaps.ts";

const snap = (n: number) => ({
  src: `data:image/jpeg;base64,${n}`,
  place: `Place ${n}`,
  at: n,
});

test("new snapshots go first, and the album keeps only the latest", () => {
  let album: ReturnType<typeof parseSnaps> = [];
  for (let n = 1; n <= SNAP_LIMIT + 3; n++) album = addSnap(album, snap(n));
  assert.equal(album.length, SNAP_LIMIT);
  assert.equal(album[0]?.at, SNAP_LIMIT + 3);
  assert.equal(album.at(-1)?.at, 4);
});

test("stored snapshots are validated: only jpeg or png data and a place", () => {
  const good = snap(1);
  const raw = JSON.stringify([
    good,
    { src: "https://evil.example/x.png", place: "x", at: 2 },
    { src: "data:image/jpeg;base64,AA", place: 5, at: 3 },
    "nope",
  ]);
  assert.deepEqual(parseSnaps(raw), [good]);
  assert.deepEqual(parseSnaps("{broken"), []);
  assert.deepEqual(parseSnaps(null), []);
});
