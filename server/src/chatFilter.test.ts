import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGuestName } from "../../src/game/save.ts";
import { filterChat, isAllowedUsername } from "./chatFilter.ts";

const relaxed = { strict: false };
const strict = { strict: true };

test("slurs are masked in either mode, keeping surrounding text", () => {
  for (const opts of [relaxed, strict]) {
    assert.equal(filterChat("you faggot!", opts), "you ******!");
    assert.equal(filterChat("kike", opts), "****");
  }
});

test("matching ignores case, simple leetspeak and repeated letters", () => {
  for (const word of [
    "NIGGER",
    "n1gg3r",
    "niiiggggerrr",
    "f@ggot",
    "fagg0t",
    "$pic",
    "Retards",
    "niggaz",
  ])
    assert.equal(filterChat(word, relaxed), "*".repeat(word.length), word);
});

test("ordinary words that contain or resemble a listed word are untouched", () => {
  for (const text of [
    "Scunthorpe United",
    "the classic bass assassin",
    "a spicy spice from Niger",
    "Nigeria and Pakistan",
    "snigger at the cocktail in Dickens",
    "flame retardant",
    "as is",
    "shiitake",
  ]) {
    assert.equal(filterChat(text, relaxed), text);
    assert.equal(filterChat(text, strict), text);
  }
});

test("general profanity is allowed unless the strict filter is on", () => {
  const text = "what the fuck, this shit is a$$";
  assert.equal(filterChat(text, relaxed), text);
  assert.equal(filterChat(text, strict), "what the ****, this **** is ***");
  assert.equal(filterChat("FUCKING asses", strict), "******* *****");
});

test("usernames containing a slur are rejected, even inside other words", () => {
  for (const name of ["xXniggerXx", "Faggot_99", "the-kike", "N1GG4", "Spic"])
    assert.equal(isAllowedUsername(name), false, name);
  for (const name of [
    "MangoGuest4821",
    "SpicyMango",
    "Scunthorpe",
    "FuckYeah",
    "NigelFromNiger",
  ])
    assert.equal(isAllowedUsername(name), true, name);
});

test("every generated guest name passes the username filter", () => {
  for (let i = 0; i < 1000; i++) {
    const name = generateGuestName(() => i / 1000);
    assert.ok(isAllowedUsername(name), name);
  }
});
