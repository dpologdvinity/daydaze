import assert from "node:assert/strict";
import { test } from "node:test";
import { GAIT_LIST } from "../gaits.ts";
import {
  IDLE_CLIPS,
  LEAN_CLIP,
  MAN_STRIDE,
  naturalPace,
  SEAT_CLIP,
  SWIM_CLIP,
  TREAD_CLIP,
  clipOf,
  idleFor,
  pickClip,
  type DollState,
} from "./clips.ts";
import { temperamentOf } from "./idlePlan.ts";
import type { MocapPack } from "./mocapTypes.ts";
import { MOCAP_CLIPS } from "./mocap.ts";
import { MOCAP_PACKS } from "./mocapTypes.ts";
import { DANCE_MOVE_IDS, GAME_CLIP_IDS, stillClipsOf } from "./moves.ts";
import { MAX_RUN_TEMPO, MAX_TEMPO, MIN_TEMPO, RUN_CLIP } from "./stride.ts";
import { WALK_SPEED } from "../walk.ts";

const base: DollState = {
  loaded: true,
  speed: 0,
  walk: "walk-easy",
  mood: "idle",
  hold: undefined,
  dance: "groove",
  couple: undefined,
  seed: 0,
};

test("the clip catalog is sound: unique ids, real loops, walk speeds", () => {
  const ids = MOCAP_CLIPS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "unique ids");
  for (const c of MOCAP_CLIPS) {
    const held = c.kind === "pose" || c.kind === "sit" || c.kind === "lay";
    if (held) assert.equal(c.period, 0, c.id);
    // a one-shot may run longer than a loop (a whole sit-down, a long turn)
    else if (c.kind === "trans")
      assert.ok(c.period > 0.3 && c.period <= 12, `${c.id} length`);
    else assert.ok(c.period > 0.5 && c.period <= 8.1, `${c.id} loop`);
    if (c.kind === "walk" || c.kind === "back")
      assert.ok(c.speed && c.speed > 0.2 && c.speed < 10, `${c.id} speed`);
    else assert.equal(c.speed, undefined, c.id);
    assert.ok(MOCAP_PACKS.includes(c.pack), `${c.id} pack`);
  }
});

test("every clip the game names is baked", () => {
  // a wheelchair gait has no stride: it plays the seat clip
  for (const g of GAIT_LIST.filter((g) => !g.seated))
    assert.equal(clipOf(g.clip)?.kind, "walk", g.id);
  assert.ok(clipOf("walk-masc"));
  assert.ok(IDLE_CLIPS.length >= 4);
  assert.equal(clipOf(SEAT_CLIP)?.kind, "seat");
  assert.equal(clipOf(LEAN_CLIP)?.kind, "pose");
  for (const id of ["chatting", "laugh", "wave", "talk-question"])
    assert.equal(clipOf(id)?.kind, "emote", id);
  // captured moves and game clips: every one has its keyframes in the file
  for (const id of DANCE_MOVE_IDS) {
    const c = clipOf(id);
    if (c) assert.ok(c.kind === "dance" || c.kind === "emote", id);
  }
  for (const id of ["dig", "spike", "sing"] as const)
    assert.ok(GAME_CLIP_IDS.includes(id) && clipOf(id), id);
  for (const kind of ["pose", "sit", "lay"] as const)
    assert.ok(stillClipsOf(kind).length >= 3, kind);
});

test("nothing plays a clip before the file loads", () => {
  assert.equal(pickClip({ ...base, loaded: false }), null);
  assert.equal(pickClip({ ...base, loaded: false, speed: 1.2 }), null);
});

test("a walker plays her gait's clip at a rate matched to the ground", () => {
  const easy = clipOf("walk-easy");
  assert.ok(easy?.speed);
  const at = (speed: number) => pickClip({ ...base, speed })?.rate ?? NaN;
  assert.ok(Math.abs(at(easy.speed) - 1) < 1e-9);
  assert.equal(at(easy.speed * MAX_TEMPO * 5), MAX_RUN_TEMPO);
  assert.equal(at(0.1), MIN_TEMPO);
  assert.equal(pickClip({ ...base, speed: 1 })?.id, "walk-easy");
  // walking wins over any mood
  assert.equal(pickClip({ ...base, speed: 1, mood: "sit" })?.id, "walk-easy");
  // a gait with no baked clip walks the built stride
  assert.equal(pickClip({ ...base, speed: 1, walk: undefined }), null);
});

