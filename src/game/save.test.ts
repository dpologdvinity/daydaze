import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOOK, type Look } from "./look.ts";
import {
  SAVE_KEY,
  createDefaultSave,
  generateGuestName,
  isValidDisplayName,
  loadSave,
  serializeSave,
  type SaveV1,
} from "./save.ts";

const customLook: Look = {
  ...DEFAULT_LOOK,
  hairStyle: "buns",
  outfit: "fur",
  outfitColor: "#3fe0d0",
};

test("the save key is versioned", () => {
  assert.equal(SAVE_KEY, "daydaze-save-v1");
});

test("createDefaultSave uses the default look and auto quality", () => {
  assert.deepEqual(createDefaultSave("Mango Fan"), {
    version: 1,
    name: "Mango Fan",
    look: DEFAULT_LOOK,
    settings: { quality: "auto", muted: false },
  });
});

test("createDefaultSave does not share the default look object", () => {
  const save = createDefaultSave("Mango Fan");
  assert.notEqual(save.look, DEFAULT_LOOK);
});

test("a save round-trips through serializeSave and loadSave", () => {
  const save: SaveV1 = {
    version: 1,
    name: "Velvet_Kat-99",
    look: customLook,
    settings: { quality: "low", muted: true },
  };
  assert.deepEqual(loadSave(serializeSave(save), "Fallback"), save);
});

test("loadSave falls back to a default save for missing or broken data", () => {
  const fallback = createDefaultSave("MangoGuest1234");
  for (const raw of [null, "", "{", "null", "42", '"save"', "[]"]) {
    assert.deepEqual(loadSave(raw, "MangoGuest1234"), fallback);
  }
});

test("loadSave keeps a valid name when the look is bad", () => {
  const raw = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: { ...customLook, hairStyle: "mohawk" },
    settings: { quality: "high", muted: true },
  });
  assert.deepEqual(loadSave(raw, "Fallback"), {
    version: 1,
    name: "Kept Name",
    look: DEFAULT_LOOK,
    settings: { quality: "high", muted: true },
  });
});

test("loadSave keeps a valid look when the name is bad", () => {
  const raw = JSON.stringify({
    version: 1,
    name: "<script>",
    look: customLook,
  });
  assert.deepEqual(loadSave(raw, "Fallback"), {
    version: 1,
    name: "Fallback",
    look: customLook,
    settings: { quality: "auto", muted: false },
  });
});

test("loadSave repairs settings field by field", () => {
  const raw = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: customLook,
    settings: { quality: "ultra", muted: true },
  });
  assert.deepEqual(loadSave(raw, "Fallback").settings, {
    quality: "auto",
    muted: true,
  });
  const badMuted = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: customLook,
    settings: { quality: "low", muted: "yes" },
  });
  assert.deepEqual(loadSave(badMuted, "Fallback").settings, {
    quality: "low",
    muted: false,
  });
});

test("loadSave salvages valid fields from a wrong version", () => {
  const raw = JSON.stringify({ version: 7, name: "Kept Name", look: 3 });
  assert.deepEqual(loadSave(raw, "Fallback"), createDefaultSave("Kept Name"));
});

test("loadSave drops unknown fields", () => {
  const raw = JSON.stringify({
    ...createDefaultSave("Kept Name"),
    coins: 9999,
  });
  assert.deepEqual(loadSave(raw, "Fallback"), createDefaultSave("Kept Name"));
});

test("isValidDisplayName accepts 2 to 16 letters, digits, spaces, _ and -", () => {
  for (const name of [
    "Jo",
    "MangoGuest4821",
    "velvet kat",
    "a_b-c 1",
    "x".repeat(16),
  ]) {
    assert.equal(isValidDisplayName(name), true, name);
  }
});

test("isValidDisplayName rejects bad lengths, characters, padding and non-strings", () => {
  for (const name of [
    "",
    "J",
    "x".repeat(17),
    "  ",
    "    ",
    " Jo",
    "Jo ",
    "Jo!",
    "<b>hi</b>",
    "José",
    "tab\there",
    "new\nline",
    null,
    undefined,
    42,
    ["Jo"],
  ]) {
    assert.equal(isValidDisplayName(name), false, String(name));
  }
});

function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

test("generateGuestName is deterministic for a given random function", () => {
  assert.equal(
    generateGuestName(sequence(0.3, 0.6, 0.1)),
    generateGuestName(sequence(0.3, 0.6, 0.1)),
  );
  assert.equal(
    generateGuestName(() => 0),
    "MangoGuest1000",
  );
});

test("generateGuestName ends in four digits after a mango-themed name", () => {
  assert.match(
    generateGuestName(sequence(0.5, 0.5, 0.4821)),
    /^[A-Z][a-z]+[A-Z][a-z]+\d{4}$/,
  );
});

test("generateGuestName is always a valid display name, even for bad randoms", () => {
  const randoms = [0, 0.999999, 1, -1, 2, Number.NaN, Infinity, -Infinity];
  for (const a of randoms) {
    for (const b of randoms) {
      for (const c of randoms) {
        const name = generateGuestName(sequence(a, b, c));
        assert.equal(isValidDisplayName(name), true, name);
        assert.match(name, /\d{4}$/);
      }
    }
  }
});
