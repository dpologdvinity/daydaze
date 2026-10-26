import assert from "node:assert/strict";
import { test } from "node:test";
import { GAITS } from "../gaits.ts";
import {
  IDLE_CLIPS,
  LEAN_CLIP,
  SEAT_CLIP,
  clipOf,
  idleFor,
  pickClip,
  type DollState,
} from "./clips.ts";
import { MOCAP_CLIPS } from "./mocap.ts";
import { DANCE_MOVE_IDS, GAME_CLIP_IDS, stillClipsOf } from "./moves.ts";
import { MAX_TEMPO, MIN_TEMPO } from "./stride.ts";

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
    else assert.ok(c.period > 0.5 && c.period <= 8.1, `${c.id} loop`);
    if (c.kind === "walk")
      assert.ok(c.speed && c.speed > 0.5 && c.speed < 2.5, `${c.id} speed`);
    else assert.equal(c.speed, undefined, c.id);
  }
});

test("every clip the game names is baked", () => {
  for (const g of GAITS) assert.equal(clipOf(g.clip)?.kind, "walk", g.id);
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
  assert.equal(at(9), MAX_TEMPO);
  assert.equal(at(0.1), MIN_TEMPO);
  assert.equal(pickClip({ ...base, speed: 1 })?.id, "walk-easy");
  // walking wins over any mood
  assert.equal(pickClip({ ...base, speed: 1, mood: "sit" })?.id, "walk-easy");
  // a gait with no baked clip walks the built stride
  assert.equal(pickClip({ ...base, speed: 1, walk: undefined }), null);
});

test("idles: the player breathes, NPCs pick one by seed", () => {
  assert.equal(pickClip(base)?.id, IDLE_CLIPS[0]);
  assert.equal(idleFor(0), "idle-breathing");
  const seen = new Set(
    Array.from({ length: 12 }, (_, s) => pickClip({ ...base, seed: s })?.id),
  );
  assert.equal(seen.size, IDLE_CLIPS.length);
  assert.equal(idleFor(-1), IDLE_CLIPS[IDLE_CLIPS.length - 1]);
  assert.equal(idleFor(2.7), IDLE_CLIPS[2]);
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
