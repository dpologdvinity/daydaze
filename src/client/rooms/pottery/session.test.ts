// A kiln completes once, and canceled or collapsed clay never pays.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pottery, startPot, finishFiring } from "./session.ts";
import { prizeDesk } from "../../ui/prizeDesk.ts";

test("firing saves and awards exactly once; canceled and collapsed pots do neither", () => {
  let saves = 0;
  pottery.set({
    commit: () => {
      saves++;
    },
  });
  startPot("mug");
  finishFiring();
  assert.equal(saves, 0);
  pottery.set({ phase: "firing" });
  finishFiring();
  assert.equal(saves, 1);
  assert.equal(pottery.get().saved?.target, "mug");
  assert.equal(prizeDesk.get().pending?.game, "pottery");
  prizeDesk.set({ pending: null });
  finishFiring();
  assert.equal(saves, 1);
  assert.equal(prizeDesk.get().pending, null);
  startPot("vase");
  pottery.set({ phase: "idle" });
  finishFiring();
  assert.equal(saves, 1);
  pottery.set({
    phase: "firing",
    clay: {
      left: Array<number>(8).fill(0.95),
      right: Array<number>(8).fill(0.95),
      height: 1.5,
    },
  });
  finishFiring();
  assert.equal(saves, 1);
  assert.equal(prizeDesk.get().pending, null);
  pottery.set({ phase: "idle", commit: null, saved: null });
});
