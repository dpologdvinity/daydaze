import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeEntityDelta,
  decodeEntityDelta,
  encodeClientMessage,
  decodeClientMessage,
  encodeServerMessage,
  decodeServerMessage,
  type EntityDelta,
  type ClientMessage,
  type ServerMessage,
} from "./networkProtocol.ts";

const entity: EntityDelta = {
  id: "a1",
  x: 120.4,
  y: 80.7,
  heading: "left",
  action: "idle",
  timestamp: 1728000000000,
};
const rounded = { ...entity, x: 120, y: 81 };

test("standard delta is under 40 UTF-8 bytes and rounds coordinates", () => {
  const raw = encodeEntityDelta(entity);
  assert.ok(new TextEncoder().encode(raw).length < 40);
  assert.deepEqual(decodeEntityDelta(raw), rounded);
  assert.deepEqual(
    decodeEntityDelta(encodeEntityDelta({ ...entity, heading: "right" })),
    { ...rounded, heading: "right" },
  );
});

test("delta decoder validates every field and never coerces corrupt values", () => {
  const valid: unknown[] = ["a1", 120, 81, 0, "idle", 1728000000000];
  for (const [index, values] of [
    [0, ["", "a".repeat(33), 12]],
    [1, [NaN, Infinity, -100001, 100001, "1"]],
    [2, [null, -Infinity, 100001]],
    [3, [-1, 2, "left", false]],
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
    y: 100000,
    heading: "right",
    action: "run",
    timestamp: 0,
  });
});

const clients: ClientMessage[] = [
  { type: "join", roomId: "downtown-plaza", entity: rounded },
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
    { type: "join", roomId: "", entity: rounded },
    { type: "join", roomId: "r".repeat(65), entity: rounded },
    { type: "update", entity: { ...rounded, heading: "up" } },
    { type: "chat", text: " " },
    { type: "chat", text: "x".repeat(281) },
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

test("decoded object packets are detached from caller-owned entities", () => {
  const raw = { type: "update", entity: { ...rounded } };
  const decoded = decodeClientMessage(raw);
  raw.entity.x = 999;
  assert.equal(decoded?.type === "update" && decoded.entity.x, 120);
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
