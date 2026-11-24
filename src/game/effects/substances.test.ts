// The substances: researched timelines squeezed into play time, each dose's
// curve and phase, meters adding up, which one her body shows, and the
// screen look.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clipOf } from "../dance/clips.ts";
import {
  BODY,
  bodyOf,
  BREATHE_AMOUNT,
  DOSES,
  doseLevel,
  dryMouthHint,
  gameSeconds,
  heavyLid,
  HEAVY_LID_MAX,
  highParams,
  isDose,
  isStrain,
  jawClench,
  paceBoost,
  panicHint,
  phaseOf,
  profileOf,
  pupilDilation,
  readMeters,
  RED_EYES_MAX,
  redEyes,
  soberMeters,
  spent,
  STRAIN_BODY,
  STRAIN_MODS,
  STRAINS,
  strongest,
  SUBSTANCES,
  takeWeedHint,
  type Substance,
  type Taken,
} from "./substances.ts";

test("real minutes squeeze into play seconds on one rising curve", () => {
  assert.equal(gameSeconds(0), 0);
  assert.equal(gameSeconds(-5), 0);
  assert.ok(Math.abs(gameSeconds(60) - 233.8) < 0.5);
  assert.ok(Math.abs(gameSeconds(600) - 928) < 1);
  for (let m = 1; m < 700; m += 7)
    assert.ok(gameSeconds(m + 1) > gameSeconds(m));
});

test("every timeline runs onset < peak < peak end < end, as researched", () => {
  for (const [id, p] of Object.entries(DOSES)) {
    assert.ok(p.onset < p.peak && p.peak < p.peakEnd && p.peakEnd < p.end, id);
    assert.ok(p.strength > 0 && p.strength <= 1, id);
    assert.ok(SUBSTANCES.includes(p.substance), id);
  }
  // a joint lasts 2.5-5 h, an edible 4-10 h, mushroom tea about 3-6 h
  assert.ok(DOSES.joint.end >= 150 && DOSES.joint.end <= 300);
  assert.ok(DOSES.edible.end >= 240 && DOSES.edible.end <= 600);
  assert.ok(DOSES.tea.end >= 180 && DOSES.tea.end <= 360);
  // an edible lands 20 min-2 h in, far later than a joint
  assert.ok(DOSES.edible.onset >= 20 && DOSES.edible.onset > DOSES.joint.onset);
  assert.equal(isDose("joint"), true);
  assert.equal(isDose("toString"), false);
});

test("a dose builds, holds and fades, with its phases", () => {
  const p = DOSES.tea;
  const at = (m: number) => gameSeconds(m);
  assert.equal(doseLevel(p, 0), 0);
  assert.equal(phaseOf(p, 0), null);
  assert.equal(doseLevel(p, at(p.onset) - 1), 0);
  const rising = doseLevel(p, at((p.onset + p.peak) / 2));
  assert.ok(rising > 0 && rising < p.strength);
  assert.equal(phaseOf(p, at((p.onset + p.peak) / 2)), "comeup");
  assert.equal(doseLevel(p, at(p.peak + 1)), p.strength);
  assert.equal(phaseOf(p, at(p.peak + 1)), "peak");
  const falling = doseLevel(p, at((p.peakEnd + p.end) / 2));
  assert.ok(falling > 0 && falling < p.strength);
  assert.equal(phaseOf(p, at((p.peakEnd + p.end) / 2)), "comedown");
  assert.equal(doseLevel(p, at(p.end)), 0);
  assert.equal(phaseOf(p, at(p.end)), null);
  assert.equal(doseLevel(p, NaN), 0);
});

test("the edible trap: at a joint's peak an edible hasn't landed yet", () => {
  const t = gameSeconds(DOSES.joint.peak + 1);
  assert.ok(doseLevel(DOSES.joint, t) > 0);
  assert.equal(doseLevel(DOSES.edible, t), 0);
});

