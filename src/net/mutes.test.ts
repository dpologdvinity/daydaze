import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanMutes, toggleMute } from "./mutes.ts";

test("a stored mute list keeps only player ids, each once", () => {
  assert.deepEqual(cleanMutes('["g_a","g_a",5,null]'), ["g_a"]);
  assert.deepEqual(cleanMutes("not json"), []);
  assert.deepEqual(cleanMutes({}), []);
});

test("muting twice unmutes", () => {
  const once = toggleMute([], "g_abc");
  assert.equal(once.length, 1);
  assert.deepEqual(toggleMute(once, "g_abc"), []);
});
