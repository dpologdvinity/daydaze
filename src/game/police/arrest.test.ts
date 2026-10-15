import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARREST_STEPS,
  ARREST_TOTAL_MS,
  arrestStepAt,
  jailAfterArrest,
} from "./arrest.ts";

test("the arrest plays its steps in order and then ends", () => {
  assert.deepEqual(
    ARREST_STEPS.map((s) => s.id),
    ["approach", "warn", "cuffs", "van"],
  );
  assert.equal(arrestStepAt(0)?.id, "approach");
  assert.equal(arrestStepAt(2500)?.id, "warn");
  assert.equal(arrestStepAt(6000)?.id, "cuffs");
  assert.equal(arrestStepAt(8000)?.id, "van");
  assert.equal(arrestStepAt(ARREST_TOTAL_MS), null);
});

test("bad clock values are clamped to the opening step", () => {
  assert.equal(arrestStepAt(-5)?.id, "approach");
  assert.equal(arrestStepAt(Number.NaN)?.id, "approach");
});

test("only a jail penalty sends the player to a cell", () => {
  const now = 1_000;
  assert.deepEqual(jailAfterArrest(now, { kind: "jail", minutes: 2 }), {
    endsAt: now + 120_000,
  });
  assert.equal(jailAfterArrest(now, { kind: "fine", coins: 10 }), null);
  assert.equal(jailAfterArrest(now, { kind: "warning", banMs: 1 }), null);
});
