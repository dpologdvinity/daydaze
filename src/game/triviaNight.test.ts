// Trivia night: the quiz host and pad exist only in the clubs that run it,
// only while the night is on, and sit on the floor away from the furniture.
import assert from "node:assert/strict";
import test from "node:test";
import { CLUB_NIGHTS } from "./events.ts";
import { hotspotsIn } from "./hotspots.ts";
import { pointInPolygon } from "./walk.ts";
import { ROOMS } from "./rooms.ts";
import { TRIVIA_HOSTS, hostedTrivia } from "./triviaNight.ts";
import { must } from "./typed.ts";

// Tuesday 2026-11-17 at 23:30 UTC: trivia night is on, and so is nothing else in these clubs
const ON = Date.parse("2026-11-17T23:30:00Z");
const OFF = Date.parse("2026-11-18T12:00:00Z");

test("every club that runs trivia night has a host spot and a pad", () => {
  const night = must(CLUB_NIGHTS.find((n) => n.id === "trivia-night"));
  for (const club of night.clubs) {
    const host = TRIVIA_HOSTS[club];
    assert.ok(host, `${club} has no host`);
    assert.ok(pointInPolygon(ROOMS[club].walkable, host.at), `${club} host`);
    assert.equal(hotspotsIn(club, ON).length, 1, club);
  }
});

test("the pad appears only while trivia night is on", () => {
  assert.equal(hotspotsIn("skate-diner", OFF).length, 0);
  assert.equal(hotspotsIn("skate-diner").length, 0);
  const [pad] = hotspotsIn("skate-diner", ON);
  assert.equal(pad?.game, "trivia");
});

test("a hosted round is trivia in a club on its night", () => {
  assert.equal(hostedTrivia("wine-bar", ON), true);
  assert.equal(hostedTrivia("wine-bar", OFF), false);
  // the arcade cabinet is never hosted
  assert.equal(hostedTrivia("arcade-bar", ON), false);
});
