import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeEntityDelta,
  decodeEntityDelta,
  encodeClientMessage,
  decodeClientMessage,
  encodeServerMessage,
  decodeServerMessage,
  isLookShape,
  type EntityDelta,
  type ClientMessage,
  type ServerMessage,
} from "./networkProtocol.ts";

const entity: EntityDelta = {
  id: "a1",
  x: 12.344,
  z: -8.067,
  yaw: 1.57079,
  action: "idle",
  timestamp: 1728000000000,
};
const rounded = { ...entity, x: 12.34, z: -8.07, yaw: 1.571 };
const look = { hair: "bob", top: "tee-pink" };

test("standard delta is under 48 UTF-8 bytes and rounds to centimetres and milliradians", () => {
  const raw = encodeEntityDelta(entity);
  assert.ok(new TextEncoder().encode(raw).length < 48);
  assert.deepEqual(decodeEntityDelta(raw), rounded);
});

test("delta decoder validates every field and never coerces corrupt values", () => {
  const valid: unknown[] = ["a1", 12, -8, 0, "idle", 1728000000000];
  for (const [index, values] of [
    [0, ["", "a".repeat(33), 12]],
    [1, [NaN, Infinity, -100001, 100001, "1"]],
    [2, [null, -Infinity, 100001]],
    [3, [NaN, Infinity, -Infinity, "0", null]],
    [4, ["", "a".repeat(25), {}]],
    [5, [NaN, Infinity, -1, "123"]],
  ] as [number, unknown[]][]) {
    for (const value of values) {
      const tuple = [...valid];
      tuple[index] = value;
      assert.equal(decodeEntityDelta(tuple), null);
    }
  }
  for (const raw of [null, undefined, {}, "{", "null", [], [...valid, 1]])
    assert.equal(decodeEntityDelta(raw), null);
  assert.deepEqual(decodeEntityDelta(["a", -100000, 100000, 1, "run", 0]), {
    id: "a",
    x: -100000,
    z: 100000,
    yaw: 1,
    action: "run",
    timestamp: 0,
  });
});

test("delta decoder normalises yaw into (-π, π]", () => {
  const yawOf = (yaw: number) =>
    decodeEntityDelta({ ...rounded, yaw })?.yaw ?? NaN;
  assert.equal(yawOf(Math.PI), Math.PI);
  assert.equal(yawOf(-Math.PI), Math.PI);
  assert.equal(yawOf(0), 0);
  assert.ok(Math.abs(yawOf(3 * Math.PI) - Math.PI) < 1e-9);
  assert.ok(Math.abs(yawOf(-Math.PI / 2 + 4 * Math.PI) + Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(yawOf(4) - (4 - 2 * Math.PI)) < 1e-9);
  for (const yaw of [1e300, -1e300, 7, -7]) {
    const value = yawOf(yaw);
    assert.ok(value > -Math.PI && value <= Math.PI, `${yaw} -> ${value}`);
  }
});

test("look shapes are plain string records with bounded keys and values", () => {
  assert.equal(isLookShape(look), true);
  assert.equal(isLookShape({}), true);
  assert.equal(isLookShape(Object.create(null)), true);
  const sixteen = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`k${i}`, "v"]),
  );
  assert.equal(isLookShape(sixteen), true);
  for (const value of [
    null,
    "bob",
    [],
    ["bob"],
    new Date(),
    { hair: 1 },
    { hair: "x".repeat(33) },
    { ["k".repeat(33)]: "v" },
    { ...sixteen, extra: "v" },
  ])
    assert.equal(isLookShape(value), false);
});

const clients: ClientMessage[] = [
  {
    type: "join",
    roomId: "downtown-plaza",
    name: "MangoGuest4821",
    look,
    entity: rounded,
  },
  { type: "leave" },
  { type: "update", entity: rounded },
  { type: "chat", text: "Hello 🦁" },
  { type: "emote", emote: "wave" },
];
const servers: ServerMessage[] = [
  { type: "snapshot", roomId: "downtown-plaza", entities: [rounded] },
  { type: "delta", roomId: "downtown-plaza", entity: rounded },
  { type: "entity-leave", roomId: "downtown-plaza", id: "a1" },
  { type: "chat", roomId: "downtown-plaza", id: "a1", text: "Hello 🦁" },
  { type: "emote", roomId: "downtown-plaza", id: "a1", emote: "wave" },
  { type: "occupancy", roomId: "downtown-plaza", count: 1 },
  {
    type: "profile",
    roomId: "downtown-plaza",
    id: "a1",
    name: "MangoGuest4821",
    look,
  },
];

