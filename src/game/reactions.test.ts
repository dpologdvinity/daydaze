import assert from "node:assert/strict";
import { test } from "node:test";
import { clipOf } from "./dance/clips.ts";
import {
  FALL_SHARE,
  hitDirection,
  isReactionId,
  newTrips,
  REACTIONS,
  reactionClip,
  reactionSeconds,
  startReaction,
  stepTrips,
  TRIP_MAX_METERS,
  TRIP_MIN_METERS,
  type ReactionId,
} from "./reactions.ts";

const IDS = Object.keys(REACTIONS) as ReactionId[];

test("every reaction is a baked one-shot of the moves pack", () => {
  assert.ok(IDS.length >= 8);
  for (const id of IDS) {
    const c = clipOf(reactionClip(id));
    assert.equal(c?.kind, "trans", id);
    assert.equal(c?.pack, "moves", id);
    // quick enough for a game: a flinch is a second or two, a fall a few
    const s = reactionSeconds(id);
    assert.ok(s >= 0.5 && s <= 8, `${id} ${s}`);
  }
});

test("a reaction id from the network is checked against the list", () => {
  for (const id of IDS) assert.equal(isReactionId(id), true);
  for (const bad of [
    "",
    "thriller",
    "react-trip",
    "hit",
    "__proto__",
    "constructor",
    7,
    null,
  ])
    assert.equal(isReactionId(bad), false);
});

test("a hit is flinched from on the side it came from", () => {
  // she faces +z (yaw 0): +x is her left, -x her right
  const me: [number, number] = [0, 0];
  assert.equal(hitDirection(0, me, [0, 6]), "hit-front");
  assert.equal(hitDirection(0, me, [0, -6]), "hit-back");
  assert.equal(hitDirection(0, me, [6, 0]), "hit-left");
  assert.equal(hitDirection(0, me, [-6, 0]), "hit-right");
  // turned to face -x (yaw -pi/2): a shot from +z is now on her left
  assert.equal(hitDirection(-Math.PI / 2, me, [0, 6]), "hit-left");
  assert.equal(hitDirection(-Math.PI / 2, me, [-6, 0]), "hit-front");
  // from where she stands: a nonsense shooter spot is a front hit, not NaN
  assert.equal(hitDirection(0, me, me), "hit-front");
  assert.equal(hitDirection(Number.NaN, me, [3, 3]), "hit-front");
});

test("a new reaction waits for the one playing, and a fall runs on to its get-up", () => {
  const first = startReaction(null, "hit-front", 10);
  assert.ok(first);
  assert.equal(first.id, "hit-front");
  assert.ok(first.until > 10);
  // not while one is playing
  assert.equal(startReaction(first, "hit-left", 10.2), null);
  // once it is over, another may start
  assert.ok(startReaction(first, "hit-left", first.until + 0.01));
  // a fall is followed by its get-up, which holds her as long as the fall
  const fall = startReaction(null, "trip-fall", 0);
  assert.ok(fall);
  assert.equal(fall.then, "get-up");
  assert.ok(fall.until > reactionSeconds("trip-fall") - 0.001);
  assert.equal(startReaction(null, "hit-front", Number.NaN), null);
});

test("she trips rarely: after hundreds of meters of sidewalk, never off it", () => {
  const sim = (
    seed: number,
    meters: number,
    onSidewalk = true,
    free = true,
  ) => {
    let s = newTrips(seed);
    let tripped = 0;
    let walked = 0;
    while (walked < meters) {
      const r = stepTrips(s, { meters: 1, onSidewalk, free, jogging: false });
      s = r.state;
      if (r.trip) tripped++;
      walked++;
    }
    return tripped;
  };
  for (const seed of [1, 2, 3, 77]) {
    // not in the first stretch
    assert.equal(sim(seed, TRIP_MIN_METERS - 1), 0, `seed ${seed}`);
    // by the longest stretch she has gone over once, and not twice
    const n = sim(seed, TRIP_MAX_METERS + 1);
    assert.equal(n, 1, `seed ${seed}: ${n}`);
  }
  // off the sidewalk, or not free (driving, a menu): the meters don't count
  assert.equal(sim(5, TRIP_MAX_METERS * 3, false), 0);
  assert.equal(sim(5, TRIP_MAX_METERS * 3, true, false), 0);
});

test("a trip is a stumble when jogging, a trip walking, and now and then a fall", () => {
  const kinds = new Set<ReactionId>();
  const walkKinds: ReactionId[] = [];
  for (let seed = 1; seed <= 400; seed++) {
    for (const jogging of [false, true]) {
      let s = newTrips(seed);
      for (let m = 0; m < TRIP_MAX_METERS + 2; m++) {
        const r = stepTrips(s, {
          meters: 1,
          onSidewalk: true,
          free: true,
          jogging,
        });
        s = r.state;
        if (r.trip) {
          kinds.add(r.trip);
          if (!jogging) walkKinds.push(r.trip);
          else assert.equal(r.trip, "stumble");
        }
      }
    }
  }
  assert.deepEqual([...kinds].sort(), ["stumble", "trip", "trip-fall"]);
  const falls =
    walkKinds.filter((k) => k === "trip-fall").length / walkKinds.length;
  assert.ok(Math.abs(falls - FALL_SHARE) < 0.1, `${falls}`);
});

test("trips are deterministic for a seed and different between seeds", () => {
  const at = (seed: number) => {
    let s = newTrips(seed);
    for (let m = 0; m < TRIP_MAX_METERS + 2; m++) {
      const r = stepTrips(s, {
        meters: 1,
        onSidewalk: true,
        free: true,
        jogging: false,
      });
      if (r.trip) return m;
      s = r.state;
    }
    return -1;
  };
  assert.equal(at(9), at(9));
  assert.ok(new Set([1, 2, 3, 4, 5, 6].map(at)).size > 3);
});
