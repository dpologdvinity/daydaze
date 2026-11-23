// Looks: the default and NPC looks use catalog ids, catalogs have unique ids, and
// validateLook accepts valid combinations and rejects junk.
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
  seededMakeup,
  DEFAULT_LOOK,
  EYESHADOWS,
  GLOSSES,
  isColor,
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

test("custom colors survive look, face, makeup and swim validation", () => {
  const face = { ...DEFAULT_FACE, eyeColor: "#123abc" };
  assert.deepEqual(decodeFace(encodeFace(face)), face);
  const makeup = { ...DEFAULT_MAKEUP, blush: "#45abcd", highlight: "#123456" };
  assert.deepEqual(decodeMakeup(encodeMakeup(makeup)), makeup);
  assert.equal(
    validateLook({
      ...DEFAULT_LOOK,
      hairColor: "#123abc",
      outfitColor: "#012345",
      lips: "#000000",
      shadow: "#ffffff",
      face: encodeFace(face),
      makeup: encodeMakeup(makeup),
    }),
    true,
  );
  assert.equal(validateSwim({ ...DEFAULT_SWIM, color: "#a1b2c3" }), true);
});

test("individual nose, mouth and chin adjustments round-trip with custom eyes", () => {
  const face = {
    ...DEFAULT_FACE,
    noseLength: 0.7,
    noseBridge: -0.4,
    noseTip: 0.3,
    mouthWidth: -0.8,
    chinHeight: 0.2,
    chinDepth: -0.6,
    eyeColor: "#123abc",
  };
  const code = encodeFace(face);
  assert.deepEqual(decodeFace(code), face);
  assert.ok(code.length <= 32, "fits the multiplayer field limit");
  assert.equal(decodeFace(`${encodeFace(DEFAULT_FACE)}~abc`), null);
  assert.equal(decodeFace(`${encodeFace(DEFAULT_FACE)}~abcdef~abcdef`), null);
});

test("custom colors reject malformed values and leave skin catalog controlled", () => {
  for (const color of [
    "red",
    "#abc",
    "#1234567",
    "url(bad)",
    "#12345z",
    "#123456\n",
  ]) {
    for (const field of ["hairColor", "outfitColor", "lips", "shadow"]) {
      assert.equal(validateLook({ ...DEFAULT_LOOK, [field]: color }), false);
    }
    assert.equal(validateSwim({ ...DEFAULT_SWIM, color }), false);
  }
  assert.equal(validateLook({ ...DEFAULT_LOOK, skin: "#123abc" }), false);
  assert.equal(decodeFace(`${encodeFace(DEFAULT_FACE)}|red`), null);
  assert.equal(decodeMakeup(`${encodeMakeup(DEFAULT_MAKEUP)}|red|`), null);
});

test("the default look and every NPC look use catalog ids", () => {
  assert.equal(validateLook(DEFAULT_LOOK), true);
  for (const npc of NPC_LOOKS) assert.equal(validateLook(npc.look), true);
});

test("new characters start with a natural face ready for optional makeup", () => {
  assert.equal(DEFAULT_LOOK.lips, "lips-bare-balm");
  assert.equal(DEFAULT_LOOK.hairStyle, "long-waves");
  assert.equal(makeupOf(DEFAULT_LOOK).shadowStyle, "none");
  assert.equal(makeupOf(DEFAULT_LOOK).liner, "none");
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
  assert.equal(validateLook({ ...DEFAULT_LOOK, hairStyle: "mullet" }), false);
  assert.equal(validateLook({ ...DEFAULT_LOOK, outfitColor: 7 }), false);
  // Colors are shared across the wardrobe.
  assert.equal(validateLook({ ...DEFAULT_LOOK, outfitColor: "#1b1014" }), true);
});

