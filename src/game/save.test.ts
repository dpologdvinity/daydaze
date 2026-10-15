import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOOK, DEFAULT_SWIM, type Look } from "./look.ts";
import { STARTING_COINS } from "./wallet.ts";
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
    swim: DEFAULT_SWIM,
    coins: STARTING_COINS,
    wardrobe: [],
    settings: {
      quality: "auto",
      muted: false,
      effects: "full",
      panelOpen: false,
    },
    home: { locked: true, furniture: [] },
    jail: { endsAt: null },
    crime: { offences: 0, bans: {} },
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
    swim: { style: "one-piece", color: "#ff2f9a" },
    coins: 320,
    wardrobe: [],
    settings: { quality: "low", muted: true, effects: "off", panelOpen: true },
    home: {
      locked: false,
      furniture: [{ id: "sofa", cell: [0, 0], rotation: 1 }],
    },
    jail: { endsAt: 1_900_000_000_000 },
    crime: { offences: 3, bans: { bodega: 1_900_000_000_000 } },
  };
  assert.deepEqual(loadSave(serializeSave(save), "Fallback"), save);
});

test("a save from before the apartment, jail and crime fields still loads", () => {
  const old = JSON.stringify({
    version: 1,
    name: "Velvet_Kat-99",
    look: customLook,
    settings: { quality: "low", muted: true, effects: "off" },
  });
  const loaded = loadSave(old, "Fallback");
  assert.deepEqual(loaded.home, { locked: true, furniture: [] });
  assert.deepEqual(loaded.jail, { endsAt: null });
  assert.deepEqual(loaded.crime, { offences: 0, bans: {} });
});

test("a damaged home, jail or crime field falls back without losing the rest", () => {
  const raw = JSON.stringify({
    version: 1,
    name: "Kept Name",
    home: { locked: "yes", furniture: "lots" },
    jail: { endsAt: "later" },
    crime: { offences: -1, bans: "none" },
  });
  const loaded = loadSave(raw, "Fallback");
  assert.equal(loaded.name, "Kept Name");
  assert.deepEqual(loaded.home, { locked: true, furniture: [] });
  assert.deepEqual(loaded.jail, { endsAt: null });
  assert.deepEqual(loaded.crime, { offences: 0, bans: {} });
});

test("a save from before the swimsuit slot still loads", () => {
  const old = JSON.stringify({
    version: 1,
    name: "Velvet_Kat-99",
    look: customLook,
    settings: { quality: "low", muted: true },
  });
  assert.deepEqual(loadSave(old, "Fallback"), {
    version: 1,
    name: "Velvet_Kat-99",
    look: customLook,
    swim: DEFAULT_SWIM,
    coins: STARTING_COINS,
    wardrobe: [],
    settings: {
      quality: "low",
      muted: true,
      effects: "full",
      panelOpen: false,
    },
    home: { locked: true, furniture: [] },
    jail: { endsAt: null },
    crime: { offences: 0, bans: {} },
  });
});

test("a bad swimsuit falls back without touching the outfit", () => {
  const raw = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: customLook,
    swim: { style: "bikini", color: "#000001" },
  });
  const save = loadSave(raw, "Fallback");
  assert.deepEqual(save.swim, DEFAULT_SWIM);
  assert.deepEqual(save.look, customLook);
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
    settings: {
      quality: "high",
      muted: true,
      effects: "full",
      panelOpen: false,
    },
  });
  assert.deepEqual(loadSave(raw, "Fallback"), {
    version: 1,
    name: "Kept Name",
    look: DEFAULT_LOOK,
    swim: DEFAULT_SWIM,
    coins: STARTING_COINS,
    wardrobe: [],
    settings: {
      quality: "high",
      muted: true,
      effects: "full",
      panelOpen: false,
    },
    home: { locked: true, furniture: [] },
    jail: { endsAt: null },
    crime: { offences: 0, bans: {} },
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
    swim: DEFAULT_SWIM,
    coins: STARTING_COINS,
    wardrobe: [],
    settings: {
      quality: "auto",
      muted: false,
      effects: "full",
      panelOpen: false,
    },
    home: { locked: true, furniture: [] },
    jail: { endsAt: null },
    crime: { offences: 0, bans: {} },
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
    effects: "full",
    panelOpen: false,
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
    effects: "full",
    panelOpen: false,
  });
});

