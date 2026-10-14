import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeServerMessage,
  encodeClientMessage,
  type EntityDelta,
  type ServerMessage,
} from "../../src/net/networkProtocol.ts";
import {
  MAX_INVALID_MESSAGES,
  RoomCore,
  type CloseReason,
  type RoomPlayer,
} from "./roomCore.ts";

const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

function setup(capacity?: number) {
  const clock = { t: 0 };
  const room = new RoomCore({
    roomId: "plaza-1",
    capacity,
    walkable: square,
    now: () => clock.t,
  });
  function join(id: string, overrides: Partial<RoomPlayer> = {}) {
    const received: ServerMessage[] = [];
    const closed: CloseReason[] = [];
    const result = room.join(
      {
        id,
        name: `Name-${id}`,
        isGuest: false,
        isAdmin: false,
        look: { hair: "bob" },
        ...overrides,
      },
      (raw) => {
        const message = decodeServerMessage(raw);
        assert.ok(message, `server sent an invalid frame: ${raw}`);
        received.push(message);
      },
      (reason) => closed.push(reason),
    );
    return { id, result, received, closed };
  }
  return { room, clock, join };
}

function entity(id: string, overrides: Partial<EntityDelta> = {}): EntityDelta {
  return { id, x: 1, z: 1, yaw: 0, action: "idle", timestamp: 0, ...overrides };
}
const update = (ent: EntityDelta) =>
  encodeClientMessage({ type: "update", entity: ent });
const chat = (text: string) => encodeClientMessage({ type: "chat", text });
const emote = (name: string) =>
  encodeClientMessage({ type: "emote", emote: name });
const ofType = <T extends ServerMessage["type"]>(
  messages: ServerMessage[],
  type: T,
) =>
  messages.filter(
    (m): m is Extract<ServerMessage, { type: T }> => m.type === type,
  );

test("joining sends a snapshot and every occupant's profile, and announces the newcomer", () => {
  const { room, join } = setup();
  const a = join("a");
  room.handle("a", update(entity("a", { x: 2, z: 3 })));
  const b = join("b");

  assert.deepEqual(b.result, { ok: true });
  assert.deepEqual(b.received.slice(0, 2), [
    {
      type: "snapshot",
      roomId: "plaza-1",
      entities: [entity("a", { x: 2, z: 3 })],
    },
    {
      type: "profile",
      roomId: "plaza-1",
      id: "a",
      name: "Name-a",
      look: { hair: "bob" },
    },
  ]);
  assert.deepEqual(ofType(a.received, "profile"), [
    {
      type: "profile",
      roomId: "plaza-1",
      id: "b",
      name: "Name-b",
      look: { hair: "bob" },
    },
  ]);
  assert.deepEqual(ofType(a.received, "occupancy").at(-1), {
    type: "occupancy",
    roomId: "plaza-1",
    count: 2,
  });
  assert.equal(room.occupancy(), 2);
});

test("joins are rejected when invalid, duplicated, full or banned", () => {
  const { room, join } = setup(2);
  assert.deepEqual(join(" ").result, { ok: false, reason: "invalid" });
  assert.deepEqual(join("x", { name: "" }).result, {
    ok: false,
    reason: "invalid",
  });
  assert.deepEqual(join("x", { look: { hair: 1 } }).result, {
    ok: false,
    reason: "invalid",
  });
  join("admin", { isAdmin: true });
  join("b");
  assert.deepEqual(join("b").result, { ok: false, reason: "invalid" });
  const c = join("c");
  assert.deepEqual(c.result, { ok: false, reason: "full" });
  assert.deepEqual(c.received, []);
  assert.equal(room.ban("admin", "b"), true);
  assert.deepEqual(join("b").result, { ok: false, reason: "banned" });
  assert.equal(room.occupancy(), 1);
});

test("updates broadcast a delta under the session id, clamped to the walkable floor", () => {
  const { room, join } = setup();
  const a = join("a");
  const b = join("b");
  a.received.length = 0;
  b.received.length = 0;

  room.handle("b", update(entity("spoofed", { x: 15, z: 4, timestamp: 5 })));

  assert.deepEqual(ofType(a.received, "delta"), [
    {
      type: "delta",
      roomId: "plaza-1",
      entity: entity("b", { x: 10, z: 4, timestamp: 5 }),
    },
  ]);
  assert.deepEqual(b.received, []);

  room.handle("b", update(entity("b", { x: 3, timestamp: 4 })));
  assert.equal(ofType(a.received, "delta").length, 1, "stale timestamp");
});

