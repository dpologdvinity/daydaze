import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SpatialRoomServer,
  createLocalLoopbackPair,
  interpolateEntityState,
  type NetworkTransport,
} from "./roomNetworkSync.ts";
import {
  encodeClientMessage,
  decodeServerMessage,
  MAX_ROOM_ENTITIES,
  type EntityDelta,
  type ServerMessage,
} from "./networkProtocol.ts";

function entity(id: string, overrides: Partial<EntityDelta> = {}): EntityDelta {
  return {
    id,
    x: 0,
    y: 0,
    heading: "right",
    action: "idle",
    timestamp: 0,
    ...overrides,
  };
}

function connect(server: SpatialRoomServer, clientId: string) {
  const { clientTransport } = createLocalLoopbackPair(server, clientId);
  const received: ServerMessage[] = [];
  clientTransport.onMessage((raw) => {
    const message = decodeServerMessage(raw);
    if (message) received.push(message);
  });
  return { clientTransport, received };
}

function join(
  clientTransport: NetworkTransport,
  roomId: string,
  ent: EntityDelta,
) {
  clientTransport.send(
    encodeClientMessage({ type: "join", roomId, entity: ent }),
  );
}

test("joining a room sends a snapshot of existing occupants to the joining client", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  a.received.length = 0;

  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b", { x: 10 }));

  const snapshot = b.received.find((m) => m.type === "snapshot");
  assert.ok(snapshot && snapshot.type === "snapshot");
  assert.deepEqual(
    snapshot.entities.map((e) => e.id),
    ["a"],
  );
});

test("snapshot excludes the joining client's own entity even when entity id differs from client id", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("avatar-a"));

  const snapshot = a.received.find((m) => m.type === "snapshot");
  assert.ok(snapshot && snapshot.type === "snapshot");
  assert.deepEqual(snapshot.entities, []);
});

test("joining a room broadcasts a delta to existing occupants but not to self", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  a.received.length = 0;

  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b"));

  const deltaToA = a.received.find((m) => m.type === "delta");
  assert.ok(
    deltaToA && deltaToA.type === "delta" && deltaToA.entity.id === "b",
  );
  assert.equal(
    b.received.some((m) => m.type === "delta" && m.entity.id === "b"),
    false,
  );
});

test("room occupancy reflects joins and leaves", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  assert.equal(server.getRoomOccupancy("plaza"), 1);

  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b"));
  assert.equal(server.getRoomOccupancy("plaza"), 2);

  b.clientTransport.send(encodeClientMessage({ type: "leave" }));
  assert.equal(server.getRoomOccupancy("plaza"), 1);
});

test("leaving a room broadcasts entity-leave and removes the entity from room entities", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b"));
  a.received.length = 0;

  b.clientTransport.send(encodeClientMessage({ type: "leave" }));

  const leaveMsg = a.received.find((m) => m.type === "entity-leave");
  assert.ok(
    leaveMsg && leaveMsg.type === "entity-leave" && leaveMsg.id === "b",
  );
  assert.deepEqual(
    server.getRoomEntities("plaza").map((e) => e.id),
    ["a"],
  );
});

test("disconnecting a client that never joined a room is a no-op", () => {
  const server = new SpatialRoomServer();
  connect(server, "a");

  assert.doesNotThrow(() => server.disconnectClient("a"));
  assert.equal(server.getRoomOccupancy("plaza"), 0);
});

test("disconnecting a client is treated as leaving its room without ghost entities", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b"));

  server.disconnectClient("b");

  assert.deepEqual(
    server.getRoomEntities("plaza").map((e) => e.id),
    ["a"],
  );
  assert.equal(server.getRoomOccupancy("plaza"), 1);
});

test("joining a new room leaves the prior room and notifies its occupants", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b"));
  a.received.length = 0;

  join(b.clientTransport, "cave", entity("b"));

  const leaveMsg = a.received.find((m) => m.type === "entity-leave");
  assert.ok(
    leaveMsg && leaveMsg.type === "entity-leave" && leaveMsg.id === "b",
  );
  assert.deepEqual(
    server.getRoomEntities("plaza").map((e) => e.id),
    ["a"],
  );
  assert.deepEqual(
    server.getRoomEntities("cave").map((e) => e.id),
    ["b"],
  );
});