test("a save from before the effects setting loads with full effects", () => {
  const old = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: customLook,
    settings: { quality: "low", muted: true },
  });
  assert.equal(loadSave(old, "Fallback").settings.effects, "full");
});

test("loadSave repairs the effects setting without touching the rest", () => {
  const raw = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: customLook,
    settings: {
      quality: "low",
      muted: true,
      effects: "loud",
      panelOpen: false,
    },
  });
  assert.deepEqual(loadSave(raw, "Fallback").settings, {
    quality: "low",
    muted: true,
    effects: "full",
    panelOpen: false,
  });
  const low = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: customLook,
    settings: { quality: "low", muted: true, effects: "low", panelOpen: false },
  });
  assert.equal(loadSave(low, "Fallback").settings.effects, "low");
});

test("a save from before the economy starts with the starting coins", () => {
  const old = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: customLook,
    swim: DEFAULT_SWIM,
    settings: { quality: "low", muted: true, effects: "full" },
  });
  assert.equal(loadSave(old, "Fallback").coins, STARTING_COINS);
});

test("a bad coin balance falls back without touching the rest", () => {
  for (const coins of [-5, 2.5, "lots", 1_000_000_000]) {
    const raw = JSON.stringify({
      ...createDefaultSave("Kept Name"),
      look: customLook,
      coins,
    });
    const save = loadSave(raw, "Fallback");
    assert.equal(save.coins, STARTING_COINS, String(coins));
    assert.deepEqual(save.look, customLook);
  }
});

test("a save from before the wardrobe loads with nothing owned", () => {
  const old = JSON.stringify({
    version: 1,
    name: "Kept Name",
    look: customLook,
    coins: 40,
  });
  assert.deepEqual(loadSave(old, "Fallback").wardrobe, []);
});

test("owned shop looks are kept and unowned ones are worn as the default", () => {
  const shopLook: Look = {
    ...customLook,
    outfit: "tracksuit-y2k",
    lips: "lips-chrome-berry",
  };
  const owned = JSON.stringify({
    ...createDefaultSave("Kept Name"),
    look: shopLook,
    wardrobe: ["tracksuit-y2k", "lips-chrome-berry", "mystery"],
  });
  const loaded = loadSave(owned, "Fallback");
  assert.deepEqual(loaded.look, shopLook);
  assert.deepEqual(loaded.wardrobe, ["tracksuit-y2k", "lips-chrome-berry"]);
  const unowned = JSON.stringify({
    ...createDefaultSave("Kept Name"),
    look: shopLook,
    wardrobe: ["lips-chrome-berry"],
  });
  assert.deepEqual(loadSave(unowned, "Fallback").look, {
    ...shopLook,
    outfit: DEFAULT_LOOK.outfit,
  });
});

test("loadSave salvages valid fields from a wrong version", () => {
  const raw = JSON.stringify({ version: 7, name: "Kept Name", look: 3 });
  assert.deepEqual(loadSave(raw, "Fallback"), createDefaultSave("Kept Name"));
});

test("loadSave drops unknown fields", () => {
  const raw = JSON.stringify({
    ...createDefaultSave("Kept Name"),
    cheats: 9999,
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

test("the dressing-room drawer starts closed and keeps its saved state", () => {
  assert.equal(createDefaultSave("Kept Name").settings.panelOpen, false);
  const old = JSON.stringify({
    version: 1,
    name: "Kept Name",
    settings: { quality: "low", muted: true, effects: "low" },
  });
  assert.equal(loadSave(old, "Fallback").settings.panelOpen, false);
  const open = JSON.stringify({
    version: 1,
    name: "Kept Name",
    settings: { panelOpen: true },
  });
  assert.equal(loadSave(open, "Fallback").settings.panelOpen, true);
  const bad = JSON.stringify({
    version: 1,
    name: "Kept Name",
    settings: { panelOpen: "yes" },
  });
  assert.equal(loadSave(bad, "Fallback").settings.panelOpen, false);
});