test("doses of one substance add up, capped at 1; spent doses drop", () => {
  const peak = gameSeconds(DOSES.joint.peak + 1);
  const two: Taken[] = [
    { dose: "joint", at: 0 },
    { dose: "joint", at: 0 },
  ];
  const m = readMeters(two, peak, soberMeters());
  assert.ok(Math.abs(m.high.level - 2 * DOSES.joint.strength) < 1e-9);
  assert.equal(m.high.phase, "peak");
  assert.equal(m.trip.level, 0);
  const many = Array.from({ length: 5 }, (): Taken => ({
    dose: "joint",
    at: 0,
  }));
  assert.equal(readMeters(many, peak, soberMeters()).high.level, 1);
  // a fresh joint on top of one at its peak still reads as the peak
  const late = readMeters(
    [
      { dose: "joint", at: 0 },
      { dose: "joint", at: peak - gameSeconds(DOSES.joint.onset) - 1 },
    ],
    peak,
    soberMeters(),
  );
  assert.equal(late.high.phase, "peak");
  // the meters are rewritten, not added to, every read
  const out = readMeters(two, peak, soberMeters());
  readMeters([], peak, out);
  assert.equal(out.high.level, 0);
  assert.equal(out.high.phase, null);
  assert.equal(spent({ dose: "joint", at: 0 }, peak), false);
  assert.equal(
    spent({ dose: "joint", at: 0 }, gameSeconds(DOSES.joint.end)),
    true,
  );
});

test("the body shows the strongest felt substance, in its phase", () => {
  const m = soberMeters();
  assert.equal(strongest(m), null);
  assert.equal(bodyOf(m), null);
  m.high = { level: 0.1, phase: "peak", strain: "hybrid" };
  assert.equal(strongest(m), null);
  m.high = { level: 0.3, phase: "peak", strain: "hybrid" };
  assert.equal(strongest(m), "high");
  assert.equal(bodyOf(m), BODY.high.peak);
  m.trip = { level: 0.5, phase: "comeup", strain: "hybrid" };
  assert.equal(bodyOf(m), BODY.trip.comeup);
  // mushrooms' come-up signature is the yawn
  assert.ok(BODY.trip.comeup.tics.includes("yawn"));
});

test("every body clip is baked; loops are core idles, played calmer than sober", () => {
  for (const s of SUBSTANCES)
    for (const [phase, body] of Object.entries(BODY[s])) {
      assert.ok(body.loops.length > 0 && body.tics.length > 0, `${s} ${phase}`);
      assert.ok(body.rate > 0.5 && body.rate <= 1.3, `${s} ${phase}`);
      for (const id of body.loops) {
        assert.equal(clipOf(id)?.kind, "idle", id);
        assert.equal(clipOf(id)?.pack, "core", id);
      }
      for (const id of body.tics) assert.ok(clipOf(id), id);
    }
  for (const [strain, phases] of Object.entries(STRAIN_BODY))
    for (const [phase, body] of Object.entries(phases)) {
      assert.ok(body.loops.length > 0 && body.tics.length > 0, strain);
      assert.ok(body.rate > 0.5 && body.rate <= 1.3, `${strain} ${phase}`);
      for (const id of body.loops) {
        assert.equal(clipOf(id)?.kind, "idle", id);
        assert.equal(clipOf(id)?.pack, "core", id);
      }
      for (const id of body.tics) assert.ok(clipOf(id), id);
    }
});

test("the trip breathes and cycles color; reduced motion keeps only color", () => {
  const m = soberMeters();
  m.trip = { level: 1, phase: "peak", strain: "hybrid" };
  const full = highParams(m, 1, false);
  assert.equal(full.breathe, BREATHE_AMOUNT);
  assert.equal(full.hue, 1);
  assert.equal(full.geometry, 0);
  const calm = highParams(m, 1, true);
  assert.equal(calm.breathe, 0);
  assert.equal(calm.hue, 1);
  assert.equal(calm.drift, 0);
  m.high = { level: 1, phase: "peak", strain: "hybrid" };
  assert.deepEqual(highParams(m, 0, false), {
    glow: 0,
    hue: 0,
    breathe: 0,
    drift: 1,
    radiance: 0,
    geometry: 0,
    tracer: 0,
    wiggle: 0,
  });
});

test("a tab's timeline sits in the research ranges and outlasts every dose", () => {
  const t = DOSES.tab;
  assert.equal(t.substance, "acid");
  // onset 15-60 min, peak reached within 90 min, 8-12 h in all
  assert.ok(t.onset >= 15 && t.onset <= 60);
  assert.ok(t.peak <= 90);
  assert.ok(t.end >= 480 && t.end <= 720);
  for (const [id, p] of Object.entries(DOSES))
    if (id !== "tab") assert.ok(t.end > p.end, id);
});

