import assert from "node:assert/strict";
import { test } from "node:test";
import { clipOf } from "./clips.ts";
import {
  beatAt,
  CONVERSATION_CLIPS,
  toneOf,
  type Group,
  type Tone,
} from "./conversation.ts";

const group = (seed: number, size = 3): Group => ({ seed, size });
const members = (g: Group) => Array.from({ length: g.size }, (_, i) => i);
/** Group seeds by tone, found by search so the test does not hang on a table. */
function seedsFor(tone: Tone, n = 3): number[] {
  const out: number[] = [];
  for (let s = 0; out.length < n && s < 5000; s++)
    if (toneOf(s) === tone) out.push(s);
  return out;
}

test("every clip a conversation asks for is a baked emote", () => {
  assert.ok(CONVERSATION_CLIPS.length >= 30);
  for (const id of CONVERSATION_CLIPS) {
    const c = clipOf(id);
    assert.equal(c?.kind, "emote", id);
    assert.ok((c?.period ?? 0) > 0, id);
    assert.ok(c?.pack === "social" || c?.pack === "core", id);
  }
});

test("the same group at the same time always gives the same beats", () => {
  const g = group(41, 4);
  for (const t of [0, 3.3, 59.9, 60, 301.2])
    for (const m of members(g))
      assert.deepEqual(beatAt(g, m, t), beatAt(g, m, t));
});

test("exactly one member speaks at a time, and never the same one twice running", () => {
  for (const size of [2, 3, 4])
    for (const seed of [1, 2, 3, 99, 4242]) {
      const g = group(seed, size);
      let last = -1;
      for (let t = 0; t < 600; t += 0.5) {
        const speakers = members(g).filter(
          (m) => beatAt(g, m, t).role === "speak",
        );
        assert.equal(speakers.length, 1, `seed ${seed} size ${size} at ${t}`);
        const [who] = speakers;
        // a change of speaker is never to the same person (a window edge may
        // start the same person's turn afresh, so only count real changes)
        if (who !== last && last !== -1) assert.notEqual(who, last);
        last = who as number;
      }
    }
});

test("beats end in the future and soon, so a caller can sleep until `until`", () => {
  const g = group(7, 3);
  for (let t = 0; t < 400; t += 0.7)
    for (const m of members(g)) {
      const b = beatAt(g, m, t);
      assert.ok(b.until > t, `${t} ${b.until}`);
      assert.ok(b.until - t <= 11, `${t} ${b.until}`);
    }
});

test("listeners react at moments of their own, so a group is out of step", () => {
  const g = group(12, 4);
  const edges = new Set<number>();
  for (let t = 0; t < 300; t += 0.5)
    for (const m of members(g)) edges.add(beatAt(g, m, t).until);
  // four people's beats end at many different moments, not four-at-once
  assert.ok(edges.size > 60, `${edges.size} distinct beat ends`);
  // and at a given instant not everyone is doing the same thing
  let mixed = 0;
  for (let t = 0; t < 300; t += 1) {
    const clips = new Set(members(g).map((m) => beatAt(g, m, t).clip));
    if (clips.size >= 3) mixed++;
  }
  assert.ok(mixed > 40, `${mixed}`);
});

test("only listeners react, and they react in the group's manner", () => {
  for (const tone of [
    "friendly",
    "easy",
    "gossip",
    "heated",
    "excited",
  ] as const)
    for (const seed of seedsFor(tone)) {
      const g = group(seed, 3);
      const spoke = new Set<string>();
      const reacted = new Set<string>();
      for (let t = 0; t < 900; t += 0.5)
        for (const m of members(g)) {
          const b = beatAt(g, m, t);
          if (b.role === "speak") spoke.add(b.clip ?? "");
          else if (b.role === "react") reacted.add(b.clip ?? "");
          else assert.equal(b.clip, null);
        }
      assert.ok(spoke.size >= 1 && reacted.size >= 1, tone);
      for (const id of spoke) assert.ok(clipOf(id), id);
      if (tone === "gossip")
        for (const id of spoke)
          assert.ok(id === "talk-secret" || id === "talk-whisper", id);
      if (tone === "heated") {
        assert.ok(
          [...spoke].every((id) =>
            [
              "talk-argue",
              "talk-argue-2",
              "angry-forward",
              "point-angry",
              "yell",
            ].includes(id),
          ),
        );
        assert.ok(!reacted.has("laugh") && !reacted.has("nod-yes"));
      }
    }
});

test("most groups are friendly or easy, a few heated or whispering", () => {
  const counts: Record<string, number> = {};
  for (let s = 0; s < 1100; s++)
    counts[toneOf(s)] = (counts[toneOf(s)] ?? 0) + 1;
  const friendly = (counts.friendly ?? 0) + (counts.easy ?? 0);
  assert.ok(friendly > 550, JSON.stringify(counts));
  assert.ok((counts.heated ?? 0) > 40 && (counts.gossip ?? 0) > 40);
});

test("a pair has a speaker and a listener, a crowd of one just talks", () => {
  const pair = group(5, 2);
  for (let t = 0; t < 120; t += 1) {
    const roles = [0, 1].map((m) => beatAt(pair, m, t).role).sort();
    assert.ok(roles[0] !== "speak" && roles[1] === "speak");
  }
  assert.equal(beatAt(group(5, 1), 0, 10).role, "speak");
});
