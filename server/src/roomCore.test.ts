import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeServerMessage,
  encodeClientMessage,
  type EntityDelta,
  type ServerMessage,
} from "../../src/net/networkProtocol.ts";
import { DEFAULT_LOOK } from "../../src/game/look.ts";
import {
  INTEREST_RADIUS,
  MAX_INVALID_MESSAGES,
  RoomCore,
  type CloseReason,
  type RoomPlayer,
} from "./roomCore.ts";

const look = DEFAULT_LOOK;
const otherLook = { ...DEFAULT_LOOK, hairStyle: "ponytail" };

function setup(capacity?: number, roomId = "plaza") {
  const clock = { t: 0 };
  const room = new RoomCore({
    roomId,
    capacity,
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
        look,
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
      roomId: "plaza",
      entities: [entity("a", { x: 2, z: 3 })],
    },
    {
      type: "profile",
      roomId: "plaza",
      id: "a",
      name: "Name-a",
      look,
    },
  ]);
  assert.deepEqual(ofType(a.received, "profile"), [
    {
      type: "profile",
      roomId: "plaza",
      id: "b",
      name: "Name-b",
      look,
    },
  ]);
  assert.deepEqual(ofType(a.received, "occupancy").at(-1), {
    type: "occupancy",
    roomId: "plaza",
    count: 2,
  });
  assert.equal(room.occupancy(), 2);
  assert.equal(room.ids().length, 2);
});

test("joins are rejected when invalid, duplicated, full or banned", () => {
  const { room, join } = setup(2);
  assert.deepEqual(join(" ").result, { ok: false, reason: "invalid" });
  assert.deepEqual(join("x", { name: "" }).result, {
    ok: false,
    reason: "invalid",
  });
  for (const overrides of [
    { name: "x" },
    { name: "Bad\u00e9name" },
    { look: { hair: 1 } },
    { look: { ...DEFAULT_LOOK, skin: "#000001" } },
  ])
    assert.deepEqual(join("x", overrides).result, {
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
      roomId: "plaza",
      entity: entity("b", { x: 12, z: 4, timestamp: 5 }),
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
      look: otherLook,
      entity: entity("b", { x: 4 }),
    }),
  );

  assert.deepEqual(ofType(a.received, "profile"), [
    {
      type: "profile",
      roomId: "plaza",
      id: "b",
      name: "Name-b",
      look: otherLook,
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
    { type: "entity-leave", roomId: "plaza", id: "b" },
  ]);
  assert.deepEqual(b.received, [
    { type: "entity-leave", roomId: "plaza", id: "a" },
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
    { type: "entity-leave", roomId: "plaza", id: "b" },
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
    { type: "entity-leave", roomId: "plaza", id: "b" },
    { type: "occupancy", roomId: "plaza", count: 1 },
  ]);
});

