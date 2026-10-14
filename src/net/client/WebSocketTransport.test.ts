import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { FakeSocket, FakeTimers } from "./fakes.ts";
import {
  WebSocketTransport,
  type TransportStatus,
} from "./WebSocketTransport.ts";

const URL = "ws://test/ws/room/plaza/1";

function setup() {
  const timers = new FakeTimers();
  const transport = new WebSocketTransport({
    url: URL,
    WebSocket: FakeSocket,
    schedule: timers.schedule,
    random: () => 0.5,
  });
  const statuses: TransportStatus[] = [];
  const codes: number[] = [];
  const messages: string[] = [];
  let closes = 0;
  transport.onStatus((status) => statuses.push(status));
  transport.onCloseCode((code) => codes.push(code));
  transport.onMessage((message) => messages.push(message));
  transport.onClose(() => closes++);
  return { timers, transport, statuses, codes, messages, closes: () => closes };
}

beforeEach(() => {
  FakeSocket.instances = [];
});

test("connects at once and relays text frames while open", () => {
  const { transport, statuses, messages } = setup();
  assert.equal(transport.status(), "connecting");
  assert.equal(FakeSocket.latest().url, URL);
  assert.equal(transport.isConnected(), false);
  transport.send("dropped while connecting");
  FakeSocket.latest().open();
  assert.deepEqual(statuses, ["open"]);
  assert.equal(transport.isConnected(), true);
  transport.send("hello");
  assert.deepEqual(FakeSocket.latest().sent, ["hello"]);
  FakeSocket.latest().receive("frame");
  FakeSocket.latest().receive(new ArrayBuffer(4));
  assert.deepEqual(messages, ["frame"]);
});

test("an abnormal close reconnects with growing backoff that resets once open", () => {
  const { timers, transport, statuses, codes, closes } = setup();
  FakeSocket.latest().open();
  FakeSocket.latest().drop(1006);
  assert.equal(transport.status(), "reconnecting");
  assert.deepEqual(codes, [1006]);
  assert.equal(FakeSocket.instances.length, 1);
  timers.advance(999);
  assert.equal(FakeSocket.instances.length, 1);
  timers.advance(1);
  assert.equal(FakeSocket.instances.length, 2);
  assert.equal(FakeSocket.latest().url, URL);
  FakeSocket.latest().drop(1006);
  timers.advance(2000);
  FakeSocket.latest().drop(1006);
  timers.advance(4000);
  assert.deepEqual(timers.delays, [1000, 2000, 4000]);
  FakeSocket.latest().open();
  FakeSocket.latest().drop(4005);
  assert.equal(timers.delays.at(-1), 1000);
  assert.equal(closes(), 0);
  // Repeated failures stay "reconnecting" instead of flickering.
  assert.deepEqual(statuses, ["open", "reconnecting", "open", "reconnecting"]);
});

test("full, banned, replaced, kicked and invalid closes are final", () => {
  for (const code of [1000, 4000, 4001, 4002, 4003, 4004, 4009]) {
    FakeSocket.instances = [];
    const { timers, transport, codes, closes } = setup();
    FakeSocket.latest().open();
    FakeSocket.latest().drop(code);
    assert.equal(transport.status(), "closed", `${code}`);
    assert.deepEqual(codes, [code]);
    assert.equal(closes(), 1);
    assert.equal(timers.pending(), 0);
  }
});

test("a refused connection before open also reconnects", () => {
  const { timers, transport } = setup();
  FakeSocket.latest().drop(1006);
  assert.equal(transport.status(), "reconnecting");
  timers.advance(1000);
  assert.equal(FakeSocket.instances.length, 2);
});

test("close() stops everything once, including a pending reconnect", () => {
  const { timers, transport, statuses, closes } = setup();
  FakeSocket.latest().open();
  FakeSocket.latest().drop(1006);
  transport.close();
  transport.close();
  assert.equal(transport.status(), "closed");
  assert.equal(closes(), 1);
  timers.advance(60_000);
  assert.equal(FakeSocket.instances.length, 1);
  assert.equal(statuses.at(-1), "closed");

  FakeSocket.instances = [];
  const open = setup();
  FakeSocket.latest().open();
  open.transport.close();
  assert.equal(FakeSocket.latest().closedWith, 1000);
  assert.equal(open.closes(), 1);
  assert.equal(open.timers.pending(), 0);
});

test("events from a replaced socket are ignored", () => {
  const { timers, messages, transport } = setup();
  const first = FakeSocket.latest();
  first.open();
  first.drop(1006);
  timers.advance(1000);
  FakeSocket.latest().open();
  first.receive("stale");
  first.drop(4001);
  assert.deepEqual(messages, []);
  assert.equal(transport.status(), "open");
});

test("a throwing socket send is swallowed", () => {
  const { transport } = setup();
  const socket = FakeSocket.latest();
  socket.open();
  socket.readyState = 2;
  assert.doesNotThrow(() => transport.send("x"));
});
