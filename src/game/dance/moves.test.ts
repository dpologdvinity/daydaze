import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_DANCE_MOVES,
  DANCE_MOVE_IDS,
  JOINTS,
  createPose,
  danceMove,
  isDanceMoveId,
  poseAt,
  type DanceMove,
  type Pose,
} from "./moves.ts";

const FRAME = 1 / 60;
const EPS = 1e-9;

function flatten(p: Pose): number[] {
  return [...p.root, ...JOINTS.flatMap((j) => p.joints[j])];
}

function maxDelta(a: Pose, b: Pose): number {
  const x = flatten(a);
  const y = flatten(b);
  return Math.max(...x.map((v, i) => Math.abs(v - (y[i] ?? 0))));
}

test("every move in the picker has a matching id, label and clip", () => {
  assert.deepEqual(
    ALL_DANCE_MOVES.map((m) => m.id),
    [...DANCE_MOVE_IDS],
  );
  assert.equal(new Set(DANCE_MOVE_IDS).size, DANCE_MOVE_IDS.length);
  for (const m of ALL_DANCE_MOVES) assert.notEqual(m.label.trim(), "");
});

test("every clip loops: positive period, keys start at 0 and stay inside it", () => {
  for (const m of ALL_DANCE_MOVES) {
    assert.ok(m.period > 0, `${m.id} period`);
    assert.equal(m.keys[0]?.at, 0, `${m.id} first key`);
    for (let i = 1; i < m.keys.length; i++) {
      const prev = m.keys[i - 1];
      const key = m.keys[i];
      assert.ok(key && prev && key.at > prev.at, `${m.id} keys ascend`);
      assert.ok(key.at < m.period, `${m.id} key inside the loop`);
    }
  }
});

test("every joint named in a clip is a rig joint", () => {
  for (const m of ALL_DANCE_MOVES) {
    for (const key of m.keys) {
      for (const name of Object.keys(key.joints ?? {})) {
        assert.ok(
          (JOINTS as readonly string[]).includes(name),
          `${m.id} joint ${name}`,
        );
      }
    }
  }
});

test("a sampled pose is finite and has every joint", () => {
  for (const m of ALL_DANCE_MOVES) {
    const p = poseAt(m, 0.37);
    for (const v of flatten(p)) assert.ok(Number.isFinite(v), m.id);
    assert.equal(Object.keys(p.joints).length, JOINTS.length);
  }
});

test("sampling one period later or earlier gives the same pose", () => {
  for (const m of ALL_DANCE_MOVES) {
    const t = m.period * 0.31;
    assert.ok(maxDelta(poseAt(m, t), poseAt(m, t + m.period)) < 1e-6, m.id);
    assert.ok(maxDelta(poseAt(m, t), poseAt(m, t - m.period)) < 1e-6, m.id);
  }
});

test("the wrap from the last key back to the first is continuous", () => {
  for (const m of ALL_DANCE_MOVES) {
    const before = poseAt(m, m.period - FRAME / 10);
    const after = poseAt(m, m.period + FRAME / 10);
    assert.ok(maxDelta(before, after) < (m.captured ? 0.08 : 0.02), m.id);
  }
});

test("moves ease between keys with no frame-to-frame jumps", () => {
  // 0.15 rad per frame is a fast flick; anything bigger would read as a glitch
  for (const m of ALL_DANCE_MOVES) {
    let prev = poseAt(m, 0);
    for (let t = FRAME; t < m.period * 2; t += FRAME) {
      const now = poseAt(m, t);
      // captured dances keep real flicks (a salsa forearm, a body snap)
      const limit = m.captured ? 0.5 : 0.15;
      assert.ok(maxDelta(prev, now) < limit, `${m.id} at ${t.toFixed(3)}`);
      prev = now;
    }
  }
});

test("poseAt writes into the given pose and returns it, without a new one", () => {
  const out = createPose();
  const got = poseAt(danceMove("voguing"), 0.5, out);
  assert.equal(got, out);
  assert.deepEqual(got, poseAt(danceMove("voguing"), 0.5));
});

test("the same time always gives the same pose", () => {
  const m = danceMove("twerk");
  assert.deepEqual(poseAt(m, 0.123), poseAt(m, 0.123));
});

test("a key's own values are reached exactly at its time", () => {
  const m: DanceMove = {
    id: "two-step",
    label: "test",
    period: 2,
    keys: [
      { at: 0, joints: { head: [1, 0, 0] } },
      { at: 1, joints: { head: [3, 0, 0] } },
    ],
  };
  assert.equal(poseAt(m, 0).joints.head[0], 1);
  assert.equal(poseAt(m, 1).joints.head[0], 3);
  // halfway between keys, the eased value is halfway too
  assert.ok(Math.abs(poseAt(m, 0.5).joints.head[0] - 2) < EPS);
});

test("danceMove finds a move by id and rejects unknown ids", () => {
  assert.equal(danceMove("slow-dance").id, "slow-dance");
  assert.throws(() => danceMove("moonwalk" as never));
  assert.equal(isDanceMoveId("body-roll"), true);
  assert.equal(isDanceMoveId("__proto__"), false);
  assert.equal(isDanceMoveId(3), false);
});
