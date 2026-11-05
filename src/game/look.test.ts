import { test } from "node:test";
import assert from "node:assert/strict";
import { unlockedLook } from "./shop.ts";
import {
  NATURAL_LIMBS,
  decodeLimbs,
  encodeLimbs,
  limbsOf,
  BEARDS,
  SHORT_CUTS,
  modelSuffix,
  bodyOf,
  BROWS,
  STARTER_LOOKS,
  PRONOUNS,
  FIGURES,
  DEFAULT_FACE,
  DEFAULT_MAKEUP,
  NO_PIERCINGS,
  decodePiercings,
  encodePiercings,
  piercingsOf,
  decodeMakeup,
  decodeSwim,
  encodeMakeup,
  encodeSwim,
  makeupOf,
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
  // Mixing catalogs: a hair color is not an outfit color.
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

test("face codes round-trip every slider step, body and eye color", () => {
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
    "kkkkkk009999",
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

test("makeup codes round-trip and old looks wear the default", () => {
  const m = {
    ...DEFAULT_MAKEUP,
    liner: "graphic" as const,
    blush: "berry" as const,
    highlight: "icy" as const,
  };
  assert.deepEqual(decodeMakeup(encodeMakeup(m)), m);
  assert.equal(
    validateLook({ ...DEFAULT_LOOK, makeup: encodeMakeup(m) }),
    true,
  );
  assert.deepEqual(makeupOf(DEFAULT_LOOK), DEFAULT_MAKEUP);
  for (const bad of ["", "99999", "9999999", "abcdef", 5, null])
    assert.equal(validateLook({ ...DEFAULT_LOOK, makeup: bad }), false);
});

test("freckles and glasses ride in the makeup code; 6-digit codes still decode", () => {
  const m = {
    ...DEFAULT_MAKEUP,
    freckles: "lots" as const,
    glasses: "cat-eye" as const,
  };
  const code = encodeMakeup(m);
  assert.equal(code.length, 12);
  assert.deepEqual(decodeMakeup(code), m);
  // a code from before freckles and glasses: the same makeup, none of either
  const old = code.slice(0, 6);
  assert.deepEqual(decodeMakeup(old), {
    ...m,
    freckles: "none",
    glasses: "none",
  });
  assert.equal(decodeMakeup(`${code}0`), null);
});

test("skin marks and the monolid ride in the codes and fit the wire limit", () => {
  const m = {
    ...DEFAULT_MAKEUP,
    vitiligo: "patchy" as const,
    birthmark: "port-wine" as const,
  };
  const code = encodeMakeup(m);
  assert.deepEqual(decodeMakeup(code), m);
  // an 8-digit code from before skin marks: the same makeup, no marks
  assert.deepEqual(decodeMakeup(code.slice(0, 8)), {
    ...m,
    vitiligo: "none",
    birthmark: "none",
  });
  const face = { ...DEFAULT_FACE, eyeShape: "monolid" as const };
  assert.deepEqual(decodeFace(encodeFace(face)), face);
  const look = {
    ...DEFAULT_LOOK,
    makeup: code,
    face: encodeFace(face),
  };
  assert.equal(validateLook(look), true);
  // no new Look field: a full look stays within the 24-key wire limit
  assert.ok(Object.keys(look).length <= 16);
});

test("a bindi and hearing aids ride at the end of the makeup code; 10-digit codes still decode", () => {
  const m = {
    ...DEFAULT_MAKEUP,
    glasses: "round" as const,
    bindi: "gold" as const,
    hearing: "teal" as const,
  };
  const code = encodeMakeup(m);
  assert.deepEqual(decodeMakeup(code), m);
  assert.deepEqual(decodeMakeup(code.slice(0, 10)), {
    ...m,
    bindi: "none",
    hearing: "none",
  });
  assert.equal(validateLook({ ...DEFAULT_LOOK, makeup: code }), true);
  assert.equal(decodeMakeup(code.slice(0, 10) + "9"), null);
});

test("face presets ride in the code; 8-character codes still decode", () => {
  const face = {
    ...DEFAULT_FACE,
    eyeShape: "hooded" as const,
    noseShape: "roman" as const,
    lipShape: "heart" as const,
    faceShape: "diamond" as const,
  };
  assert.deepEqual(decodeFace(encodeFace(face)), face);
  assert.deepEqual(decodeFace("kkkkkk00"), DEFAULT_FACE);
});

test("piercings round-trip and old looks have none", () => {
  const p = {
    ...NO_PIERCINGS,
    lip: "gold-ring" as const,
    navel: "silver-stud" as const,
  };
  assert.deepEqual(decodePiercings(encodePiercings(p)), p);
  assert.equal(
    validateLook({ ...DEFAULT_LOOK, piercings: encodePiercings(p) }),
    true,
  );
  assert.deepEqual(piercingsOf(DEFAULT_LOOK), NO_PIERCINGS);
  for (const bad of ["", "9000", "00000", "a000", 0])
    assert.equal(validateLook({ ...DEFAULT_LOOK, piercings: bad }), false);
});

test("a swimsuit rides on the online look as a short code", () => {
  const swim = { style: "tankini", color: "#ff2f9a" } as const;
  const code = encodeSwim(swim);
  assert.deepEqual(decodeSwim(code), swim);
  assert.equal(validateLook({ ...DEFAULT_LOOK, swim: code }), true);
  for (const bad of ["tankini", "tankini|#nope", "x|#ff2f9a", "a|b|c", 4])
    assert.equal(validateLook({ ...DEFAULT_LOOK, swim: bad }), false);
});

test("pronouns are an optional pick from the list", () => {
  assert.ok(validateLook({ ...DEFAULT_LOOK, pronouns: "she/they" }));
  assert.ok(validateLook({ ...DEFAULT_LOOK, pronouns: "any pronouns" }));
  assert.ok(!validateLook({ ...DEFAULT_LOOK, pronouns: "<script>" }));
  assert.ok(!validateLook({ ...DEFAULT_LOOK, pronouns: undefined }));
  assert.ok(PRONOUNS.includes("they/them"));
});

test("the four starter looks are valid, free and different, one a man", () => {
  assert.equal(STARTER_LOOKS.length, 4);
  assert.ok(STARTER_LOOKS.some((s) => s.look.body === "masculine"));
  for (const { label, look } of STARTER_LOOKS) {
    assert.ok(validateLook(look), label);
    // nothing from a shop: a new player owns none of it
    assert.deepEqual(unlockedLook(look, []), look, label);
  }
  assert.equal(new Set(STARTER_LOOKS.map((s) => s.look.skin)).size, 4);
  assert.equal(new Set(STARTER_LOOKS.map((s) => s.look.outfit)).size, 4);
});

test("a look can have a masculine body and a beard; old looks stay valid", () => {
  const man: Record<string, unknown> = {
    ...DEFAULT_LOOK,
    body: "masculine",
    beard: "short",
    hairStyle: "crop",
    outfit: "suit",
  };
  assert.equal(validateLook(man), true);
  assert.equal(validateLook({ ...DEFAULT_LOOK, body: "feminine" }), true);
  assert.equal(validateLook({ ...DEFAULT_LOOK, body: "robot" }), false);
  assert.equal(validateLook({ ...DEFAULT_LOOK, beard: "goatee-ish" }), false);
  // a look from before bodies existed has neither field, and is a woman's
  assert.equal(validateLook(DEFAULT_LOOK), true);
  assert.equal(bodyOf(DEFAULT_LOOK), "feminine");
  assert.ok(validateLook(man));
  assert.equal(bodyOf(man), "masculine");
});

test("close-cropped styles are pickable, valid and validate", () => {
  for (const id of ["buzz", "shaved-sides", "bald", "edges"] as const) {
    assert.ok(
      HAIR_STYLES.some((h) => h.id === id),
      id,
    );
    const look = { ...DEFAULT_LOOK, hairStyle: id };
    assert.ok(validateLook(look), id);
  }
  // two of them suit the men's short cuts; bald and edges are for anyone
  assert.ok(SHORT_CUTS.includes("buzz") && SHORT_CUTS.includes("shaved-sides"));
});

test("short cuts and menswear are in the closet's catalogs", () => {
  for (const id of ["crop", "textured", "swept", "fringe"])
    assert.ok(
      HAIR_STYLES.some((h) => h.id === id),
      id,
    );
  for (const id of [
    "denim-shirt",
    "striped-shirt",
    "puffer",
    "white-tee",
    "suit",
    "overalls",
  ])
    assert.ok(
      OUTFITS.some((o) => o.id === id),
      id,
    );
  assert.deepEqual(
    BEARDS.map((b) => b.id),
    ["none", "stubble", "short", "full"],
  );
});

test("men and women are separate dolls: a man's models carry the -m suffix", () => {
  assert.equal(modelSuffix(DEFAULT_LOOK), "");
  assert.equal(modelSuffix({ ...DEFAULT_LOOK, body: "feminine" }), "");
  assert.equal(modelSuffix({ ...DEFAULT_LOOK, body: "masculine" }), "-m");
});

test("prostheses ride in one more look field, within the wire limit", () => {
  const limbs = { ...NATURAL_LIMBS, legR: "prosthetic" as const };
  const code = encodeLimbs(limbs);
  assert.equal(code, "01");
  assert.deepEqual(decodeLimbs(code), limbs);
  assert.deepEqual(limbsOf(DEFAULT_LOOK), NATURAL_LIMBS);
  assert.equal(validateLook({ ...DEFAULT_LOOK, limbs: code }), true);
  for (const bad of ["", "0", "012", "02", "a0", 1, null])
    assert.equal(validateLook({ ...DEFAULT_LOOK, limbs: bad }), false);
  // every optional field at once still fits the 24-key wire limit
  const full = {
    ...DEFAULT_LOOK,
    face: encodeFace(DEFAULT_FACE),
    makeup: encodeMakeup(DEFAULT_MAKEUP),
    piercings: encodePiercings(NO_PIERCINGS),
    gait: "wheelchair",
    shoes: "boots",
    swim: "bikini-0",
    pronouns: "they/them",
    body: "masculine",
    beard: "full",
    limbs: code,
  };
  assert.ok(Object.keys(full).length <= 24, `${Object.keys(full).length} keys`);
});