test("update broadcasts a delta to other occupants in the same room only", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b"));
  a.received.length = 0;
  b.received.length = 0;

  b.clientTransport.send(
    encodeClientMessage({ type: "update", entity: entity("b", { x: 42 }) }),
  );

  const deltaToA = a.received.find((m) => m.type === "delta");
  assert.ok(deltaToA && deltaToA.type === "delta" && deltaToA.entity.x === 42);
  assert.equal(b.received.length, 0);
  assert.deepEqual(
    server.getRoomEntities("plaza").find((e) => e.id === "b")?.x,
    42,
  );
});

test("spatial isolation: traffic in room A never reaches room B", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "roomA", entity("a"));
  const b = connect(server, "b");
  join(b.clientTransport, "roomB", entity("b"));
  a.received.length = 0;
  b.received.length = 0;

  a.clientTransport.send(
    encodeClientMessage({ type: "update", entity: entity("a", { x: 99 }) }),
  );
  a.clientTransport.send(encodeClientMessage({ type: "chat", text: "hello" }));
  a.clientTransport.send(encodeClientMessage({ type: "emote", emote: "wave" }));

  assert.equal(b.received.length, 0);
  assert.equal(server.getRoomOccupancy("roomA"), 1);
  assert.equal(server.getRoomOccupancy("roomB"), 1);
});

test("chat is broadcast to other occupants in the same room, not to self", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b"));
  a.received.length = 0;
  b.received.length = 0;

  a.clientTransport.send(
    encodeClientMessage({ type: "chat", text: "hi there" }),
  );

  const chatToB = b.received.find((m) => m.type === "chat");
  assert.ok(
    chatToB &&
      chatToB.type === "chat" &&
      chatToB.id === "a" &&
      chatToB.text === "hi there",
  );
  assert.equal(a.received.length, 0);
});

test("emote is broadcast to other occupants in the same room, not to self", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  const b = connect(server, "b");
  join(b.clientTransport, "plaza", entity("b"));
  a.received.length = 0;
  b.received.length = 0;

  a.clientTransport.send(encodeClientMessage({ type: "emote", emote: "wave" }));

  const emoteToB = b.received.find((m) => m.type === "emote");
  assert.ok(
    emoteToB &&
      emoteToB.type === "emote" &&
      emoteToB.id === "a" &&
      emoteToB.emote === "wave",
  );
  assert.equal(a.received.length, 0);
});

test("interpolateEntityState linearly interpolates x and y between prev and next", () => {
  const prev = entity("a", { x: 0, y: 0, heading: "right", timestamp: 0 });
  const next = entity("a", {
    x: 100,
    y: 200,
    heading: "right",
    timestamp: 1000,
  });

  const mid = interpolateEntityState(prev, next, 500);

  assert.equal(mid.x, 50);
  assert.equal(mid.y, 100);
  assert.equal(mid.heading, "right");
});

test("interpolateEntityState determines heading from movement direction", () => {
  const prev = entity("a", { x: 100, y: 0, heading: "right", timestamp: 0 });
  const next = entity("a", { x: 0, y: 0, heading: "right", timestamp: 1000 });

  const mid = interpolateEntityState(prev, next, 500);

  assert.equal(mid.heading, "left");
});

test("interpolateEntityState clamps to prev at or before prev timestamp", () => {
  const prev = entity("a", { x: 0, y: 0, timestamp: 1000 });
  const next = entity("a", { x: 100, y: 100, timestamp: 2000 });

  const result = interpolateEntityState(prev, next, 500);

  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
});

test("interpolateEntityState extrapolates beyond next timestamp within the bounded window", () => {
  const prev = entity("a", { x: 0, y: 0, timestamp: 0 });
  const next = entity("a", { x: 100, y: 0, timestamp: 1000 });

  const result = interpolateEntityState(prev, next, 1100);

  assert.ok(result.x > 100);
  assert.ok(result.x <= 120);
});

test("interpolateEntityState caps extrapolation at the max extrapolation window", () => {
  const prev = entity("a", { x: 0, y: 0, timestamp: 0 });
  const next = entity("a", { x: 100, y: 0, timestamp: 1000 });

  const withinCap = interpolateEntityState(prev, next, 1200);
  const beyondCap = interpolateEntityState(prev, next, 5000);

  assert.deepEqual(withinCap, beyondCap);
});

