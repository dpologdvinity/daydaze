import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeAction, encodeAction } from "../peerAction.ts";
import { danceMove, PICKER_DANCE_MOVES } from "./moves.ts";
import {
  followSpot,
  liftOf,
  mirrored,
  parsePairMessage,
  roleMove,
  TOGETHER,
} from "./together.ts";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("every emote together has its own move, kept out of the solo picker", () => {
  for (const e of TOGETHER)
    for (const move of [e.move, e.follow ?? e.move]) {
      assert.equal(danceMove(move).id, move);
      if (move !== "slow-dance")
        assert.ok(!PICKER_DANCE_MOVES.some((m) => m.id === move), e.id);
    }
});

test("a piggyback rider climbs on the leader's back, facing the same way", () => {
  const e = TOGETHER.find((x) => x.id === "piggyback")!;
  const spot = followSpot("piggyback", [2, 3], 0);
  // yaw 0 faces +z: behind is -z
  assert.ok(close(spot.at[0], 2) && close(spot.at[1], 3 - e.gap));
  assert.ok(close(spot.yaw, 0));
  assert.ok(liftOf("piggyback") > 0.1);
});

test("the piggyback roles play their own moves; the others mirror one", () => {
  assert.equal(roleMove("piggyback", "lead"), "piggyback-carry");
  assert.equal(roleMove("piggyback", "follow"), "piggyback-ride");
  assert.equal(mirrored("piggyback"), false);
  assert.equal(roleMove("hug", "follow"), "hug");
  assert.equal(mirrored("hug"), true);
  assert.equal(liftOf("hug"), 0);
});

test("a piggyback rider's action code carries the riding move", () => {
  const ride = decodeAction("pair:piggyback:f");
  assert.equal(ride.dance, "piggyback-ride");
  assert.deepEqual(ride.pair, { emote: "piggyback", role: "follow" });
  assert.equal(decodeAction("pair:piggyback:l").dance, "piggyback-carry");
});

test("the follower faces the leader, gap meters in front", () => {
  const hug = TOGETHER.find((e) => e.id === "hug")!;
  const spot = followSpot("hug", [2, 3], 0);
  // yaw 0 faces +z
  assert.ok(close(spot.at[0], 2) && close(spot.at[1], 3 + hug.gap));
  assert.ok(close(spot.yaw, Math.PI));
});

test("holding hands puts the follower at the leader's side, facing the same way", () => {
  const e = TOGETHER.find((x) => x.id === "hold-hands")!;
  const spot = followSpot("hold-hands", [0, 0], Math.PI / 2);
  assert.ok(close(Math.hypot(...spot.at), e.gap));
  assert.ok(close(spot.yaw, Math.PI / 2));
  // facing +x, the follower stands on the right: +z
  assert.ok(spot.at[1] > 0);
});

test("pair messages over the game relay are validated", () => {
  const parse = (v: unknown) => parsePairMessage(JSON.stringify(v));
  assert.deepEqual(parse({ k: "pair-invite", e: "hug" }), {
    k: "pair-invite",
    e: "hug",
  });
  assert.deepEqual(parse({ k: "pair-accept", e: "slow-dance" }), {
    k: "pair-accept",
    e: "slow-dance",
  });
  assert.deepEqual(parse({ k: "pair-stop" }), { k: "pair-stop" });
  assert.equal(parse({ k: "pair-invite", e: "tango" }), null);
  assert.equal(parse({ k: "invite", seed: 4 }), null);
  assert.equal(parse("hug"), null);
  assert.equal(parse(null), null);
  assert.equal(parsePairMessage("{not json"), null);
  assert.equal(
    parsePairMessage(`{"k":"pair-stop","x":"${"a".repeat(300)}"}`),
    null,
  );
});

test("an emote together rides the action code, buzz and all", () => {
  for (const e of TOGETHER)
    for (const role of ["lead", "follow"] as const) {
      const code = encodeAction("dance", "groove", undefined, undefined, 3, {
        emote: e.id,
        role,
      });
      assert.ok(code.length <= 24, code);
      const got = decodeAction(code);
      assert.deepEqual(got.pair, { emote: e.id, role });
      assert.equal(got.mood, "dance");
      // each side's own move: the lead's, or a piggyback rider's
      assert.equal(got.dance, roleMove(e.id, role));
      assert.equal(got.buzz, 3);
    }
  assert.equal(decodeAction("pair:tango:l").pair, undefined);
});
