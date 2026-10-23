import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUZZ_CAP,
  shownBuzz,
  DECAY_SECONDS,
  SWAY_AMOUNT,
  SWAY_HZ,
  addDrink,
  chatDistort,
  decayBuzz,
  drinkWater,
  eatFood,
  intensityFactor,
  isIntensity,
  visualParams,
} from "./buzz.ts";

test("each drink adds to the buzz", () => {
  const once = addDrink(0, "beer");
  assert.ok(once > 0);
  assert.ok(addDrink(once, "beer") > once);
});

test("the buzz never goes past the cap, however many drinks", () => {
  let level = 0;
  for (let i = 0; i < 50; i++) level = addDrink(level, "shot");
  assert.equal(level, BUZZ_CAP);
  assert.equal(addDrink(BUZZ_CAP, "cocktail"), BUZZ_CAP);
});

test("bad levels are treated as sober, never as NaN", () => {
  assert.equal(addDrink(Number.NaN, "beer") > 0, true);
  assert.equal(decayBuzz(Number.NaN, 10), 0);
  assert.equal(drinkWater(Number.POSITIVE_INFINITY), 0);
});

test("the buzz fades with time and never grows", () => {
  let level = 1;
  for (let s = 0; s < 600; s += 10) {
    const next = decayBuzz(level, 10);
    assert.ok(next <= level);
    assert.ok(next >= 0);
    level = next;
  }
  assert.ok(level < 0.01, "about gone after ten minutes");
});

test("decay halves every time constant times ln 2", () => {
  const half = DECAY_SECONDS * Math.LN2;
  assert.ok(Math.abs(decayBuzz(1, half) - 0.5) < 1e-9);
});

test("decay ignores a negative time step", () => {
  assert.equal(decayBuzz(0.6, -5), 0.6);
});

test("water and food lower the buzz, and never below zero", () => {
  assert.ok(drinkWater(0.5) < 0.5);
  assert.ok(eatFood(0.5) < 0.5);
  assert.equal(drinkWater(0.1), 0);
  assert.equal(eatFood(0), 0);
  // they cut faster than the fade alone would in the same few seconds
  assert.ok(drinkWater(0.5) < decayBuzz(0.5, 60));
});

test("chat stays plain when the buzz is low", () => {
  assert.equal(chatDistort("hey you there", 0.1, 7), "hey you there");
  assert.equal(chatDistort("", 1, 7), "");
});

test("chat stretches vowels when the buzz is up", () => {
  const out = chatDistort("hey you there", 1, 3);
  assert.notEqual(out, "hey you there");
  assert.ok(out.length > "hey you there".length);
});

test("chat distortion is deterministic for a seed", () => {
  const line = "heyy everyone, who wants another round";
  assert.equal(chatDistort(line, 0.8, 42), chatDistort(line, 0.8, 42));
});

test("a different seed slurs differently", () => {
  const line = "heyy everyone, who wants another round";
  const outs = new Set([1, 2, 3, 4, 5].map((s) => chatDistort(line, 1, s)));
  assert.ok(outs.size > 1);
});

test("chat distortion only stretches vowels, so consonants and spaces survive", () => {
  const line = "bring the bass";
  const out = chatDistort(line, 1, 9);
  const consonants = (s: string) => s.replace(/[aeiouy]/gi, "");
  assert.equal(consonants(out), consonants(line));
  assert.equal(out.split(" ").length, 3);
});

test("the intensity setting is one of off, low or full", () => {
  assert.equal(isIntensity("off"), true);
  assert.equal(isIntensity("low"), true);
  assert.equal(isIntensity("full"), true);
  assert.equal(isIntensity("max"), false);
  assert.equal(isIntensity(undefined), false);
  assert.equal(intensityFactor("off"), 0);
  assert.equal(intensityFactor("low"), 0.5);
  assert.equal(intensityFactor("full"), 1);
});

test("intensity off switches every drunk visual off", () => {
  const look = visualParams(1, "off", false);
  assert.deepEqual(look, { sway: 0, wobble: 0, warm: 0, edge: 0 });
});

test("reduced motion keeps only the color and edge changes", () => {
  const look = visualParams(1, "full", true);
  assert.equal(look.sway, 0);
  assert.equal(look.wobble, 0);
  assert.ok(look.warm > 0);
  assert.ok(look.edge > 0);
});

test("the full setting is stronger than low, and both grow with the buzz", () => {
  const low = visualParams(0.6, "low", false);
  const full = visualParams(0.6, "full", false);
  assert.ok(full.sway > low.sway && low.sway > 0);
  assert.ok(full.wobble > low.wobble);
  assert.ok(visualParams(0.9, "full", false).warm > full.warm);
});

test("sway stays small and slow, so it never strobes", () => {
  const max = visualParams(1, "full", false).sway;
  assert.ok(max <= SWAY_AMOUNT);
  assert.ok(max < 0.01);
  assert.ok(SWAY_HZ < 0.5);
});

test("the buzz a move shows comes from its tier tag", () => {
  assert.equal(shownBuzz("idle"), 0);
  assert.equal(shownBuzz("dance:groove~1"), 0.3);
  assert.equal(shownBuzz("sit@40~3"), 0.9);
  assert.equal(shownBuzz("idle~7"), 0);
});