test("createLocalLoopbackPair delivers client sends to the server and reports connection state", () => {
  const server = new SpatialRoomServer();
  const { clientTransport } = createLocalLoopbackPair(server, "a");

  assert.equal(clientTransport.isConnected(), true);
  join(clientTransport, "plaza", entity("a"));
  assert.equal(server.getRoomOccupancy("plaza"), 1);

  clientTransport.close();
  assert.equal(clientTransport.isConnected(), false);
  assert.equal(server.getRoomOccupancy("plaza"), 0);
});

test("closing either endpoint removes occupants and invokes client close once", () => {
  for (const closeFromServer of [false, true]) {
    const server = new SpatialRoomServer();
    const a = connect(server, "a");
    const b = connect(server, "b");
    join(a.clientTransport, "plaza", entity("avatar-a"));
    join(b.clientTransport, "plaza", entity("avatar-b"));
    a.received.length = 0;
    let closed = 0;
    b.clientTransport.onClose(() => closed++);
    if (closeFromServer) server.disconnectClient("b");
    else b.clientTransport.close();
    b.clientTransport.close();
    assert.equal(closed, 1);
    assert.equal(b.clientTransport.isConnected(), false);
    assert.equal(server.getRoomOccupancy("plaza"), 1);
    assert.deepEqual(a.received, [
      { type: "entity-leave", roomId: "plaza", id: "avatar-b" },
      { type: "occupancy", roomId: "plaza", count: 1 },
    ]);
  }
});

test("reconnect replaces the old session without ghost entities or stale callbacks", () => {
  const server = new SpatialRoomServer();
  let messageHandler: (raw: string) => void = () => {};
  let closeHandler: () => void = () => {};
  const oldTransport: NetworkTransport = {
    send() {},
    onMessage(handler) {
      messageHandler = handler;
    },
    onClose(handler) {
      closeHandler = handler;
    },
    close() {
      closeHandler();
    },
    isConnected() {
      return true;
    },
  };
  server.connectClient("a", oldTransport);
  messageHandler(
    encodeClientMessage({
      type: "join",
      roomId: "plaza",
      entity: entity("old"),
    }),
  );
  const replacement = connect(server, "a");
  join(replacement.clientTransport, "cave", entity("new"));
  messageHandler(
    encodeClientMessage({
      type: "join",
      roomId: "plaza",
      entity: entity("stale"),
    }),
  );
  closeHandler();
  assert.equal(server.getRoomOccupancy("plaza"), 0);
  assert.deepEqual(server.getRoomEntities("cave"), [entity("new")]);
});

test("invalid identities, malformed packets, spoofed updates and stale timestamps cannot change state", () => {
  const server = new SpatialRoomServer();
  assert.throws(() => connect(server, " "), TypeError);
  const a = connect(server, "a");
  const b = connect(server, "b");
  join(a.clientTransport, "plaza", entity("avatar-a"));
  join(b.clientTransport, "plaza", entity("avatar-b", { timestamp: 100 }));
  a.received.length = 0;
  for (const raw of [
    "{",
    JSON.stringify({
      type: "update",
      entity: { ...entity("avatar-b"), x: "12" },
    }),
    encodeClientMessage({
      type: "update",
      entity: entity("avatar-a", { x: 99, timestamp: 200 }),
    }),
    encodeClientMessage({
      type: "update",
      entity: entity("avatar-b", { x: 99, timestamp: 99 }),
    }),
    encodeClientMessage({
      type: "join",
      roomId: "plaza",
      entity: entity("avatar-a"),
    }),
  ])
    b.clientTransport.send(raw);
  assert.equal(a.received.length, 0);
  assert.deepEqual(server.getRoomEntities("plaza"), [
    entity("avatar-a"),
    entity("avatar-b", { timestamp: 100 }),
  ]);
  const exported = server.getRoomEntities("plaza");
  exported[0].id = "mutated";
  assert.equal(server.getRoomEntities("plaza")[0].id, "avatar-a");
});

test("chat and emote broadcasts identify the avatar rather than its connection", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  const b = connect(server, "b");
  join(a.clientTransport, "plaza", entity("avatar-a"));
  join(b.clientTransport, "plaza", entity("avatar-b"));
  a.received.length = 0;
  b.clientTransport.send(encodeClientMessage({ type: "chat", text: "hi" }));
  b.clientTransport.send(encodeClientMessage({ type: "emote", emote: "wave" }));
  assert.deepEqual(a.received, [
    { type: "chat", roomId: "plaza", id: "avatar-b", text: "hi" },
    { type: "emote", roomId: "plaza", id: "avatar-b", emote: "wave" },
  ]);
});

