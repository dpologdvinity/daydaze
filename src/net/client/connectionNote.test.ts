import assert from "node:assert/strict";
import { test } from "node:test";
import { connectionNote } from "./connectionNote.ts";

test("a healthy connection shows nothing", () => {
  for (const s of ["idle", "ready", "open", "connecting"] as const)
    assert.equal(connectionNote(s, null), null);
});

test("dropped, offline and refused connections each say what happened", () => {
  assert.match(connectionNote("reconnecting", null) ?? "", /Reconnecting/);
  assert.match(connectionNote("offline", null) ?? "", /offline/);
  assert.match(connectionNote("closed", 4001) ?? "", /full/);
  assert.match(connectionNote("closed", 4002) ?? "", /removed/);
  assert.match(connectionNote("closed", 4003) ?? "", /banned/);
  assert.match(connectionNote("closed", 4009) ?? "", /another tab/);
  assert.match(connectionNote("closed", null) ?? "", /offline/);
});