test("a join message updates the look, ignores the client's name and moves the avatar", () => {
  const { room, join } = setup();
  const a = join("a");
  join("b");
  a.received.length = 0;

  room.handle(
    "b",
    encodeClientMessage({
      type: "join",
      roomId: "anything",
      name: "Impostor",
      look: { hair: "mohawk" },
      entity: entity("b", { x: 4 }),
    }),
  );

  assert.deepEqual(ofType(a.received, "profile"), [
    {
      type: "profile",
      roomId: "plaza-1",
      id: "b",
      name: "Name-b",
      look: { hair: "mohawk" },
    },
  ]);
  assert.equal(ofType(a.received, "delta")[0]?.entity.x, 4);
});

test("movement is limited to about 15 updates per second", () => {
  const { room, clock, join } = setup();
  const a = join("a");
  join("b");
  a.received.length = 0;
  for (let i = 1; i <= 100; i++)
    room.handle("b", update(entity("b", { timestamp: i })));
  const burst = ofType(a.received, "delta").length;
  assert.ok(burst >= 5 && burst <= 15, `${burst}`);

  for (let i = 1; i <= 30; i++) {
    clock.t = 10_000 + (i * 1000) / 15;
    room.handle("b", update(entity("b", { timestamp: 100 + i })));
  }
  assert.equal(ofType(a.received, "delta").length - burst, 30, "steady 15 Hz");
});

test("chat is filtered, attributed, rate limited per account type and logged raw for reports", () => {
  const { room, clock, join } = setup();
  const a = join("a");
  join("b");
  join("g", { isGuest: true });
  a.received.length = 0;

  for (const text of ["one", "two faggot", "three", "four"])
    room.handle("b", chat(text));
  for (const text of ["g1", "g2", "g3"]) room.handle("g", chat(text));

  assert.deepEqual(
    ofType(a.received, "chat").map((m) => `${m.id}:${m.text}`),
    ["b:one", "b:two ******", "b:three", "g:g1", "g:g2"],
  );
  clock.t = 2000;
  room.handle("b", chat("five"));
  room.handle("g", chat("g4"));
  clock.t = 4000;
  room.handle("g", chat("g5"));
  assert.deepEqual(
    ofType(a.received, "chat")
      .slice(5)
      .map((m) => m.text),
    ["five", "g5"],
  );
  assert.deepEqual(room.recentChat(2), [
    { id: "b", name: "Name-b", text: "five", at: 2000 },
    { id: "g", name: "Name-g", text: "g5", at: 4000 },
  ]);
  assert.equal(room.recentChat(100)[1].text, "two faggot");
  assert.deepEqual(room.recentChat(0), []);
});

test("the report log keeps only the last 20 lines", () => {
  const { room, clock, join } = setup();
  join("a");
  for (let i = 0; i < 25; i++) {
    clock.t += 2000;
    room.handle("a", chat(`line ${i}`));
  }
  const log = room.recentChat(100);
  assert.equal(log.length, 20);
  assert.equal(log[0].text, "line 5");
});

test("emotes broadcast at 1 per second with a burst of 3", () => {
  const { room, clock, join } = setup();
  const a = join("a");
  join("b");
  a.received.length = 0;
  for (let i = 0; i < 5; i++) room.handle("b", emote("wave"));
  clock.t = 1000;
  room.handle("b", emote("dance"));
  assert.deepEqual(
    ofType(a.received, "emote").map((m) => `${m.id}:${m.emote}`),
    ["b:wave", "b:wave", "b:wave", "b:dance"],
  );
});

test("a blocked pair never receives each other's entities, profiles, chat or emotes", () => {
  const { room, join } = setup();
  const a = join("a");
  const b = join("b");
  const c = join("c");
  room.handle("b", update(entity("b")));
  a.received.length = 0;
  b.received.length = 0;

  room.block("a", "b");
  assert.deepEqual(a.received, [
    { type: "entity-leave", roomId: "plaza-1", id: "b" },
  ]);
  assert.deepEqual(b.received, [
    { type: "entity-leave", roomId: "plaza-1", id: "a" },
  ]);
  a.received.length = 0;
  b.received.length = 0;
  c.received.length = 0;

  room.handle("b", update(entity("b", { timestamp: 1 })));
  room.handle("b", chat("hi"));
  room.handle("b", emote("wave"));
  room.handle("a", update(entity("a", { timestamp: 1 })));
  room.handle("a", chat("hello"));
  room.handle("a", emote("wave"));
  assert.deepEqual(a.received, []);
  assert.deepEqual(b.received, []);
  assert.equal(c.received.length, 6);

  room.leave("b");
  assert.deepEqual(ofType(a.received, "entity-leave"), []);
  const b2 = join("b");
  assert.deepEqual(ofType(b2.received, "snapshot")[0].entities, []);
  assert.equal(
    ofType(b2.received, "profile").some((m) => m.id === "a"),
    false,
  );
  assert.equal(
    ofType(a.received, "profile").some((m) => m.id === "b"),
    false,
  );
});

