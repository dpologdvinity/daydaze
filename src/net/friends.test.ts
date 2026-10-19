import assert from "node:assert/strict";
import { test } from "node:test";
import { friendLists, parseFriends } from "./friends.ts";

const names = new Map([
  ["u_a", "Ana"],
  ["u_b", "Bea"],
  ["u_c", "Cass"],
  ["u_d", "Dee"],
]);

test("asking each other makes friends; one way is a request", () => {
  const lists = friendLists(
    ["u_b", "u_c", "g_gone"],
    ["u_b", "u_d"],
    names,
    new Map([["u_b", { roomId: "plaza", copy: 2 }]]),
  );
  assert.deepEqual(lists, {
    friends: [{ id: "u_b", name: "Bea", room: { roomId: "plaza", copy: 2 } }],
    incoming: [{ id: "u_d", name: "Dee" }],
    // a guest whose session ended has no name and drops out
    sent: [{ id: "u_c", name: "Cass" }],
  });
  assert.deepEqual(parseFriends(JSON.parse(JSON.stringify(lists))), lists);
});

test("a friends reply with anything off is refused", () => {
  const ok = { friends: [], incoming: [], sent: [] };
  assert.deepEqual(parseFriends(ok), ok);
  assert.equal(parseFriends({ ...ok, sent: [{ id: "u_a" }] }), null);
  assert.equal(
    parseFriends({
      ...ok,
      friends: [{ id: "u_a", name: "Ana", room: { roomId: "moon", copy: 1 } }],
    }),
    null,
  );
  assert.equal(
    parseFriends({ ...ok, friends: [{ id: "u_a", name: "Ana" }] }),
    null,
  );
  assert.equal(parseFriends(null), null);
});