test("every directional message round trips through JSON framing", () => {
  for (const message of clients) {
    assert.deepEqual(
      decodeClientMessage(encodeClientMessage(message)),
      message,
    );
    assert.deepEqual(decodeClientMessage(message), message);
  }
  for (const message of servers) {
    assert.deepEqual(
      decodeServerMessage(encodeServerMessage(message)),
      message,
    );
    assert.deepEqual(decodeServerMessage(message), message);
  }
});

test("frames reject unknown types, invalid fields, oversized packets and duplicate snapshot IDs", () => {
  for (const raw of [
    null,
    1,
    [],
    "{",
    "x".repeat(65537),
    { type: "unknown" },
    { ...clients[0], roomId: "" },
    { ...clients[0], roomId: "r".repeat(65) },
    { ...clients[0], name: "" },
    { ...clients[0], name: "n".repeat(33) },
    { ...clients[0], look: { hair: 1 } },
    { type: "join", roomId: "r", entity: rounded },
    { type: "update", entity: { ...rounded, yaw: "up" } },
    {
      type: "update",
      entity: {
        id: "a1",
        x: 1,
        y: 2,
        heading: "left",
        action: "idle",
        timestamp: 0,
      },
    },
    { type: "chat", text: " " },
    { type: "chat", text: "x".repeat(121) },
    { type: "emote", emote: "x".repeat(25) },
  ])
    assert.equal(decodeClientMessage(raw), null);
  for (const raw of [
    { type: "snapshot", roomId: "r", entities: [rounded, rounded] },
    { type: "snapshot", roomId: "r", entities: [null] },
    { type: "snapshot", roomId: "r", entities: Array(513).fill(rounded) },
    { type: "occupancy", roomId: "r", count: -1 },
    { type: "occupancy", roomId: "r", count: 1.5 },
    { type: "entity-leave", roomId: "r", id: "" },
    { type: "chat", roomId: "r", id: "a1", text: "" },
    { type: "emote", roomId: "r", id: "a1", emote: 1 },
    { type: "chat", roomId: "r", id: "a1", text: "x".repeat(121) },
    { type: "profile", roomId: "r", id: "", name: "n", look },
    { type: "profile", roomId: "r", id: "a1", name: " ", look },
    { type: "profile", roomId: "r", id: "a1", name: "n", look: "bob" },
  ])
    assert.equal(decodeServerMessage(raw), null);
  assert.equal(decodeClientMessage(servers[0]), null);
  assert.equal(decodeServerMessage(clients[0]), null);
});

test("hostile getters, proxies and cyclic packets cannot escape decoder", () => {
  const hostile = new Proxy(
    {},
    {
      get() {
        throw new Error("hostile");
      },
    },
  );
  const cyclic: Record<string, unknown> = { type: "update" };
  cyclic.entity = cyclic;
  for (const raw of [
    hostile,
    cyclic,
    {
      get type() {
        throw new Error("getter");
      },
    },
  ]) {
    assert.equal(decodeEntityDelta(raw), null);
    assert.equal(decodeClientMessage(raw), null);
    assert.equal(decodeServerMessage(raw), null);
  }
});

test("decoded object packets are detached from caller-owned entities and looks", () => {
  const raw = { type: "update", entity: { ...rounded } };
  const decoded = decodeClientMessage(raw);
  raw.entity.x = 999;
  assert.equal(decoded?.type === "update" && decoded.entity.x, 12.34);
  const profile = { ...servers[6], look: { ...look } };
  const decodedProfile = decodeServerMessage(profile);
  profile.look.hair = "mohawk";
  assert.equal(
    decodedProfile?.type === "profile" && decodedProfile.look.hair,
    "bob",
  );
});

test("chat accepts exactly 120 characters", () => {
  const text = "x".repeat(120);
  assert.deepEqual(decodeClientMessage({ type: "chat", text }), {
    type: "chat",
    text,
  });
});

test("packet size limits count UTF-8 bytes rather than JavaScript code units", () => {
  const raw = JSON.stringify({ type: "leave", padding: "€".repeat(22000) });
  assert.ok(raw.length < 65536);
  assert.ok(new TextEncoder().encode(raw).length > 65536);
  assert.equal(decodeClientMessage(raw), null);
  assert.equal(
    decodeServerMessage(
      JSON.stringify({
        type: "occupancy",
        roomId: "r",
        count: 1,
        padding: "€".repeat(22000),
      }),
    ),
    null,
  );
});