test("acid is energetic where mushrooms are heavy", () => {
  assert.ok(BODY.acid.comeup.tics.includes("yawn"));
  assert.ok(BODY.acid.peak.rate > 1);
  for (const s of ["high", "trip"] as const)
    for (const [phase, body] of Object.entries(BODY[s]))
      assert.ok(BODY.acid.peak.rate > body.rate, `${s} ${phase}`);
});

test("a tab raises acid and leaves the trip alone", () => {
  const peak = gameSeconds(DOSES.tab.peak + 1);
  const m = readMeters([{ dose: "tab", at: 0 }], peak, soberMeters());
  assert.equal(m.acid.level, DOSES.tab.strength);
  assert.equal(m.acid.phase, "peak");
  assert.equal(m.trip.level, 0);
  assert.equal(strongest(m), "acid");
});

test("acid is radiant, geometric and leaves tracers; calm keeps only color", () => {
  const m = soberMeters();
  m.acid = { level: 0.65, phase: "peak", strain: "hybrid" };
  const full = highParams(m, 1, false);
  assert.ok(full.radiance > 0 && full.geometry > 0 && full.tracer > 0);
  assert.ok(full.tracer < full.geometry);
  assert.ok(full.hue > 0 && full.breathe > 0 && full.glow > 0);
  const calm = highParams(m, 1, true);
  assert.equal(calm.radiance, full.radiance);
  assert.equal(calm.geometry, 0);
  assert.equal(calm.tracer, 0);
  assert.equal(calm.breathe, 0);
  assert.ok(calm.hue > 0);
  // every field stays in its range even at the cap
  m.acid.level = 1;
  m.trip.level = 1;
  const top = highParams(m, 1, false);
  for (const v of [top.glow, top.hue, top.radiance, top.geometry, top.tracer])
    assert.ok(v >= 0 && v <= 1);
});

test("a pill's timeline sits in the research ranges and the tab outlasts it", () => {
  const p = DOSES.pill;
  assert.equal(p.substance, "molly");
  // felt in 30-45 min, up over 15-30 more, 3-6 h in all
  assert.ok(p.onset >= 20 && p.onset <= 60);
  assert.ok(p.peak - p.onset >= 15 && p.peak - p.onset <= 30);
  assert.ok(p.end >= 180 && p.end <= 360);
  assert.ok(DOSES.tab.end > p.end);
});

test("molly is for dancing, with a tic to start", () => {
  assert.ok(BODY.molly.peak.rate > 1);
  assert.ok(BODY.molly.comeup.tics.length > 0);
});

test("a pill raises molly, leaves acid and the trip alone, and two add up", () => {
  const peak = gameSeconds(DOSES.pill.peak + 1);
  const m = readMeters([{ dose: "pill", at: 0 }], peak, soberMeters());
  assert.equal(m.molly.level, DOSES.pill.strength);
  assert.equal(m.molly.phase, "peak");
  assert.equal(m.acid.level, 0);
  assert.equal(m.trip.level, 0);
  assert.equal(strongest(m), "molly");
  const two = readMeters(
    [
      { dose: "pill", at: 0 },
      { dose: "pill", at: 0 },
    ],
    peak,
    soberMeters(),
  );
  assert.equal(two.molly.level, 1);
});

test("molly glows, leaves faint tracers and wiggles the eyes; no geometry", () => {
  const m = soberMeters();
  m.molly = { level: 0.6, phase: "peak", strain: "hybrid" };
  const full = highParams(m, 1, false);
  assert.ok(full.glow > 0 && full.radiance > 0);
  assert.ok(full.tracer > 0 && full.wiggle > 0);
  assert.equal(full.geometry, 0);
  const acid = soberMeters();
  acid.acid = { level: 0.6, phase: "peak", strain: "hybrid" };
  assert.ok(full.tracer < highParams(acid, 1, false).tracer);
  // reduced motion drops the movement and keeps the color
  const calm = highParams(m, 1, true);
  assert.equal(calm.wiggle, 0);
  assert.equal(calm.tracer, 0);
  assert.equal(calm.radiance, full.radiance);
  assert.ok(calm.glow > 0);
  // intensity off shows nothing
  const off = highParams(m, 0, false);
  assert.equal(off.glow + off.radiance + off.tracer + off.wiggle, 0);
  // everything stays in range at the cap
  m.molly.level = 1;
  m.acid.level = 1;
  const top = highParams(m, 1, false);
  for (const v of [top.glow, top.radiance, top.tracer, top.wiggle])
    assert.ok(v >= 0 && v <= 1);
});

