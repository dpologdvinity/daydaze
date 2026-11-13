// Every dance the player can pick sits in exactly one picker group, and every
// listed id is a real dance: a new dance must be given a style.

import assert from "node:assert/strict";
import { test } from "node:test";
import { DANCE_GROUPS, groupForMove, groupOf, movesOfGroup } from "./groups.ts";
import { PICKER_DANCE_MOVES } from "./moves.ts";

test("every pickable dance is in exactly one group", () => {
  for (const m of PICKER_DANCE_MOVES) {
    const homes = DANCE_GROUPS.filter((g) =>
      (g.ids as readonly string[]).includes(m.id),
    );
    assert.equal(homes.length, 1, `${m.id} is in ${homes.length} groups`);
  }
});

test("every id in a group is a pickable dance", () => {
  const pickable = new Set(PICKER_DANCE_MOVES.map((m) => m.id as string));
  for (const g of DANCE_GROUPS)
    for (const id of g.ids) assert.ok(pickable.has(id), `${g.id}: ${id}`);
});

test("a group's moves come out in menu order, none missing", () => {
  for (const g of DANCE_GROUPS)
    assert.deepEqual(
      movesOfGroup(g.id).map((m) => m.id),
      [...g.ids],
    );
});

test("the picker opens on the group of the move in play", () => {
  assert.equal(groupForMove("groove"), "club");
  assert.equal(groupForMove("thriller"), "party");
  assert.equal(groupOf("not-a-dance"), undefined);
});

test("no group is crowded: the menu stays scannable", () => {
  for (const g of DANCE_GROUPS) assert.ok(g.ids.length <= 16, g.id);
});
