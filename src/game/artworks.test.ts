// The painting catalog: every entry has its WebP, and a picture fits its slot.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { ARTWORKS, artworkUrl, fitInside, type ArtworkId } from "./artworks.ts";

const ids = Object.keys(ARTWORKS) as ArtworkId[];

test("every artwork has an image under public/art and a distinct title", () => {
  for (const id of ids) {
    assert.ok(existsSync(`public${artworkUrl(id)}`), `${id}.webp`);
  }
  const titles = ids.map((id) => ARTWORKS[id].title);
  assert.equal(new Set(titles).size, titles.length);
});

test("fitInside keeps the aspect and stays inside the slot", () => {
  // landscape picture in a tall slot: width limits it
  assert.deepEqual(fitInside(2, 1.6, 2.4), { w: 1.6, h: 0.8 });
  // portrait picture in a wide slot: height limits it
  assert.deepEqual(fitInside(0.5, 2, 1), { w: 0.5, h: 1 });
  // a degenerate aspect falls back to a square
  assert.deepEqual(fitInside(0, 1, 2), { w: 1, h: 1 });
  assert.deepEqual(fitInside(Number.NaN, 2, 1), { w: 1, h: 1 });
});