test("a line's timeline sits in the research ranges and is the shortest dose", () => {
  const p = DOSES.line;
  assert.equal(p.substance, "cocaine");
  // felt in 3-10 min, rush peaks within 16 min of that, 10-90 min in all
  assert.ok(p.onset >= 3 && p.onset <= 10);
  assert.ok(p.peak - p.onset <= 16);
  assert.ok(p.end >= 10 && p.end <= 90);
  assert.ok(DOSES.tab.end > p.end && DOSES.pill.end > p.end);
});

test("cocaine is upright and quick, then crashes slow", () => {
  assert.ok(BODY.cocaine.peak.rate > 1);
  assert.ok(BODY.cocaine.comedown.rate < 1);
});

test("a line raises cocaine, leaves the rest alone, and two add up", () => {
  const peak = gameSeconds(DOSES.line.peak + 1);
  const m = readMeters([{ dose: "line", at: 0 }], peak, soberMeters());
  assert.equal(m.cocaine.level, DOSES.line.strength);
  assert.equal(m.cocaine.phase, "peak");
  assert.equal(m.molly.level + m.acid.level + m.trip.level, 0);
  assert.equal(strongest(m), "cocaine");
  const two = readMeters(
    [
      { dose: "line", at: 0 },
      { dose: "line", at: 0 },
    ],
    peak,
    soberMeters(),
  );
  assert.equal(two.cocaine.level, 1);
});

test("cocaine quickens her walk with the meter, nothing else does", () => {
  assert.equal(paceBoost(soberMeters()), 1);
  const peak = readMeters(
    [{ dose: "line", at: 0 }],
    gameSeconds(DOSES.line.peak + 1),
    soberMeters(),
  );
  const boost = paceBoost(peak);
  assert.ok(boost > 1 && boost <= 1.25, `${boost}`);
  // the crash and the end bring her back to her own pace
  const over = readMeters(
    [{ dose: "line", at: 0 }],
    gameSeconds(DOSES.line.end),
    soberMeters(),
  );
  assert.equal(paceBoost(over), 1);
  const molly = soberMeters();
  molly.molly = { level: 1, phase: "peak", strain: "hybrid" };
  assert.equal(paceBoost(molly), 1);
});

test("cocaine does not bend the screen", () => {
  const m = soberMeters();
  m.cocaine = { level: 1, phase: "peak", strain: "hybrid" };
  assert.deepEqual(
    highParams(m, 1, false),
    highParams(soberMeters(), 1, false),
  );
});

test("a vape is felt fast, peaks early and is gone sooner than a joint", () => {
  const v = DOSES.vape;
  assert.equal(v.substance, "high");
  assert.ok(v.onset < v.peak && v.peak < v.peakEnd && v.peakEnd < v.end);
  // blood THC peaks at 10 min and the effect within the hour [SPINDLE-2018]
  assert.ok(v.onset <= 2 && v.peak <= 15 && v.peakEnd <= 60);
  assert.ok(v.end >= 90 && v.end <= DOSES.joint.end);
  assert.ok(v.strength > 0 && v.strength <= DOSES.joint.strength);
});

test("strain modifiers stay small and keep every timeline in order", () => {
  for (const strain of STRAINS) {
    const m = STRAIN_MODS[strain];
    assert.ok(m.strength > 0 && m.strength <= 1.1, strain);
    assert.ok(m.onset >= 0.8 && m.onset <= 1.2, strain);
    for (const dose of Object.keys(DOSES).filter(isDose)) {
      const p = profileOf(dose, strain);
      assert.ok(p.onset < p.peak && p.strength <= 1, `${dose} ${strain}`);
    }
  }
  // only weed doses are scaled
  assert.equal(profileOf("tab", "hemp"), DOSES.tab);
  assert.equal(profileOf("joint"), profileOf("joint", "hybrid"));
});