test("brisk ground speed switches a walk to the jog clip, never an absurdly fast walk", () => {
  const run = clipOf(RUN_CLIP);
  assert.ok(run?.speed);
  const brisk = pickClip({ ...base, speed: WALK_SPEED });
  assert.ok(brisk);
  assert.equal(brisk.id, RUN_CLIP);
  assert.ok(brisk.rate >= MIN_TEMPO && brisk.rate <= MAX_RUN_TEMPO);
  assert.ok(Math.abs(brisk.rate - WALK_SPEED / run.speed) < 1e-9);
  // the run's pace matches the brisk walk speed to within a fifth, so it
  // plays close to its own tempo: no frantic sped-up jog
  assert.ok(brisk.rate > 0.85 && brisk.rate < 1.2, `rate ${brisk.rate}`);
  // a slow walk (e.g. wading) keeps its own walk clip
  assert.equal(pickClip({ ...base, speed: 1 })?.id, "walk-easy");
  // the jog gait itself stays on the jog
  assert.equal(pickClip({ ...base, walk: "jog", speed: 1.7 })?.id, "jog");
});

test("idles: the player breathes first, a crowd stands differently", () => {
  assert.equal(pickClip({ ...base, own: true })?.id, "idle-breathing");
  assert.equal(idleFor(0), "idle-breathing");
  assert.equal(idleFor(-1), IDLE_CLIPS[IDLE_CLIPS.length - 1]);
  assert.equal(idleFor(2.7), IDLE_CLIPS[2]);
  // across seeds and slots a crowd uses many idles, all of them baked
  const seen = new Set<string>();
  for (let seed = 0; seed < 40; seed++)
    for (let slot = 0; slot < 8; slot++) {
      const id = pickClip({ ...base, seed, slot })?.id ?? "";
      assert.equal(clipOf(id)?.kind, "idle", id);
      seen.add(id);
    }
  assert.ok(seen.size >= 15, `${seen.size} idles in use`);
  // the same doll in the same slot always stands the same way
  assert.deepEqual(
    pickClip({ ...base, seed: 9, slot: 3 }),
    pickClip({ ...base, seed: 9, slot: 3 }),
  );
});

test("a clip in a pack that has not loaded names the pack and falls back", () => {
  const social = new Set<MocapPack>(["social"]);
  const wave = (packs?: ReadonlySet<MocapPack>) =>
    pickClip({ ...base, mood: "dance", dance: "greet", packs });
  // until the social pack loads: the built pose, and a request for the pack
  assert.deepEqual(wave(), { id: "", rate: 1, offset: 0, need: "social" });
  assert.deepEqual(wave(social), { id: "greet", rate: 1, offset: 0 });
  // dances of the second set are the same story
  const move = pickClip({ ...base, mood: "dance", dance: "ymca" });
  assert.equal(move?.need, "dance2");
  // a chatty stranger gestures only once the social pack is in
  const chatty = Array.from({ length: 200 }, (_, seed) => seed).find(
    (seed) => temperamentOf(seed) === "chatty",
  );
  assert.ok(chatty !== undefined);
  const ids = (packs?: ReadonlySet<MocapPack>) =>
    new Set(
      Array.from(
        { length: 30 },
        (_, slot) => pickClip({ ...base, seed: chatty, slot, packs })?.id,
      ),
    );
  assert.ok([...ids()].every((id) => clipOf(id)?.pack === "core"));
  assert.ok([...ids(social)].some((id) => clipOf(id)?.pack === "social"));
});

