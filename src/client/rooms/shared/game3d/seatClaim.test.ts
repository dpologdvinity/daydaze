// Tests for game seat claims: a game only releases the seat it took, and
// never takes one another game holds.

import { test } from "node:test";
import assert from "node:assert/strict";
import { claimSeat, releaseSeat } from "./seatClaim.ts";

type Seat = { tag: string };
const holder = () => ({ seat: null as Seat | null, sitting: false });

test("a game takes a free seat and releases only its own", () => {
  const p = holder();
  const mine = { tag: "slide" };
  assert.equal(claimSeat(p, mine), true);
  assert.equal(p.seat, mine);
  const theirs = { tag: "guns" };
  p.seat = theirs;
  releaseSeat(p, mine);
  assert.equal(p.seat, theirs, "someone else's seat stays");
  releaseSeat(p, theirs);
  assert.equal(p.seat, null);
});

test("a game can't take a seat another game holds", () => {
  const p = holder();
  const a = { tag: "a" };
  claimSeat(p, a);
  assert.equal(claimSeat(p, { tag: "b" }), false);
  assert.equal(p.seat, a);
});

test("a chair (sitting) is stood up from, then claimed", () => {
  const p = holder();
  p.seat = { tag: "chair" };
  p.sitting = true;
  const mine = { tag: "game" };
  assert.equal(claimSeat(p, mine), true);
  assert.equal(p.sitting, false);
  assert.equal(p.seat, mine);
});
