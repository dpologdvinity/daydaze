import assert from "node:assert/strict";
import { test } from "node:test";
import { photoCaption, photoFileName } from "./photo.ts";

const at = new Date(2026, 9, 8, 19, 5);

test("a photo's file name is the place, the day and the time", () => {
  assert.equal(
    photoFileName("The Coconut Grove", at),
    "daydaze-the-coconut-grove-2026-10-08-1905.png",
  );
  assert.equal(
    photoFileName("Rock & Roll!", at).startsWith("daydaze-rock-roll-"),
    true,
  );
  assert.equal(photoFileName("!!!", at), "daydaze-photo-2026-10-08-1905.png");
});

test("a photo's caption names the place and the date", () => {
  assert.equal(
    photoCaption("Thrift Temple", at),
    "Thrift Temple · Oct 8, 2026",
  );
});