test("a seated doll with no held pose settles, then shifts, and falls back to the core sit", () => {
  const sit = (slot: number, packs?: ReadonlySet<MocapPack>) =>
    pickClip({ ...base, mood: "sit", own: true, slot, packs });
  assert.equal(sit(0)?.id, SEAT_CLIP);
  const seated = new Set<MocapPack>(["seated"]);
  const used = new Set(
    Array.from({ length: 40 }, (_, slot) => sit(slot, seated)?.id),
  );
  assert.ok(used.size >= 3, "variety");
  for (const id of used) assert.equal(clipOf(id)?.kind, "seat", id);
  // before the seated pack loads she sits in the core loop and asks for it
  const early = Array.from({ length: 40 }, (_, slot) => sit(slot));
  assert.ok(early.every((p) => p?.id === SEAT_CLIP || p?.id === ""));
  assert.ok(early.some((p) => p?.need === "seated"));
});

test("held poses and seats", () => {
  const sit = (hold?: string) => pickClip({ ...base, mood: "sit", hold })?.id;
  assert.equal(sit(), SEAT_CLIP);
  assert.equal(sit("built"), SEAT_CLIP);
  assert.equal(sit("sit-crossed"), "sit-crossed");
  assert.equal(sit("lay-side"), "lay-side");
  // a standing pose is no seat
  assert.equal(sit("pose-cocky"), SEAT_CLIP);
  const pose = (hold?: string) => pickClip({ ...base, mood: "pose", hold });
  assert.equal(pose("pose-cocky")?.id, "pose-cocky");
  // the hand-made hip-pop stays built
  assert.equal(pose("built"), null);
  assert.equal(pose(undefined), null);
  assert.equal(pickClip({ ...base, mood: "lean" })?.id, LEAN_CLIP);
});

test("dances: captured moves play, built ones stay built, a follow trails half a loop", () => {
  const dance = (dance: string, couple?: "lead" | "follow") =>
    pickClip({ ...base, mood: "dance", dance, couple });
  assert.deepEqual(dance("salsa"), { id: "salsa", rate: 1, offset: 0 });
  const period = clipOf("salsa")?.period ?? 0;
  assert.equal(dance("salsa", "follow")?.offset, period / 2);
  assert.equal(dance("salsa", "lead")?.offset, 0);
  assert.equal(dance("groove"), null);
  assert.equal(dance("hug"), null);
  assert.equal(dance("clap")?.id, "clap");
});

test("a gait's natural pace: the woman's measured speed, the man's longer stride", () => {
  const easy = clipOf("walk-easy")?.speed ?? 0;
  assert.equal(naturalPace("walk-easy", false), easy);
  assert.ok(
    Math.abs((naturalPace("walk-easy", true) ?? 0) - easy * MAN_STRIDE) < 1e-9,
  );
  assert.equal(naturalPace("salsa", false), undefined);
  assert.equal(naturalPace(undefined, true), undefined);
});

test("an afloat doll strokes while she moves and treads when she stops, whatever her mood", () => {
  assert.equal(clipOf(SWIM_CLIP)?.kind, "swim");
  assert.equal(clipOf(TREAD_CLIP)?.kind, "swim");
  const swim = { ...base, afloat: true, mood: "dance" } as const;
  assert.equal(pickClip({ ...swim, speed: 1 })?.id, SWIM_CLIP);
  assert.equal(pickClip(swim)?.id, TREAD_CLIP);
  assert.equal(pickClip({ ...base, afloat: false })?.id, idleFor(0));
  // until the clips load she wears her built pose
  assert.equal(pickClip({ ...swim, loaded: false }), null);
});

test("a wheelchair user sits whether she rolls or waits, and swims when afloat", () => {
  const seated = { ...base, seated: true };
  assert.equal(pickClip({ ...seated, speed: 1.4 })?.id, SEAT_CLIP);
  assert.equal(pickClip(seated)?.id, SEAT_CLIP);
  assert.equal(pickClip({ ...seated, mood: "dance" })?.id, SEAT_CLIP);
  assert.equal(pickClip({ ...seated, afloat: true })?.id, TREAD_CLIP);
  assert.equal(pickClip({ ...seated, loaded: false }), null);
});
