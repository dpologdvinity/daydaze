import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeParty, MAX_PARTY, parsePartyMessage } from "./party.ts";

test("party messages round-trip through the relay codec", () => {
  for (const m of [
    { k: "party-invite" },
    { k: "party-join" },
    { k: "party-leave" },
    { k: "party-go", room: "karaoke", copy: 3 },
  ] as const)
    assert.deepEqual(parsePartyMessage(encodeParty(m)), m);
});

test("a party can't be sent anywhere private, unknown or out of range", () => {
  for (const bad of [
    { k: "party-go", room: "apartment", copy: 1 },
    { k: "party-go", room: "jail", copy: 1 },
    { k: "party-go", room: "nowhere", copy: 1 },
    { k: "party-go", room: "karaoke", copy: 0 },
    { k: "party-go", room: "karaoke", copy: 100 },
    { k: "party-go", room: "karaoke", copy: 2.5 },
    { k: "party-go", room: "karaoke" },
    { k: "party-boom" },
  ])
    assert.equal(parsePartyMessage(JSON.stringify(bad)), null);
  assert.equal(parsePartyMessage("{oops"), null);
  assert.equal(parsePartyMessage("null"), null);
  assert.equal(parsePartyMessage("x".repeat(5000)), null);
});

test("a party is the leader and up to seven friends", () => {
  assert.equal(MAX_PARTY, 8);
});