test("hemp is weaker than hybrid; sativa stands livelier than indica", () => {
  assert.ok(profileOf("joint", "hemp").strength < 0.6 * DOSES.joint.strength);
  assert.equal(profileOf("joint", "hybrid").strength, DOSES.joint.strength);
  const sativa = STRAIN_BODY.sativa;
  const indica = STRAIN_BODY.indica;
  assert.ok(sativa && indica);
  for (const phase of ["comeup", "peak", "comedown"] as const)
    assert.ok(sativa[phase].rate > indica[phase].rate, phase);
  assert.ok(indica.comedown.rate <= 0.7);
  assert.ok(indica.peak.tics.includes("consume"));
});

test("a strain flows from the dose to the meter and the body", () => {
  const at = gameSeconds(DOSES.joint.peak) + 1;
  const hybrid = readMeters([{ dose: "joint", at: 0 }], at, soberMeters());
  const sativa = readMeters(
    [{ dose: "joint", at: 0, strain: "sativa" }],
    at,
    soberMeters(),
  );
  assert.equal(hybrid.high.strain, "hybrid");
  assert.equal(sativa.high.strain, "sativa");
  // a Taken without a strain behaves exactly as it always did
  assert.equal(hybrid.high.level, DOSES.joint.strength);
  assert.equal(bodyOf(hybrid), BODY.high.peak);
  assert.equal(bodyOf(sativa), STRAIN_BODY.sativa?.peak);
  assert.equal(spent({ dose: "joint", at: 0 }, at), false);
  // hemp stands like hybrid, only fainter
  const hemp = readMeters(
    [{ dose: "joint", at: 0, strain: "hemp" }],
    at,
    soberMeters(),
  );
  assert.ok(hemp.high.level < hybrid.high.level);
  assert.equal(bodyOf(hemp), BODY.high.peak);
});

test("indica glows heavier and sativa's color pops; hybrid is unchanged", () => {
  const look = (strain: "hybrid" | "sativa" | "indica") => {
    const m = soberMeters();
    m.high = { level: 0.5, phase: "peak", strain };
    return highParams(m, 1, false);
  };
  const [hybrid, sativa, indica] = [
    look("hybrid"),
    look("sativa"),
    look("indica"),
  ];
  assert.ok(indica.glow > hybrid.glow);
  assert.equal(indica.radiance, hybrid.radiance);
  assert.ok(sativa.radiance > hybrid.radiance);
  assert.equal(sativa.glow, hybrid.glow);
  assert.equal(hybrid.radiance, 0);
});

test("the meter's strain follows the dose felt most, and resets when sober", () => {
  const stack: Taken[] = [
    { dose: "edible", at: 0, strain: "hemp" },
    { dose: "joint", at: 0 },
  ];
  const at = gameSeconds(DOSES.joint.peak) + 1;
  const m = readMeters(stack, at, soberMeters());
  assert.equal(m.high.strain, "hybrid");
  const hempFirst = readMeters(
    [
      { dose: "joint", at: 0, strain: "hemp" },
      { dose: "vape", at: 0 },
    ],
    at,
    soberMeters(),
  );
  assert.equal(hempFirst.high.strain, "hybrid");
  readMeters([], at, m);
  assert.equal(m.high.strain, "hybrid");
  const indica = readMeters(
    [{ dose: "joint", at: 0, strain: "indica" }],
    at,
    soberMeters(),
  );
  readMeters([], at, indica);
  assert.equal(indica.high.strain, "hybrid");
  assert.equal(isStrain("sativa"), true);
  assert.equal(isStrain("toString"), false);
});

test("weed lowers the lids: heavier with more, heavier for indica, sleepiest on the way down", () => {
  const lid = (
    level: number,
    phase: "comeup" | "peak" | "comedown",
    strain: "hybrid" | "sativa" | "indica" | "hemp" = "hybrid",
  ) => {
    const m = soberMeters();
    m.high = { level, phase, strain };
    return heavyLid(m);
  };
  assert.equal(heavyLid(soberMeters()), 0);
  assert.ok(lid(0.2, "peak") > 0 && lid(0.4, "peak") > lid(0.2, "peak"));
  assert.ok(lid(0.4, "peak") > lid(0.4, "comeup"));
  assert.ok(lid(0.4, "comedown") > lid(0.4, "peak"));
  assert.ok(lid(0.4, "peak", "indica") > lid(0.4, "peak"));
  assert.ok(lid(0.4, "peak") > lid(0.4, "peak", "sativa"));
  // heavy, never shut: a blink (1) still reads, and out-of-range input is safe
  for (const level of [0.5, 1, 5, NaN]) {
    const v = lid(level, "comedown", "indica");
    assert.ok(v >= 0 && v <= HEAVY_LID_MAX, String(level));
  }
  assert.equal(lid(0.4, "peak"), lid(0.4, "peak"));
  // other substances don't weigh the lids down
  const m = soberMeters();
  m.molly = { level: 1, phase: "peak", strain: "hybrid" };
  assert.equal(heavyLid(m), 0);
});

