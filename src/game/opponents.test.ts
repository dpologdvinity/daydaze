import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLIPS,
  HIT_SECONDS,
  RELOAD_AFTER,
  SHOT_SECONDS,
  getUpSeconds,
  opponentClip,
  type OpponentSense,
} from "./opponents.ts";

/** A rival standing up in the open, nothing happening. */
const base: OpponentSense = {
  playing: true,
  down: false,
  sinceTag: Infinity,
  untilUp: 0,
  moving: false,
  open: true,
  sinceShot: Infinity,
};
const sense = (over: Partial<OpponentSense>): OpponentSense => ({
  ...base,
  ...over,
});

test("every clip the map can pick is one the clip file carries", () => {
  const picks = [
    sense({}),
    sense({ open: false }),
    sense({ moving: true }),
    sense({ moving: true, open: false }),
    sense({ sinceShot: 0.1 }),
    sense({ open: false, sinceShot: RELOAD_AFTER + 0.1 }),
    sense({ down: true, sinceTag: 0.1, untilUp: 2 }),
    sense({ down: true, sinceTag: 1, untilUp: 2 }),
    sense({ down: true, sinceTag: 2.8, untilUp: getUpSeconds / 2 }),
    sense({ playing: false }),
  ].map((s) => opponentClip(s).clip);
  for (const clip of picks) assert.ok(CLIPS.includes(clip), clip);
});

test("in the open she aims, and fires for a moment after each shot", () => {
  assert.equal(opponentClip(sense({})).clip, "Pistol_Aim_Neutral");
  const shot = opponentClip(sense({ sinceShot: 0.05 }));
  assert.equal(shot.clip, "Pistol_Shoot");
  assert.equal(shot.loop, false);
  assert.equal(
    opponentClip(sense({ sinceShot: SHOT_SECONDS + 0.01 })).clip,
    "Pistol_Aim_Neutral",
  );
});

test("behind cover she crouches, reloading a little after she fired", () => {
  assert.equal(opponentClip(sense({ open: false })).clip, "Crouch_Idle_Loop");
  assert.equal(
    opponentClip(sense({ open: false, sinceShot: RELOAD_AFTER + 0.2 })).clip,
    "Pistol_Reload",
  );
  // long after, she is back to crouching
  assert.equal(
    opponentClip(sense({ open: false, sinceShot: 30 })).clip,
    "Crouch_Idle_Loop",
  );
});

test("moving: she jogs out to her peek spot and creeps back to cover", () => {
  assert.equal(opponentClip(sense({ moving: true })).clip, "Jog_Fwd_Loop");
  assert.equal(
    opponentClip(sense({ moving: true, open: false })).clip,
    "Crouch_Fwd_Loop",
  );
});

test("a tag flinches, then she goes down and stays down", () => {
  const hit = opponentClip(sense({ down: true, sinceTag: 0.05, untilUp: 3 }));
  assert.equal(hit.clip, "Hit_Chest");
  assert.equal(hit.loop, false);
  const down = opponentClip(
    sense({ down: true, sinceTag: HIT_SECONDS + 0.1, untilUp: 2 }),
  );
  assert.equal(down.clip, "Death01");
  assert.equal(down.loop, false);
  assert.equal(down.reverse, false);
});

test("down trumps moving, aiming and firing", () => {
  const s = sense({
    down: true,
    sinceTag: 1,
    untilUp: 2,
    moving: true,
    sinceShot: 0.1,
  });
  assert.equal(opponentClip(s).clip, "Death01");
});

test("getting back up plays the fall backward, ending on her feet", () => {
  const up = opponentClip(
    sense({ down: true, sinceTag: 2.5, untilUp: getUpSeconds * 0.5 }),
  );
  assert.equal(up.clip, "Death01");
  assert.equal(up.reverse, true);
  // and once up she is back to her usual clips
  assert.equal(opponentClip(sense({})).clip, "Pistol_Aim_Neutral");
});

test("outside a round she idles", () => {
  assert.equal(opponentClip(sense({ playing: false })).clip, "Idle_Loop");
  assert.equal(
    opponentClip(sense({ playing: false, open: false })).clip,
    "Idle_Loop",
  );
});

test("each plan has its own key, and the same state gives the same plan object", () => {
  const plans = [
    sense({}),
    sense({ open: false }),
    sense({ moving: true }),
    sense({ moving: true, open: false }),
    sense({ sinceShot: 0.1 }),
    sense({ open: false, sinceShot: RELOAD_AFTER + 0.2 }),
    sense({ down: true, sinceTag: 0.1, untilUp: 2 }),
    sense({ down: true, sinceTag: 1, untilUp: 2 }),
    sense({ down: true, sinceTag: 2.5, untilUp: getUpSeconds / 2 }),
    sense({ playing: false }),
  ].map(opponentClip);
  assert.equal(new Set(plans.map((p) => p.key)).size, plans.length);
  // nothing is allocated per call: the frame loop runs this for every rival
  assert.equal(opponentClip(sense({})), opponentClip(sense({})));
});