test("a send that throws drops that player while the broadcast continues", () => {
  const { room, join } = setup();
  const a = join("a");
  let fail = false;
  room.join(
    { id: "broken", name: "Broken", isGuest: false, isAdmin: false, look },
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

test("constructor rejects unknown rooms and bad capacities", () => {
  const now = () => 0;
  for (const options of [
    { roomId: "", now },
    { roomId: "nowhere", now },
    { roomId: "toString", now },
    { roomId: "plaza", capacity: 0, now },
    { roomId: "plaza", capacity: 1.5, now },
    { roomId: "plaza", capacity: 513, now },
  ])
    assert.throws(() => new RoomCore(options), TypeError);
  assert.equal(new RoomCore({ roomId: "velvet-room", now }).occupancy(), 0);
});

test("the walkable floor comes from the room definition", () => {
  const room = new RoomCore({ roomId: "velvet-room", now: () => 0 });
  const received: ServerMessage[] = [];
  const player = { isGuest: false, isAdmin: false, look };
  room.join(
    { ...player, id: "a", name: "Alpha" },
    (raw) => {
      const message = decodeServerMessage(raw);
      if (message) received.push(message);
    },
    () => {},
  );
  room.join(
    { ...player, id: "b", name: "Bravo" },
    () => {},
    () => {},
  );
  room.handle("b", update(entity("b", { x: -20, z: 0 })));
  assert.deepEqual(
    ofType(received, "delta").map((m) => [m.entity.x, m.entity.z]),
    [[-5.3, 0]],
  );
});

test("capacity defaults to 60", () => {
  const { join } = setup();
  for (let i = 0; i < 60; i++) assert.equal(join(`p${i}`).result.ok, true);
  assert.deepEqual(join("late").result, { ok: false, reason: "full" });
});

test("restore re-registers sockets silently after the room wakes from hibernation", () => {
  const room = new RoomCore({ roomId: "plaza", now: () => 0 });
  const received: string[] = [];
  const player = { isGuest: false, isAdmin: false, look };
  assert.equal(
    room.restore(
      { ...player, id: "a", name: "Alpha" },
      (raw) => received.push(raw),
      () => {},
    ),
    true,
  );
  room.restore(
    { ...player, id: "b", name: "Bravo" },
    () => {},
    () => {},
  );
  assert.equal(
    room.restore(
      { ...player, id: "b", name: "Bravo" },
      () => {},
      () => {},
    ),
    false,
  );
  assert.equal(
    room.restore(
      { ...player, id: "c", name: "" },
      () => {},
      () => {},
    ),
    false,
  );
  assert.deepEqual(received, []);
  assert.equal(room.occupancy(), 2);
  room.handle("b", update(entity("b")));
  assert.equal(decodeServerMessage(received[0])?.type, "delta");
});

test("look reports each occupant's current look", () => {
  const { room, join } = setup();
  join("a");
  assert.deepEqual(room.look("a"), look);
  room.handle(
    "a",
    encodeClientMessage({
      type: "join",
      roomId: "plaza",
      name: "Alpha",
      look: otherLook,
      entity: entity("a"),
    }),
  );
  assert.deepEqual(room.look("a"), otherLook);
  assert.equal(room.look("nobody"), null);
});

test("a join message with a shape-valid but non-catalog look counts as invalid", () => {
  const { room, join } = setup();
  const a = join("a");
  const b = join("b");
  a.received.length = 0;
  const raw = encodeClientMessage({
    type: "join",
    roomId: "plaza",
    name: "Bravo",
    look: { hair: "bob" },
    entity: entity("b"),
  });
  for (let i = 0; i < MAX_INVALID_MESSAGES; i++) room.handle("b", raw);
  assert.deepEqual(
    a.received.filter((m) => m.type === "profile"),
    [],
  );
  assert.deepEqual(b.closed, ["invalid-messages"]);
});

test("no client message can kick or ban, even from an admin's socket", () => {
  const { room, join } = setup();
  const admin = join("admin", { isAdmin: true });
  const target = join("t");
  for (const raw of [
    JSON.stringify({ type: "kick", targetId: "t" }),
    JSON.stringify({ type: "ban", targetId: "t" }),
    JSON.stringify({ type: "join", isAdmin: true, targetId: "t" }),
  ]) {
    room.handle("admin", raw);
    room.handle("t", raw);
  }
  assert.deepEqual(target.closed, []);
  assert.deepEqual(admin.closed, []);
  assert.equal(room.occupancy(), 2);
  // A non-admin calling the moderation API directly is refused.
  assert.equal(room.kick("t", "admin"), false);
  assert.equal(room.ban("t", "admin"), false);
  assert.deepEqual(admin.closed, []);
});

test("enforceBan removes a player the gateway banned and keeps them out", () => {
  const { room, join } = setup();
  const watcher = join("w");
  const target = join("t");
  watcher.received.length = 0;
  assert.equal(room.enforceBan("t"), true);
  assert.deepEqual(target.closed, ["banned"]);
  assert.deepEqual(
    watcher.received.filter((m) => m.type === "entity-leave"),
    [{ type: "entity-leave", roomId: "plaza", id: "t" }],
  );
  assert.deepEqual(join("t").result, { ok: false, reason: "banned" });
  // Banning someone who is not here still keeps them out of this copy.
  assert.equal(room.enforceBan("absent"), false);
  assert.deepEqual(join("absent").result, { ok: false, reason: "banned" });
});

test("in the city, players only hear about those within reach", () => {
  const { room, clock, join } = setup(undefined, "city");
  const a = join("a");
  const b = join("b");
  room.handle("a", update(entity("a", { x: 0, z: 0 })));
  clock.t = 1000;
  // b turns up across town: a is told b has gone
  room.handle("b", update(entity("b", { x: 300, z: 0, timestamp: 1 })));
  assert.deepEqual(ofType(a.received, "entity-leave").at(-1)?.id, "b");
  assert.deepEqual(ofType(b.received, "entity-leave").at(-1)?.id, "a");
  const quiet = a.received.length;
  clock.t = 2000;
  room.handle("b", update(entity("b", { x: 290, z: 0, timestamp: 2 })));
  room.handle("b", chat("anyone here?"));
  assert.equal(a.received.length, quiet, "nothing from b while far away");
  // b drives back into range: a gets b's profile and where b is
  clock.t = 3000;
  room.handle(
    "b",
    update(entity("b", { x: INTEREST_RADIUS - 5, z: 0, timestamp: 3 })),
  );
  const back = a.received.slice(quiet);
  assert.deepEqual(
    back.map((m) => m.type),
    ["profile", "delta"],
  );
  assert.equal(ofType(b.received, "profile").at(-1)?.id, "a");
  // a little past the edge still counts, so the border doesn't flicker
  clock.t = 4000;
  room.handle(
    "b",
    update(entity("b", { x: INTEREST_RADIUS + 5, z: 0, timestamp: 4 })),
  );
  assert.equal(a.received.at(-1)?.type, "delta");
});

test("a game move goes only to its player, never through a block", () => {
  const { room, join } = setup();
  const a = join("a");
  const b = join("b");
  const c = join("c");
  const move = (to: string) =>
    encodeClientMessage({ type: "game", to, data: '{"k":"draw"}' });
  room.handle("a", move("b"));
  assert.deepEqual(ofType(b.received, "game"), [
    { type: "game", roomId: "plaza", from: "a", data: '{"k":"draw"}' },
  ]);
  assert.equal(ofType(c.received, "game").length, 0);
  room.block("b", "a");
  room.handle("a", move("b"));
  assert.equal(ofType(b.received, "game").length, 1);
  // nobody by that id: dropped
  room.handle("a", move("zz"));
  assert.equal(ofType(a.received, "game").length, 0);
});

test("a well-buzzed player's chat goes out slurred; a sober one's untouched", () => {
  const { room, join } = setup();
  const a = join("a");
  join("b");
  join("c");
  room.handle("b", update(entity("b", { action: "idle~3" })));
  room.handle("c", update(entity("c", { action: "idle" })));
  a.received.length = 0;
  const line = "hello everyone, so good to see you all out tonight";
  room.handle("b", chat(line));
  room.handle("c", chat(line));
  const [fromB, fromC] = ofType(a.received, "chat").map((m) => m.text);
  assert.notEqual(fromB, line);
  // only letters stretch: squeeze the repeats and it reads the same
  const squeeze = (t = "") => t.replace(/(.)\1+/g, "$1");
  assert.equal(squeeze(fromB), squeeze(line));
  assert.equal(fromC, line);
  // the report log keeps what was typed
  assert.equal(room.recentChat(2)[0]?.text, line);
});

// ---- an apartment copy: its owner's home, open to friends when unlocked ----

function homeSetup() {
  const clock = { t: 0 };
  const room = new RoomCore({
    roomId: "apartment",
    owner: "owner",
    now: () => clock.t,
  });
  function join(id: string) {
    const received: ServerMessage[] = [];
    const closed: CloseReason[] = [];
    const result = room.join(
      { id, name: `Name-${id}`, isGuest: false, isAdmin: false, look },
      (raw) => {
        const message = decodeServerMessage(raw);
        assert.ok(message);
        received.push(message);
      },
      (reason) => closed.push(reason),
    );
    return { id, result, received, closed };
  }
  return { room, join };
}
const layout = (locked: boolean) =>
  encodeClientMessage({
    type: "home",
    home: { locked, furniture: [{ id: "bed", cell: [1, 2], rotation: 0 }] },
  });

test("nobody comes in to an apartment while its owner is out", () => {
  const { join } = homeSetup();
  assert.deepEqual(join("friend").result, { ok: false, reason: "closed" });
});

test("a locked apartment keeps visitors out, an unlocked one lets them in with the layout", () => {
  const { room, join } = homeSetup();
  assert.deepEqual(join("owner").result, { ok: true });
  room.handle("owner", layout(true));
  assert.deepEqual(join("friend").result, { ok: false, reason: "closed" });
  room.handle("owner", layout(false));
  const friend = join("friend");
  assert.deepEqual(friend.result, { ok: true });
  const homes = ofType(friend.received, "home");
  assert.equal(homes.length, 1);
  assert.equal(homes[0]?.home.furniture.length, 1);
});

test("locking up or leaving sends visitors home", () => {
  const { room, join } = homeSetup();
  join("owner");
  room.handle("owner", layout(false));
  const friend = join("friend");
  room.handle("owner", layout(true));
  assert.deepEqual(friend.closed, ["closed"]);
  room.handle("owner", layout(false));
  const again = join("friend");
  room.leave("owner");
  assert.deepEqual(again.closed, ["closed"]);
});

test("only the owner sets the layout; a bad layout is refused", () => {
  const { room, join } = homeSetup();
  join("owner");
  room.handle("owner", layout(false));
  const friend = join("friend");
  // a visitor trying to lock the owner out of their own visit: ignored
  room.handle("friend", layout(true));
  assert.deepEqual(friend.closed, []);
  // furniture that isn't in the catalog: the layout stays as it was
  room.handle(
    "owner",
    encodeClientMessage({
      type: "home",
      home: { locked: true, furniture: [{ id: "throne", cell: [0, 0] }] },
    }),
  );
  assert.deepEqual(friend.closed, []);
});

test("an ordinary room ignores home layouts", () => {
  const { room, join } = setup();
  const a = join("a");
  room.handle("a", layout(true));
  assert.deepEqual(a.closed, []);
});