test("red eyes: the whites redden with the weed level, never for other substances", () => {
  const red = (
    level: number,
    phase: "comeup" | "peak" | "comedown" | null = "peak",
  ) => {
    const m = soberMeters();
    m.high = { level, phase, strain: "hybrid" };
    return redEyes(m);
  };
  assert.equal(redEyes(soberMeters()), 0);
  assert.equal(red(0.5, null), 0);
  assert.ok(red(0.2) > 0 && red(0.6) > red(0.2));
  for (const level of [0.5, 1, 5, -1, NaN]) {
    const v = red(level);
    assert.ok(v >= 0 && v <= RED_EYES_MAX, String(level));
  }
  const m = soberMeters();
  m.molly = { level: 1, phase: "peak", strain: "hybrid" };
  assert.equal(redEyes(m), 0);
});

test("dry mouth and the munchies: every weed style has a consume tic after the come-up", () => {
  for (const body of [BODY.high, ...Object.values(STRAIN_BODY)])
    assert.ok(
      body.peak.tics.includes("consume") ||
        body.comedown.tics.includes("consume"),
    );
  assert.ok(BODY.high.comedown.tics.includes("consume"));
});

test("weed stretches time: faint tracers, fainter than molly's, none under reduced motion", () => {
  const weed = soberMeters();
  weed.high = { level: 1, phase: "peak", strain: "hybrid" };
  const full = highParams(weed, 1, false);
  assert.ok(full.tracer > 0);
  const molly = soberMeters();
  molly.molly = { level: 1, phase: "peak", strain: "hybrid" };
  assert.ok(full.tracer < highParams(molly, 1, false).tracer);
  assert.equal(highParams(weed, 1, true).tracer, 0);
  assert.equal(highParams(weed, 0, false).tracer, 0);
  assert.equal(highParams(soberMeters(), 1, false).tracer, 0);
});

test("the dry-mouth hint shows once, as the weed peaks", () => {
  const m = soberMeters();
  m.high = { level: 0.5, phase: "peak", strain: "hybrid" };
  assert.match(dryMouthHint("comeup", m) ?? "", /water/i);
  assert.equal(dryMouthHint("peak", m), null);
  m.high = { level: 0.5, phase: "comedown", strain: "hybrid" };
  assert.equal(dryMouthHint("peak", m), null);
  assert.equal(dryMouthHint(null, soberMeters()), null);
});

test("an edible gives a tip to start low, and warns if redosing before the first lands", () => {
  const t = 1000;
  // first edible: tip to wait / start low, go slow
  assert.equal(
    takeWeedHint("edible", [], t),
    "Edibles take up to 2 hours. Start low, go slow.",
  );

  // second edible taken before first lands (onset is ~198 play seconds)
  const pending: Taken[] = [{ dose: "edible", at: t - 50 }];
  assert.equal(
    takeWeedHint("edible", pending, t),
    "Edibles take up to 2 hours. Don't take another one yet.",
  );

  // after first edible lands (e.g. 300 play seconds in), no redose warning
  const landed: Taken[] = [{ dose: "edible", at: t - 300 }];
  assert.equal(
    takeWeedHint("edible", landed, t),
    "Edibles take up to 2 hours. Start low, go slow.",
  );

  // strain-adjusted onset: indica takes longer to land (49.5 min vs 45 min)
  const indicaOnset = gameSeconds(profileOf("edible", "indica").onset);
  const hybridOnset = gameSeconds(profileOf("edible", "hybrid").onset);
  const sativaOnset = gameSeconds(profileOf("edible", "sativa").onset);
  assert.ok(sativaOnset < hybridOnset && hybridOnset < indicaOnset);

  // between hybrid and indica onset: hybrid has landed, but indica has not
  const midIndica: Taken[] = [
    { dose: "edible", at: t - (hybridOnset + 5), strain: "indica" },
  ];
  assert.equal(
    takeWeedHint("edible", midIndica, t),
    "Edibles take up to 2 hours. Don't take another one yet.",
  );

  // between sativa and hybrid onset: sativa has already landed
  const midSativa: Taken[] = [
    { dose: "edible", at: t - (sativaOnset + 5), strain: "sativa" },
  ];
  assert.equal(
    takeWeedHint("edible", midSativa, t),
    "Edibles take up to 2 hours. Start low, go slow.",
  );

  // a smoked joint does not give an edible warning
  assert.equal(takeWeedHint("joint", pending, t), null);
  // non-weed doses return null
  assert.equal(takeWeedHint("pill", pending, t), null);
});