test("only a present admin can kick or ban, and the target's socket is closed", () => {
  const { room, join } = setup();
  const admin = join("admin", { isAdmin: true });
  const a = join("a");
  const b = join("b");
  admin.received.length = 0;

  assert.equal(room.kick("a", "b"), false);
  assert.equal(room.ban("a", "b"), false);
  assert.equal(room.kick("admin", "admin"), false);
  assert.equal(room.kick("admin", "ghost"), false);
  assert.deepEqual(b.closed, []);

  assert.equal(room.kick("admin", "b"), true);
  assert.deepEqual(b.closed, ["kicked"]);
  assert.deepEqual(ofType(admin.received, "entity-leave"), [
    { type: "entity-leave", roomId: "plaza-1", id: "b" },
  ]);
  assert.equal(room.occupancy(), 2);
  assert.deepEqual(join("b").result, { ok: true });

  assert.equal(room.ban("admin", "a"), true);
  assert.deepEqual(a.closed, ["banned"]);
  assert.deepEqual(join("a").result, { ok: false, reason: "banned" });
  room.leave("a");
  assert.equal(room.occupancy(), 2);
});

test(`a socket is closed after ${MAX_INVALID_MESSAGES} invalid messages`, () => {
  const { room, join } = setup();
  const a = join("a");
  const b = join("b");
  for (let i = 1; i < MAX_INVALID_MESSAGES; i++) room.handle("b", "{");
  assert.deepEqual(b.closed, []);
  room.handle("b", chat("still fine"));
  room.handle("b", JSON.stringify({ type: "chat", text: "x".repeat(121) }));
  assert.deepEqual(b.closed, ["invalid-messages"]);
  assert.equal(room.occupancy(), 1);
  assert.ok(ofType(a.received, "entity-leave").some((m) => m.id === "b"));
});

test("leaving announces the departure once and unknown senders are ignored", () => {
  const { room, join } = setup();
  const a = join("a");
  const b = join("b");
  a.received.length = 0;
  room.handle("b", encodeClientMessage({ type: "leave" }));
  assert.deepEqual(b.closed, ["left"]);
  room.leave("b");
  room.handle("b", chat("ghost"));
  room.handle("nobody", chat("ghost"));
  assert.deepEqual(a.received, [
    { type: "entity-leave", roomId: "plaza-1", id: "b" },
    { type: "occupancy", roomId: "plaza-1", count: 1 },
  ]);
});

test("a send that throws drops that player while the broadcast continues", () => {
  const { room, join } = setup();
  const a = join("a");
  let fail = false;
  room.join(
    { id: "broken", name: "B", isGuest: false, isAdmin: false, look: {} },
    () => {
      if (fail) throw new Error("socket gone");
    },
    () => {},
  );
  const c = join("c");
  a.received.length = 0;
  fail = true;
  assert.doesNotThrow(() => room.handle("c", chat("hello")));
  assert.equal(room.occupancy(), 2);
  assert.ok(ofType(a.received, "chat").length === 1);
  assert.equal(c.result.ok, true);
});

test("constructor rejects bad room ids, capacities and walkable areas", () => {
  const now = () => 0;
  for (const options of [
    { roomId: "", walkable: square, now },
    { roomId: "r".repeat(65), walkable: square, now },
    { roomId: "r", capacity: 0, walkable: square, now },
    { roomId: "r", capacity: 1.5, walkable: square, now },
    { roomId: "r", capacity: 513, walkable: square, now },
    { roomId: "r", walkable: square.slice(0, 2), now },
    {
      roomId: "r",
      walkable: [...square.slice(0, 3), [NaN, 0] as [number, number]],
      now,
    },
  ])
    assert.throws(() => new RoomCore(options), TypeError);
  assert.equal(
    new RoomCore({ roomId: "r", walkable: square, now }).occupancy(),
    0,
  );
});

test("capacity defaults to 60", () => {
  const { join } = setup();
  for (let i = 0; i < 60; i++) assert.equal(join(`p${i}`).result.ok, true);
  assert.deepEqual(join("late").result, { ok: false, reason: "full" });
});
