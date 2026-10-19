import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLIENTS,
  finish,
  FINISHES,
  newSession,
  paint,
  POLISHES,
  sessionOver,
  wantedSet,
} from "./nails.ts";

test("a client's set is five nails, the ring finger the accent", () => {
  const set = wantedSet(7, 0);
  assert.equal(set.length, 5);
  const polishes = new Set<string>(POLISHES.map((p) => p.id));
  for (const n of set) {
    assert.ok(polishes.has(n.polish));
    assert.ok(FINISHES.includes(n.finish));
  }
  assert.deepEqual(set[0], set[1]);
  assert.deepEqual(wantedSet(7, 0), set);
});

test("matching every nail fast scores the most", () => {
  let s = newSession(3);
  wantedSet(3, 0).forEach((n, i) => (s = paint(s, i, n)));
  const quick = finish(s, 0);
  assert.equal(quick.right, 5);
  assert.equal(quick.tip, 25);
  assert.equal(quick.session.points, 125);
  assert.deepEqual(quick.session.hand, [null, null, null, null, null]);
});

test("a wrong nail costs its points and the tip", () => {
  let s = newSession(3);
  wantedSet(3, 0).forEach((n, i) => (s = paint(s, i, n)));
  s = paint(s, 0, { polish: "#nope", finish: "cream" });
  const r = finish(s, 0);
  assert.equal(r.right, 4);
  assert.equal(r.tip, 0);
});

test("a session is five clients", () => {
  let s = newSession(1);
  for (let i = 0; i < CLIENTS + 1; i++) s = finish(s, 10).session;
  assert.ok(sessionOver(s));
  assert.equal(s.served, CLIENTS);
});