test("validateLook ignores inherited fields", () => {
  const inherited: unknown = Object.create(DEFAULT_LOOK);
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

test("seeded NPC makeup is stable, valid, and small seeds receive all traits with expected frequencies", () => {
  assert.deepEqual(seededMakeup(7), seededMakeup(7));

  const counts = {
    bindi: 0,
    hearing: 0,
    vitiligo: 0,
    birthmark: 0,
  };
  const seenBindi = new Set<string>();
  const seenHearing = new Set<string>();
  const seenVitiligo = new Set<string>();
  const seenBirthmark = new Set<string>();

  for (let seed = 1; seed <= 500; seed++) {
    const m = seededMakeup(seed);
    const code = encodeMakeup(m);
    assert.deepEqual(decodeMakeup(code), m);
    seenBindi.add(m.bindi);
    seenHearing.add(m.hearing);
    seenVitiligo.add(m.vitiligo);
    seenBirthmark.add(m.birthmark);
    if (m.bindi !== "none") counts.bindi++;
    if (m.hearing !== "none") counts.hearing++;
    if (m.vitiligo !== "none") counts.vitiligo++;
    if (m.birthmark !== "none") counts.birthmark++;
  }

  // All trait options are present among small seeds
  assert.deepEqual(Array.from(seenBindi).sort(), ["gold", "none", "red"]);
  assert.deepEqual(Array.from(seenHearing).sort(), ["beige", "none", "pink"]);
  assert.deepEqual(Array.from(seenVitiligo).sort(), [
    "light",
    "none",
    "patchy",
  ]);
  assert.deepEqual(Array.from(seenBirthmark).sort(), [
    "cafe-au-lait",
    "moles",
    "none",
    "port-wine",
  ]);

  // Expected frequencies across 500 seeds:
  // bindi: 2/7 (~143)
  // hearing: 2/8 (125)
  // vitiligo: 2/7 (~143)
  // birthmark: 3/7 (~214)
  assert.ok(
    counts.bindi > 100 && counts.bindi < 200,
    `bindi count ${counts.bindi} out of expected range`,
  );
  assert.ok(
    counts.hearing > 80 && counts.hearing < 170,
    `hearing count ${counts.hearing} out of expected range`,
  );
  assert.ok(
    counts.vitiligo > 100 && counts.vitiligo < 200,
    `vitiligo count ${counts.vitiligo} out of expected range`,
  );
  assert.ok(
    counts.birthmark > 160 && counts.birthmark < 270,
    `birthmark count ${counts.birthmark} out of expected range`,
  );
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
  assert.deepEqual(makeupOf({}), DEFAULT_MAKEUP);
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
  assert.equal(code.length, 14);
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

test("the lipstick case holds 40+ shades from nude to bold", () => {
  assert.ok(LIPS.length >= 40, `${LIPS.length} lipsticks`);
  for (const lip of LIPS) assert.ok(isColor(lip.swatch), lip.id);
  assert.equal(new Set(LIPS.map((l) => l.swatch)).size, LIPS.length);
  // the first four are the closet's originals; saved looks still name them
  assert.deepEqual(
    LIPS.slice(0, 4).map((l) => l.id),
    [
      "lips-hot-pink-glam",
      "lips-burgundy-cherry",
      "lips-nude-pink-gloss",
      "lips-90s-caramel-ombre",
    ],
  );
});

test("metallic and glitter finishes join the old ones without moving them", () => {
  assert.deepEqual(
    GLOSSES.map((g) => g.id),
    ["matte", "satin", "glossy", "glass", "metallic", "glitter"],
  );
});

test("lip liner and lip style ride at the end of the makeup code; 12-digit codes still decode", () => {
  const m = {
    ...DEFAULT_MAKEUP,
    gloss: "glitter" as const,
    lipLiner: "overlined" as const,
    lipStyle: "ombre" as const,
  };
  const code = encodeMakeup(m);
  assert.equal(code.length, 14);
  assert.deepEqual(decodeMakeup(code), m);
  assert.deepEqual(decodeMakeup(code.slice(0, 12)), {
    ...m,
    lipLiner: "soft",
    lipStyle: "full",
  });
  assert.equal(DEFAULT_MAKEUP.lipLiner, "soft");
  assert.equal(DEFAULT_MAKEUP.lipStyle, "full");
  assert.equal(decodeMakeup(`${code.slice(0, 13)}9`), null);
  assert.equal(validateLook({ ...DEFAULT_LOOK, makeup: code }), true);
});

test("the longest makeup code fits the 32-character wire value", () => {
  const code = encodeMakeup({
    ...DEFAULT_MAKEUP,
    blush: "#123456",
    highlight: "#abcdef",
    lipLiner: "contrast",
  });
  assert.ok(code.length <= 32, `${code.length} chars`);
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
  // An explicit old face code preserves its original proportions even when
  // the starting face changes; saved players must not be restyled on reload.
  assert.deepEqual(decodeFace("kkkkkk00"), {
    ...DEFAULT_FACE,
    eyeSize: 0,
    eyeTilt: 0,
    nose: 0,
    lips: 0,
    cheeks: 0,
    jaw: 0,
  });
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

// A bare face must survive saving without reassigning existing shadow styles.
test("no eyeshadow round-trips without changing saved glam makeup", () => {
  const bare = { ...DEFAULT_MAKEUP, shadowStyle: "none" as const };
  const code = encodeMakeup(bare);
  assert.equal(decodeMakeup(code)?.shadowStyle, "none");
  assert.equal(validateLook({ ...DEFAULT_LOOK, makeup: code }), true);
  for (const [index, style] of [
    "wash",
    "cut-crease",
    "smoky",
    "halo",
  ].entries()) {
    assert.equal(decodeMakeup(`22101${index}`)?.shadowStyle, style);
  }
});

// Removing an appended brow must not silently reject an appearance players saved.
test("expanded eyebrow choices validate without changing legacy IDs", () => {
  for (const brows of [
    "brows-natural-straight",
    "brows-soft-arch",
    "brows-full-straight",
    "brows-rounded",
    "brows-high-arch",
    "brows-angled",
  ])
    assert.equal(validateLook({ ...DEFAULT_LOOK, brows }), true, brows);
  assert.deepEqual(
    BROWS.slice(0, 4).map(({ id }) => id),
    [
      "brows-y2k-thin",
      "brows-fox-snatched",
      "brows-sculpted-espresso",
      "brows-feathered-honey",
    ],
  );
});

// Literal codes protect saved appearances from reordered preset catalogs.
test("legacy and expanded eye and lip shapes keep stable save codes", () => {
  for (const [code, eyeShape, lipShape] of [
    ["kkkkkk001040", "round", "wide"],
    ["kkkkkk005020", "monolid", "thin"],
    ["kkkkkk006050", "narrow", "rounded"],
    ["kkkkkk007060", "open", "cupid"],
    ["kkkkkk008070", "soft-almond", "top-full"],
    ["kkkkkk008080", "soft-almond", "bottom-full"],
  ]) {
    const face = decodeFace(code);
    assert.ok(face, code);
    assert.equal(face.eyeShape, eyeShape);
    assert.equal(face.lipShape, lipShape);
    assert.equal(encodeFace(face), code);
    const custom = { ...face, eyeColor: "#12ab34", noseLength: 0.6 };
    const saved = encodeFace(custom);
    assert.ok(saved.length <= 32);
    assert.deepEqual(decodeFace(saved), custom);
    assert.equal(validateLook({ ...DEFAULT_LOOK, face: saved }), true);
  }
});

test("validateLook validates optional browColor field", () => {
  // Legacy looks without browColor remain valid
  assert.equal(validateLook(DEFAULT_LOOK), true);
  assert.equal(validateLook({ ...DEFAULT_LOOK, browColor: undefined }), false);

  // Valid 6-digit RGB hex colors accepted
  assert.equal(validateLook({ ...DEFAULT_LOOK, browColor: "#1a120e" }), true);
  assert.equal(validateLook({ ...DEFAULT_LOOK, browColor: "#ff0077" }), true);
  assert.equal(validateLook({ ...DEFAULT_LOOK, browColor: "#000000" }), true);

  // Invalid colors rejected
  assert.equal(validateLook({ ...DEFAULT_LOOK, browColor: "black" }), false);
  assert.equal(validateLook({ ...DEFAULT_LOOK, browColor: "#fff" }), false);
  assert.equal(
    validateLook({ ...DEFAULT_LOOK, browColor: "#1a120eff" }),
    false,
  );
  assert.equal(validateLook({ ...DEFAULT_LOOK, browColor: "123456" }), false);
});
