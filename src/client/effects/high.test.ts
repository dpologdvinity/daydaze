// Doses exist only at 18+: at 13+ taking one does nothing. At 18+ a dose
// lands after its onset, shows in the body, and is dropped once spent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setActiveTier } from "../../game/age.ts";
import { stateSituation } from "../../game/effects/buzz.ts";
import { DOSES, gameSeconds } from "../../game/effects/substances.ts";
import { ageBuzz, drink, getBuzz } from "./drunk.ts";
import {
  ageHigh,
  dosesOnboard,
  getMeters,
  setDoseToastListener,
  take,
} from "./high.ts";

test("at 13+ a dose does nothing", () => {
  setActiveTier("teen");
  assert.equal(take("joint"), false);
  assert.equal(dosesOnboard(), 0);
});

test("at 13+ NPCs never react: the drink and the dose leave her sober", () => {
  setActiveTier("teen");
  drink("shot");
  take("joint");
  assert.equal(stateSituation(getMeters(), getBuzz()), null);
});

test("at 18+ a joint lands after its onset and wears off", () => {
  setActiveTier("adult");
  try {
    assert.equal(take("joint"), true);
    assert.equal(dosesOnboard(), 1);
    ageHigh(1);
    assert.equal(getMeters().high.level, 0);
    ageHigh(gameSeconds(DOSES.joint.peak));
    assert.equal(getMeters().high.level, DOSES.joint.strength);
    assert.equal(getMeters().high.phase, "peak");
    ageHigh(gameSeconds(DOSES.joint.end));
    assert.equal(getMeters().high.level, 0);
    assert.equal(dosesOnboard(), 0);
  } finally {
    setActiveTier("teen"); // tests share one process
  }
});

test("a tab does nothing at 13+; at 18+ it reads acid at its peak", () => {
  setActiveTier("teen");
  assert.equal(take("tab"), false);
  setActiveTier("adult");
  try {
    assert.equal(take("tab"), true);
    ageHigh(gameSeconds(DOSES.tab.peak));
    assert.equal(getMeters().acid.level, DOSES.tab.strength);
    assert.equal(getMeters().acid.phase, "peak");
    assert.equal(getMeters().trip.level, 0);
    ageHigh(gameSeconds(DOSES.tab.end));
    assert.equal(getMeters().acid.level, 0);
    assert.equal(dosesOnboard(), 0);
  } finally {
    setActiveTier("teen");
  }
});

test("a pill does nothing at 13+; at 18+ it reads molly at its peak", () => {
  setActiveTier("teen");
  assert.equal(take("pill"), false);
  setActiveTier("adult");
  try {
    assert.equal(take("pill"), true);
    ageHigh(gameSeconds(DOSES.pill.peak + 1));
    assert.equal(getMeters().molly.level, DOSES.pill.strength);
    assert.equal(getMeters().molly.phase, "peak");
    assert.equal(getMeters().acid.level, 0);
    ageHigh(gameSeconds(DOSES.pill.end));
    assert.equal(getMeters().molly.level, 0);
    assert.equal(dosesOnboard(), 0);
  } finally {
    setActiveTier("teen");
  }
});

test("a line does nothing at 13+; at 18+ it reads cocaine at its peak", () => {
  setActiveTier("teen");
  assert.equal(take("line"), false);
  setActiveTier("adult");
  try {
    assert.equal(take("line"), true);
    ageHigh(gameSeconds(DOSES.line.peak + 1));
    assert.equal(getMeters().cocaine.level, DOSES.line.strength);
    assert.equal(getMeters().cocaine.phase, "peak");
    assert.equal(getMeters().molly.level, 0);
    ageHigh(gameSeconds(DOSES.line.end));
    assert.equal(getMeters().cocaine.level, 0);
    assert.equal(dosesOnboard(), 0);
  } finally {
    setActiveTier("teen");
  }
});

test("a vape of a strain reads that strain; hemp is weaker; none is hybrid", () => {
  setActiveTier("adult");
  try {
    assert.equal(take("vape", "indica"), true);
    ageHigh(gameSeconds(DOSES.vape.peak + 1));
    assert.equal(getMeters().high.strain, "indica");
    assert.equal(getMeters().high.level, DOSES.vape.strength * 1.05);
    ageHigh(gameSeconds(DOSES.vape.end));
    assert.equal(dosesOnboard(), 0);
    take("joint", "hemp");
    ageHigh(gameSeconds(DOSES.joint.peak + 1));
    assert.ok(getMeters().high.level < DOSES.joint.strength / 2);
    ageHigh(gameSeconds(DOSES.joint.end));
    take("joint");
    ageHigh(gameSeconds(DOSES.joint.peak + 1));
    assert.equal(getMeters().high.strain, "hybrid");
    ageHigh(gameSeconds(DOSES.joint.end));
  } finally {
    setActiveTier("teen");
  }
});

test("taking an edible or weed with alcohol toasts harm-reduction hints", () => {
  const toasts: string[] = [];
  setDoseToastListener((msg) => toasts.push(msg));
  try {
    // at 13+ nothing is toasted
    setActiveTier("teen");
    take("edible");
    assert.equal(toasts.length, 0);

    // at 18+: first edible gives the start-low tip
    setActiveTier("adult");
    take("edible");
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0], "Edibles take up to 2 hours. Start low, go slow.");

    // second edible before onset lands gives the redose trap warning
    take("edible");
    assert.equal(toasts.length, 2);
    assert.equal(
      toasts[1],
      "Edibles take up to 2 hours. Don't take another one yet.",
    );

    // age past both edibles
    ageHigh(gameSeconds(DOSES.edible.end + 1));
    assert.equal(dosesOnboard(), 0);

    // taking weed while buzzed gives the combo warning
    drink("cocktail");
    take("joint");
    assert.equal(toasts.length, 3);
    assert.equal(toasts[2], "Weed then drink is gentler than drink then weed.");
  } finally {
    setDoseToastListener(null);
    ageBuzz(100_000);
    ageHigh(100_000);
    setActiveTier("teen");
  }
});
