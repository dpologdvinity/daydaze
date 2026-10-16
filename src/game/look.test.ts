import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BROWS,
  FIGURES,
  DEFAULT_FACE,
  EYE_COLORS,
  decodeFace,
  encodeFace,
  faceOf,
  seededFace,
  DEFAULT_LOOK,
  EYESHADOWS,
  HAIR_COLORS,
  HAIR_STYLES,
  LIPS,
  MOODS,
  NPC_LOOKS,
  OUTFIT_COLORS,
  OUTFITS,
  SKINS,
  SWIMSUITS,
  DEFAULT_SWIM,
  isMood,
  swimFor,
  validateLook,
  validateSwim,
} from "./look.ts";

test("the default look and every NPC look use catalog ids", () => {
  assert.equal(validateLook(DEFAULT_LOOK), true);
  for (const npc of NPC_LOOKS) assert.equal(validateLook(npc.look), true);
});

test("the default look keeps the prototype's lavender shadow and thin brows", () => {
  assert.equal(DEFAULT_LOOK.shadow, "#d23cff");
  assert.equal(DEFAULT_LOOK.brows, "brows-y2k-thin");
});

test("catalogs have unique ids and the outfits from the spec", () => {
  for (const catalog of [
    SKINS,
    HAIR_STYLES,
    HAIR_COLORS,
    LIPS,
    BROWS,
    OUTFITS,
    OUTFIT_COLORS,
    EYESHADOWS,
    MOODS,
  ]) {
    const ids = catalog.map((option) => option.id);
    assert.equal(new Set(ids).size, ids.length);
  }
  // the three starting outfits keep their labels; shop outfits follow them
  assert.deepEqual(
    OUTFITS.slice(0, 3).map((outfit) => outfit.label),
    ["Crop and flares", "Slip mini", "Faux fur"],
  );
});

test("validateLook accepts any combination of catalog ids", () => {
  assert.equal(
    validateLook({
      ...DEFAULT_LOOK,
      skin: "#633c29",
      hairStyle: "buns",
      outfit: "fur",
      shadow: "#8a5a3c",
    }),
    true,
  );
});

test("validateLook rejects non-objects", () => {
  for (const value of [null, undefined, 0, "look", [], true]) {
    assert.equal(validateLook(value), false);
  }
});

test("validateLook rejects missing, extra and off-catalog fields", () => {
  const { lips: _lips, ...missing } = DEFAULT_LOOK;
  assert.equal(validateLook(missing), false);
  assert.equal(validateLook({ ...DEFAULT_LOOK, hat: "beret" }), false);
  assert.equal(validateLook({ ...DEFAULT_LOOK, skin: "#000000" }), false);
  assert.equal(validateLook({ ...DEFAULT_LOOK, hairStyle: "mohawk" }), false);
  assert.equal(validateLook({ ...DEFAULT_LOOK, outfitColor: 7 }), false);
  // Mixing catalogs: a hair colour is not an outfit colour.
  assert.equal(
    validateLook({ ...DEFAULT_LOOK, outfitColor: "#1b1014" }),
    false,
  );
});

test("validateLook ignores inherited fields", () => {
  const inherited = Object.create(DEFAULT_LOOK);
  assert.equal(validateLook(inherited), false);
});

test("isMood accepts the five moods only", () => {
  assert.deepEqual(
    MOODS.map((mood) => mood.id),
    ["idle", "pose", "dance", "sit", "lean"],
  );
  for (const mood of MOODS) assert.equal(isMood(mood.id), true);
  for (const value of ["run", "", null, 1, "Idle"]) {
    assert.equal(isMood(value), false);
  }
});

test("swimwear rooms dress the doll in the swimsuit slot, others do not", () => {
  const swim = { style: "one-piece", color: "#ff2f9a" } as const;
  assert.equal(swimFor({ swimwear: true }, swim), swim);
  assert.equal(swimFor({ swimwear: false }, swim), null);
  assert.equal(swimFor({}, swim), null);
});

test("validateSwim accepts catalog swimsuits only", () => {
  assert.equal(validateSwim(DEFAULT_SWIM), true);
  for (const s of SWIMSUITS)
    assert.equal(validateSwim({ style: s.id, color: "#141018" }), true);
  for (const bad of [
    null,
    "bikini",
    [],
    { style: "thong", color: "#3fe0d0" },
    { style: "bikini", color: "red" },
    { style: "bikini" },
    { ...DEFAULT_SWIM, extra: 1 },
  ])
    assert.equal(validateSwim(bad), false, JSON.stringify(bad));
});

test("a look may carry a face code; looks without one stay valid", () => {
  assert.equal(validateLook({ ...DEFAULT_LOOK }), true);
  const code = encodeFace({ ...DEFAULT_FACE, lips: 0.6, figure: "curvy" });
  assert.equal(validateLook({ ...DEFAULT_LOOK, face: code }), true);
  assert.deepEqual(faceOf({ ...DEFAULT_LOOK, face: code }), {
    ...DEFAULT_FACE,
    lips: 0.6,
    figure: "curvy",
  });
  assert.deepEqual(faceOf(DEFAULT_LOOK), DEFAULT_FACE);
});

test("face codes round-trip every slider step, body and eye colour", () => {
  for (let i = -10; i <= 10; i++) {
    const face = { ...DEFAULT_FACE, eyeSize: i / 10, jaw: (0 - i) / 10 || 0 };
    assert.deepEqual(decodeFace(encodeFace(face)), face);
  }
  for (const body of FIGURES)
    for (const eye of EYE_COLORS) {
      const face = { ...DEFAULT_FACE, figure: body.id, eyeColor: eye.id };
      assert.deepEqual(decodeFace(encodeFace(face)), face);
    }
  // out-of-range sliders clamp rather than corrupt the code
  assert.equal(decodeFace(encodeFace({ ...DEFAULT_FACE, nose: 4 }))?.nose, 1);
});

test("malformed face codes are rejected", () => {
  for (const bad of [
    "",
    "kkkkkk00x",
    "zkkkkk00",
    "kkkkkk90",
    "kkkkkk09",
    3,
    null,
  ]) {
    assert.equal(decodeFace(bad), null);
    assert.equal(validateLook({ ...DEFAULT_LOOK, face: bad }), false);
  }
});

test("seeded NPC faces are stable, valid and varied", () => {
  const faces = Array.from({ length: 12 }, (_, i) => seededFace(i + 1));
  assert.deepEqual(seededFace(3), faces[2]);
  for (const f of faces) assert.notEqual(decodeFace(encodeFace(f)), null);
  assert.ok(new Set(faces.map(encodeFace)).size > 8);
});
