// NPC memory: the greeting an NPC gives by how well it knows the player, the
// meeting record, and the loader that keeps a saved record sane and bounded.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_NPCS,
  MAX_VISITS,
  RETURNING_DAYS,
  cleanNpcMemories,
  greetingFor,
  knowsPlayer,
  meet,
  npcKey,
} from "./npcMemory.ts";
import { createDefaultSave, loadSave, serializeSave } from "./save.ts";

test("npcKey slugs the venue and the name, and always has a colon", () => {
  assert.equal(npcKey("piercing", "Vix"), "piercing:vix");
  assert.equal(npcKey("Green Haze", "Café Noir!"), "green-haze:caf-noir");
  assert.equal(npcKey(undefined, "Dee"), "city:dee");
});

test("a stranger gets the first greeting", () => {
  assert.equal(greetingFor(undefined, 100), "greeting-first");
});

test("meeting the same day again is still the first greeting", () => {
  assert.equal(greetingFor({ visits: 1, last: 100 }, 100), "greeting-first");
});

test("a second day, and a regular, get the regular greeting", () => {
  assert.equal(greetingFor({ visits: 1, last: 100 }, 101), "greeting-regular");
  assert.equal(greetingFor({ visits: 5, last: 100 }, 100), "greeting-regular");
});

test("a long gap gets the returning greeting, even for a regular", () => {
  const gap = RETURNING_DAYS;
  assert.equal(
    greetingFor({ visits: 5, last: 100 }, 100 + gap - 1),
    "greeting-regular",
  );
  assert.equal(
    greetingFor({ visits: 5, last: 100 }, 100 + gap),
    "greeting-returning",
  );
  assert.equal(
    greetingFor({ visits: 1, last: 100 }, 100 + gap),
    "greeting-returning",
  );
});

test("an NPC uses the player's name from the second visit day", () => {
  assert.equal(knowsPlayer(undefined), false);
  assert.equal(knowsPlayer({ visits: 1, last: 5 }), false);
  assert.equal(knowsPlayer({ visits: 2, last: 5 }), true);
});

test("meet counts one visit per day and never mutates", () => {
  const start = {};
  const a = meet(start, "a:x", 10);
  assert.deepEqual(a, { "a:x": { visits: 1, last: 10 } });
  assert.deepEqual(start, {});
  assert.equal(meet(a, "a:x", 10), a, "the same day changes nothing");
  assert.deepEqual(meet(a, "a:x", 12), { "a:x": { visits: 2, last: 12 } });
});

test("a clock that went backwards does not add a visit or move last back", () => {
  const a = { "a:x": { visits: 3, last: 50 } };
  assert.equal(meet(a, "a:x", 40), a);
});

test("meet ignores an invalid day or key", () => {
  assert.deepEqual(meet({}, "a:x", -1), {});
  assert.deepEqual(meet({}, "a:x", Number.NaN), {});
  assert.deepEqual(meet({}, "no colon", 5), {});
});

test("visits stop at the cap", () => {
  const full = { "a:x": { visits: MAX_VISITS, last: 1 } };
  assert.equal(meet(full, "a:x", 2)["a:x"]?.visits, MAX_VISITS);
});

test("the record keeps only the most recently met NPCs", () => {
  let memories = {};
  for (let i = 0; i < MAX_NPCS + 10; i += 1) {
    memories = meet(memories, `v:n${i}`, 10 + i);
  }
  const keys = Object.keys(memories);
  assert.equal(keys.length, MAX_NPCS);
  assert.ok(!keys.includes("v:n0"), "the oldest was dropped");
  assert.ok(keys.includes(`v:n${MAX_NPCS + 9}`));
});

test("cleanNpcMemories keeps good entries and drops bad ones", () => {
  const cleaned = cleanNpcMemories({
    "a:ok": { visits: 3, last: 20 },
    "a:float": { visits: 1.5, last: 20 },
    "a:neg": { visits: -1, last: 20 },
    "a:zero": { visits: 0, last: 20 },
    "a:str": { visits: "3", last: 20 },
    "a:no-last": { visits: 3 },
    "no colon": { visits: 1, last: 1 },
    "a:null": null,
  });
  assert.deepEqual(cleaned, { "a:ok": { visits: 3, last: 20 } });
});

test("cleanNpcMemories clamps huge visits and rejects a prototype key", () => {
  const cleaned = cleanNpcMemories(
    JSON.parse(
      '{"a:big":{"visits":999999999,"last":5},"__proto__":{"visits":1,"last":1}}',
    ),
  );
  assert.deepEqual(cleaned, { "a:big": { visits: MAX_VISITS, last: 5 } });
  assert.equal(Object.getPrototypeOf(cleaned), Object.prototype);
});

test("cleanNpcMemories caps an oversized record to the newest", () => {
  const big: Record<string, unknown> = {};
  for (let i = 0; i < MAX_NPCS + 50; i += 1) {
    big[`v:n${i}`] = { visits: 1, last: i + 1 };
  }
  const cleaned = cleanNpcMemories(big);
  assert.equal(Object.keys(cleaned).length, MAX_NPCS);
  assert.ok(`v:n${MAX_NPCS + 49}` in cleaned);
  assert.ok(!("v:n0" in cleaned));
});

test("cleanNpcMemories gives an empty record for anything else", () => {
  for (const bad of [undefined, null, 4, "x", [], [1]]) {
    assert.deepEqual(cleanNpcMemories(bad), {});
  }
});

test("the save keeps NPC memories, and an older save starts with none", () => {
  const save = createDefaultSave("Dana");
  assert.deepEqual(save.npcs, {});
  const withMemory = { ...save, npcs: meet({}, "piercing:vix", 30) };
  const back = loadSave(serializeSave(withMemory), "Guest");
  assert.deepEqual(back.npcs, { "piercing:vix": { visits: 1, last: 30 } });
  const { npcs: _dropped, ...older } = withMemory;
  assert.deepEqual(loadSave(JSON.stringify(older), "Guest").npcs, {});
});