test("taking weed while buzzed warns that weed then drink is gentler", () => {
  const t = 1000;
  assert.equal(
    takeWeedHint("joint", [], t, 0.2),
    "Weed then drink is gentler than drink then weed.",
  );
  assert.equal(
    takeWeedHint("vape", [], t, 0.1),
    "Weed then drink is gentler than drink then weed.",
  );
  // unlanded edible redose warning takes priority over buzz warning
  const pending: Taken[] = [{ dose: "edible", at: t - 50 }];
  assert.equal(
    takeWeedHint("edible", pending, t, 0.2),
    "Edibles take up to 2 hours. Don't take another one yet.",
  );
  // but first edible while buzzed gives the combo warning
  assert.equal(
    takeWeedHint("edible", [], t, 0.2),
    "Weed then drink is gentler than drink then weed.",
  );
});

test("panic hint triggers when weed level crosses into heavy high", () => {
  const m = soberMeters();
  m.high = { level: 0.85, phase: "peak", strain: "hybrid" };
  assert.equal(
    panicHint(0.7, m),
    "Panicking? Sit, breathe, have a snack and some water; it passes.",
  );
  // does not re-trigger while level stays high
  assert.equal(panicHint(0.85, m), null);
  // does not trigger when sober or low
  assert.equal(panicHint(0, soberMeters()), null);
  const low = soberMeters();
  low.high = { level: 0.5, phase: "peak", strain: "hybrid" };
  assert.equal(panicHint(0.4, low), null);
});

test("pupils open and the jaw sets by the research's table: molly most, weed not at all", () => {
  const on = (s: Substance, level: number) => {
    const m = soberMeters();
    m[s] = { level, phase: "peak", strain: "hybrid" };
    return m;
  };
  assert.equal(pupilDilation(soberMeters()), 0);
  assert.equal(jawClench(soberMeters()), 0);
  // dilated: MDMA (marked), cocaine, LSD, psilocybin; weed leaves them be
  assert.equal(pupilDilation(on("molly", 1)), 1);
  for (const s of ["cocaine", "acid", "trip"] as const) {
    assert.ok(pupilDilation(on(s, 1)) > 0, s);
    assert.ok(pupilDilation(on(s, 1)) < 1, s);
  }
  assert.equal(pupilDilation(on("high", 1)), 0);
  // jaw clench: MDMA (strong), cocaine, LSD (mild); not psilocybin or weed
  assert.equal(jawClench(on("molly", 1)), 1);
  assert.ok(jawClench(on("cocaine", 1)) > jawClench(on("acid", 1)));
  assert.ok(jawClench(on("acid", 1)) > 0);
  assert.equal(jawClench(on("trip", 1)), 0);
  assert.equal(jawClench(on("high", 1)), 0);
  // follows the meter, the strongest substance wins, and bad input is safe
  assert.ok(pupilDilation(on("molly", 0.5)) < pupilDilation(on("molly", 1)));
  const both = on("molly", 0.3);
  both.cocaine = { level: 1, phase: "peak", strain: "hybrid" };
  assert.equal(pupilDilation(both), pupilDilation(on("cocaine", 1)));
  for (const level of [5, -1, NaN]) {
    const v = pupilDilation(on("molly", level));
    assert.ok(v >= 0 && v <= 1, String(level));
    const j = jawClench(on("molly", level));
    assert.ok(j >= 0 && j <= 1, String(level));
  }
});