test("full rooms reject admission without evicting the client from its prior room", () => {
  const server = new SpatialRoomServer();
  for (let i = 0; i < MAX_ROOM_ENTITIES; i++) {
    const occupant = connect(server, `c${i}`);
    join(occupant.clientTransport, "full", entity(`e${i}`));
  }
  const a = connect(server, "a");
  join(a.clientTransport, "cave", entity("a"));
  join(a.clientTransport, "full", entity("a"));
  assert.equal(server.getRoomOccupancy("full"), MAX_ROOM_ENTITIES);
  assert.equal(server.getRoomOccupancy("cave"), 1);
});

test("interpolation handles duplicate and reversed timestamps without jumping to stale state", () => {
  const prev = entity("a", { x: 20, timestamp: 100 });
  const duplicate = entity("a", { x: 30, timestamp: 100 });
  assert.equal(interpolateEntityState(prev, duplicate, 100).x, 30);
  const stale = entity("a", { x: 10, timestamp: 50 });
  assert.equal(interpolateEntityState(prev, stale, 150).x, 20);
});

test("dead reckoning is exact at 12–15Hz and capped by vector length", () => {
  for (const hz of [12, 15]) {
    const span = 1000 / hz;
    const prev = entity("a");
    const next = entity("a", { x: 3, y: 4, timestamp: span });
    const midpoint = interpolateEntityState(prev, next, span / 2);
    assert.equal(midpoint.x, 1.5);
    assert.equal(midpoint.y, 2);
    const predicted = interpolateEntityState(prev, next, span * 2);
    assert.equal(predicted.x, 6);
    assert.equal(predicted.y, 8);
  }
  const next = entity("a", { x: 3, y: 4, timestamp: 1 });
  const capped = interpolateEntityState(entity("a"), next, 201);
  assert.equal(capped.x, 15);
  assert.equal(capped.y, 20);
});

test("tiny timestamp spans and nonfinite target times cannot produce NaN coordinates", () => {
  const next = entity("a", { x: 1, timestamp: Number.MIN_VALUE });
  const result = interpolateEntityState(entity("a"), next, 100);
  assert.equal(result.x, 21);
  assert.equal(result.y, 0);
  assert.throws(
    () => interpolateEntityState(entity("a"), next, NaN),
    TypeError,
  );
});

test("closing during the join snapshot cannot broadcast a ghost delta", () => {
  const server = new SpatialRoomServer();
  const a = connect(server, "a");
  join(a.clientTransport, "plaza", entity("a"));
  a.received.length = 0;
  const { clientTransport } = createLocalLoopbackPair(server, "b");
  clientTransport.onMessage((raw) => {
    if (decodeServerMessage(raw)?.type === "snapshot") clientTransport.close();
  });
  join(clientTransport, "plaza", entity("b"));
  assert.equal(server.getRoomOccupancy("plaza"), 1);
  assert.equal(
    a.received.some((message) => message.type === "delta"),
    false,
  );
});

test("a failed transport send disconnects that client while room broadcasts continue", () => {
  const server = new SpatialRoomServer();
  let handler: (raw: string) => void = () => {};
  let connected = true;
  let fail = false;
  const transport: NetworkTransport = {
    send() {
      if (fail) throw new Error("closed socket");
    },
    onMessage(callback) {
      handler = callback;
    },
    onClose() {},
    close() {
      connected = false;
    },
    isConnected() {
      return connected;
    },
  };
  server.connectClient("broken", transport);
  handler(
    encodeClientMessage({
      type: "join",
      roomId: "plaza",
      entity: entity("broken"),
    }),
  );
  const a = connect(server, "a");
  const b = connect(server, "b");
  join(a.clientTransport, "plaza", entity("a"));
  join(b.clientTransport, "plaza", entity("b"));
  b.received.length = 0;
  fail = true;
  assert.doesNotThrow(() =>
    a.clientTransport.send(
      encodeClientMessage({
        type: "update",
        entity: entity("a", { x: 42 }),
      }),
    ),
  );
  assert.equal(connected, false);
  assert.equal(server.getRoomOccupancy("plaza"), 2);
  assert.ok(
    b.received.some(
      (message) => message.type === "delta" && message.entity.x === 42,
    ),
  );
});
