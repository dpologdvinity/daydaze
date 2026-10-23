import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deal,
  drawCard,
  label,
  playable,
  playCard,
  topCard,
  type Table,
} from "./crazyEights.ts";

test("a deal is five each from one deck, with a non-eight face up", () => {
  const t = deal(42);
  assert.equal(t.you.length, 5);
  assert.equal(t.guard.length, 5);
  assert.notEqual(topCard(t).rank, 8);
  const all = [...t.deck, ...t.pile, ...t.you, ...t.guard].map(label);
  assert.equal(new Set(all).size, 52);
});

test("an illegal card is refused; a legal one passes the turn and the guard answers", () => {
  const t: Table = {
    ...deal(1),
    pile: [{ rank: 5, suit: 1 }],
    suit: 1,
    you: [
      { rank: 9, suit: 0 },
      { rank: 5, suit: 2 },
    ],
  };
  assert.equal(playCard(t, 0), t);
  const after = playCard(t, 1);
  assert.equal(after.you.length, 1);
  assert.equal(after.turn, "you");
  assert.notEqual(after.guardDid, "");
});

test("an eight is wild and names the suit", () => {
  const t: Table = {
    ...deal(2),
    pile: [{ rank: 3, suit: 0 }],
    suit: 0,
    you: [
      { rank: 8, suit: 1 },
      { rank: 2, suit: 3 },
    ],
    guard: [
      { rank: 13, suit: 2 },
      { rank: 12, suit: 2 },
    ],
  };
  assert.ok(playable(t, { rank: 8, suit: 1 }));
  const after = playCard(t, 0, 3);
  // the guard had no clubs or eights, so drew; clubs still stand or they played one
  assert.ok(after.suit === 3 || after.pile.length > 2);
});

test("emptying your hand wins", () => {
  const t: Table = {
    ...deal(3),
    pile: [{ rank: 4, suit: 1 }],
    suit: 1,
    you: [{ rank: 4, suit: 2 }],
  };
  const after = playCard(t, 0);
  assert.equal(after.winner, "you");
});

test("a whole game always ends, one way or the other", () => {
  for (let seed = 0; seed < 30; seed++) {
    let t = deal(seed);
    for (let turn = 0; turn < 500 && !t.winner; turn++) {
      const i = t.you.findIndex((c) => playable(t, c));
      t = i >= 0 ? playCard(t, i, 0) : drawCard(t);
    }
    assert.ok(t.winner, `seed ${seed}`);
  }
});

test("the table talk names whoever deals you in", () => {
  const t = drawCard(deal(3, "Odette"));
  assert.match(t.guardDid, /^Odette (draws|plays)/);
  assert.match(drawCard(deal(3)).guardDid, /^The guard (draws|plays)/);
});
