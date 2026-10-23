import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOOK } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import {
  decodeClientMessage,
  encodeServerMessage,
  type ClientMessage,
  type EntityDelta,
  type ServerMessage,
} from "../networkProtocol.ts";
import { createApi, type Fetch } from "./api.ts";
import { FakeSocket, FakeTimers } from "./fakes.ts";
import {
  MOVE_INTERVAL_MS,
  OnlineSession,
  type SessionStatus,
} from "./OnlineSession.ts";
import { WebSocketTransport } from "./WebSocketTransport.ts";

const me = {
  id: "g_me",
  name: "MangoGuest1000",
  isGuest: true,
  isAdmin: false,
};
const other = { id: "g_other", name: "PeachyBloom2000" };
const otherLook = { ...DEFAULT_LOOK, hairStyle: "buns" };

type Routes = Record<string, () => Response | Promise<Response>>;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const listing = (pick = 1, copies = [{ copy: 1, count: 0, full: false }]) =>
  json({ copies, pick });

function setup(routes: Routes = {}) {
  const timers = new FakeTimers();
  const fetch: Fetch = async (url, init) => {
    const route = routes[`${init.method} ${url}`];
    if (route) return route();
    if (url === "/api/me") return json(me);
    if (url.startsWith("/api/rooms/")) return listing();
    return json({ error: "not-found" }, 404);
  };
  const session = new OnlineSession({
    api: createApi({ fetch }),
    wsBaseUrl: "ws://game",
    openTransport: (url) =>
      new WebSocketTransport({
        url,
        WebSocket: FakeSocket,
        schedule: timers.schedule,
        random: () => 0.5,
      }),
    now: () => timers.now,
    schedule: timers.schedule,
  });
  const statuses: SessionStatus[] = [];
  session.on("status", (status) => statuses.push(status));
  return { session, timers, statuses };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const sentBy = (socket: FakeSocket): ClientMessage[] =>
  socket.sent.flatMap((raw) => {
    const message = decodeClientMessage(raw);
    return message ? [message] : [];
  });
const serve = (socket: FakeSocket, message: ServerMessage) =>
  socket.receive(encodeServerMessage(message));
const snapshot = (entities: EntityDelta[] = []): ServerMessage => ({
  type: "snapshot",
  roomId: "plaza",
  entities,
});
const entity = (x: number, timestamp = 0) => ({
  id: other.id,
  x,
  z: 0,
  yaw: 0,
  action: "walk",
  timestamp,
});

/** Starts, joins the plaza and answers with a snapshot. */
async function joined(routes?: Routes) {
  const context = setup(routes);
  await context.session.start();
  const join = context.session.joinRoom("plaza", DEFAULT_LOOK);
  await flush();
  const socket = FakeSocket.latest();
  socket.open();
  serve(socket, snapshot());
  assert.deepEqual(await join, { ok: true, copy: 1 });
  return { ...context, socket };
}

beforeEach(() => {
  FakeSocket.instances = [];
});

test("start uses the existing session, else becomes a guest", async () => {
  const signedIn = setup();
  assert.deepEqual(await signedIn.session.start(), me);
  assert.equal(signedIn.session.status(), "ready");

  const guest = { ...me, id: "g_new" };
  const fresh = setup({
    "GET /api/me": () => json({ error: "no-session" }, 401),
    "POST /api/guest": () => json(guest, 201),
  });
  assert.deepEqual(await fresh.session.start(), guest);
  assert.deepEqual(fresh.session.identity(), guest);
});

test("when the server is unreachable the session goes offline", async () => {
  const down = () => {
    throw new TypeError("fetch failed");
  };
  const { session, statuses } = setup({
    "GET /api/me": down,
    "POST /api/guest": down,
  });
  assert.equal(await session.start(), null);
  assert.deepEqual(statuses, ["offline"]);
  assert.deepEqual(await session.joinRoom("plaza", DEFAULT_LOOK), {
    ok: false,
    reason: "offline",
  });
  assert.equal(FakeSocket.instances.length, 0);
});

test("joining connects to the picked copy with the look and announces the spawn", async () => {
  const { session, socket, statuses } = await joined();
  const url = new URL(socket.url);
  assert.equal(url.origin + url.pathname, "ws://game/ws/room/plaza/1");
  assert.deepEqual(
    JSON.parse(url.searchParams.get("look") ?? ""),
    DEFAULT_LOOK,
  );
  const [join] = sentBy(socket);
  assert.equal(join.type, "join");
  assert.ok(join.type === "join");
  assert.equal(join.entity.id, me.id);
  assert.deepEqual(
    [join.entity.x, join.entity.z],
    [...ROOMS.plaza.spawn.position],
  );
  assert.deepEqual(join.look, DEFAULT_LOOK);
  assert.equal(session.status(), "open");
  assert.deepEqual(statuses, ["ready", "connecting", "open"]);
  assert.equal(session.room()?.copy, 1);
});

test("a full copy (4001) moves on to the next copy with space", async () => {
  const { session } = setup({
    "GET /api/rooms/plaza": () =>
      listing(2, [
        { copy: 1, count: 60, full: true },
        { copy: 2, count: 59, full: false },
        { copy: 3, count: 10, full: false },
      ]),
  });
  await session.start();
  const join = session.joinRoom("plaza", DEFAULT_LOOK);
  await flush();
  assert.match(FakeSocket.latest().url, /\/plaza\/2\?/);
  FakeSocket.latest().open();
  FakeSocket.latest().drop(4001);
  await flush();
  assert.match(FakeSocket.latest().url, /\/plaza\/3\?/);
  FakeSocket.latest().open();
  FakeSocket.latest().drop(4001);
  await flush();
  // Every listed copy filled up meanwhile: open a new one.
  assert.match(FakeSocket.latest().url, /\/plaza\/4\?/);
  FakeSocket.latest().open();
  serve(FakeSocket.latest(), snapshot());
  assert.deepEqual(await join, { ok: true, copy: 4 });
});

test("banned and invalid closes end the join with a reason", async () => {
  for (const [code, reason] of [
    [4003, "banned"],
    [4000, "invalid"],
  ] as const) {
    FakeSocket.instances = [];
    const { session } = setup();
    await session.start();
    const join = session.joinRoom("plaza", DEFAULT_LOOK);
    await flush();
    FakeSocket.latest().open();
    FakeSocket.latest().drop(code);
    assert.deepEqual(await join, { ok: false, reason });
    assert.equal(session.status(), "closed");
  }
});

test("remote players follow snapshots, profiles, deltas and leaves", async () => {
  const { session, socket, timers } = await joined();
  const events: string[] = [];
  session.on("snapshot", () => events.push("snapshot"));
  session.on("profile", (player) => events.push(`profile:${player.name}`));
  session.on("delta", (player) => events.push(`delta:${player.next?.x}`));
  session.on("leave", (id) => events.push(`leave:${id}`));
  session.on("chat", ({ name, text }) => events.push(`chat:${name}:${text}`));
  session.on("emote", ({ id, emote }) => events.push(`emote:${id}:${emote}`));

  serve(socket, snapshot([entity(0, 5)]));
  serve(socket, {
    type: "profile",
    roomId: "plaza",
    ...other,
    look: otherLook,
  });
  timers.advance(100);
  serve(socket, { type: "delta", roomId: "plaza", entity: entity(10, 9) });
  // Our own echo and corrupt frames are ignored.
  serve(socket, {
    type: "delta",
    roomId: "plaza",
    entity: { ...entity(99), id: me.id },
  });
  socket.receive("{not json");
  serve(socket, { type: "chat", roomId: "plaza", id: other.id, text: "hey" });
  serve(socket, {
    type: "emote",
    roomId: "plaza",
    id: other.id,
    emote: "wave",
  });

  const player = session.remotePlayers.get(other.id);
  assert.equal(player?.name, other.name);
  assert.deepEqual(player?.look, otherLook);
  assert.equal(session.remotePlayers.has(me.id), false);
  // Rendered 100 ms behind, halfway between the two received positions.
  assert.equal(session.sample(other.id, 150)?.x, 5);
  assert.equal(session.sample(other.id, 1000)?.x, 10);

  serve(socket, { type: "entity-leave", roomId: "plaza", id: other.id });
  assert.equal(session.remotePlayers.size, 0);
  assert.equal(session.sample(other.id), null);
  assert.deepEqual(events, [
    "snapshot",
    `profile:${other.name}`,
    "delta:10",
    `chat:${other.name}:hey`,
    `emote:${other.id}:wave`,
    `leave:${other.id}`,
  ]);
});

test("a profile with a look outside the catalog keeps the name but not the look", async () => {
  const { session, socket } = await joined();
  serve(socket, {
    type: "profile",
    roomId: "plaza",
    ...other,
    look: { hair: "bob" },
  });
  assert.equal(session.remotePlayers.get(other.id)?.name, other.name);
  assert.equal(session.remotePlayers.get(other.id)?.look, null);
});

test("movement is throttled below the server limit and always sends the latest", async () => {
  const { session, socket, timers } = await joined();
  socket.sent.length = 0;
  for (let i = 0; i < 5; i++) session.sendMove(i, 0, 0, "walk");
  assert.equal(sentBy(socket).length, 1);
  timers.advance(MOVE_INTERVAL_MS);
  const updates = sentBy(socket);
  assert.equal(updates.length, 2);
  assert.ok(updates[1].type === "update" && updates[1].entity.x === 4);

  socket.sent.length = 0;
  for (let t = 0; t < 1000; t += 16) {
    session.sendMove(t / 100, 0, 0, "walk");
    timers.advance(16);
  }
  timers.advance(MOVE_INTERVAL_MS);
  const perSecond = sentBy(socket).length;
  assert.ok(perSecond >= 10 && perSecond <= 13, `${perSecond}`);
  assert.equal(MOVE_INTERVAL_MS >= 1000 / 15, true);

  assert.equal(session.sendMove(NaN, 0, 0, "walk"), false);
});

test("a dropped socket reconnects and re-announces the latest position", async () => {
  const { session, socket, timers, statuses } = await joined();
  session.sendMove(3, 4, 1, "idle");
  serve(socket, snapshot([entity(0)]));
  socket.drop(1006);
  assert.equal(session.status(), "reconnecting");
  timers.advance(1000);
  const next = FakeSocket.latest();
  assert.notEqual(next, socket);
  next.open();
  const [join] = sentBy(next);
  assert.ok(join.type === "join");
  assert.deepEqual([join.entity.x, join.entity.z, join.entity.yaw], [3, 4, 1]);
  serve(next, snapshot());
  assert.equal(session.remotePlayers.size, 0);
  assert.deepEqual(statuses.slice(-2), ["reconnecting", "open"]);
});

test("look, chat and emote go out only while connected and only when valid", async () => {
  const offline = setup();
  await offline.session.start();
  assert.equal(offline.session.sendChat("hi"), false);

  const { session, socket } = await joined();
  socket.sent.length = 0;
  assert.equal(session.setLook(otherLook), true);
  assert.equal(session.setLook({ hair: "bob" }), false);
  assert.equal(session.sendChat("hello"), true);
  assert.equal(session.sendChat("x".repeat(121)), false);
  assert.equal(session.sendEmote("wave"), true);
  assert.deepEqual(
    sentBy(socket).map((m) => m.type),
    ["join", "chat", "emote"],
  );
  const [join] = sentBy(socket);
  assert.ok(join.type === "join" && join.look.hairStyle === "buns");
});

test("leaving closes the socket and forgets everyone", async () => {
  const { session, socket } = await joined();
  serve(socket, snapshot([entity(0)]));
  session.leaveRoom();
  assert.equal(socket.closedWith, 1000);
  assert.equal(session.remotePlayers.size, 0);
  assert.equal(session.status(), "ready");
  assert.equal(session.room(), null);
});

const account = { id: "u_acct", name: "Kai", isGuest: false, isAdmin: false };

test("adoptIdentity rejoins the same room copy as the signed-in account, in place", async () => {
  const routes: Routes = {};
  const { session, socket } = await joined(routes);
  session.setLook(otherLook);
  session.sendMove(3, 4, 1, "idle");
  routes["GET /api/me"] = () => json(account);

  const adopting = session.adoptIdentity();
  await flush();
  assert.equal(socket.closedWith, 1000);
  const next = FakeSocket.latest();
  assert.notEqual(next, socket);
  const url = new URL(next.url);
  assert.equal(url.pathname, "/ws/room/plaza/1");
  assert.deepEqual(JSON.parse(url.searchParams.get("look") ?? ""), otherLook);
  next.open();
  serve(next, snapshot());
  assert.deepEqual(await adopting, {
    identity: account,
    join: { ok: true, copy: 1 },
  });
  assert.deepEqual(session.identity(), account);
  const [join] = sentBy(next);
  assert.ok(join.type === "join");
  assert.equal(join.entity.id, account.id);
  assert.equal(join.name, account.name);
  assert.deepEqual([join.entity.x, join.entity.z, join.entity.yaw], [3, 4, 1]);
});

test("adoptIdentity outside a room only refreshes who we are", async () => {
  const routes: Routes = {};
  const { session } = setup(routes);
  await session.start();
  routes["GET /api/me"] = () => json(account);
  assert.deepEqual(await session.adoptIdentity(), {
    identity: account,
    join: null,
  });
  assert.equal(FakeSocket.instances.length, 0);
  assert.equal(session.status(), "ready");
});

test("after logout adoptIdentity carries on as a fresh guest", async () => {
  const routes: Routes = {};
  const { session } = await joined(routes);
  const guest = { ...me, id: "g_fresh", name: "JuicySlice4321" };
  routes["GET /api/me"] = () => json({ error: "no-session" }, 401);
  routes["POST /api/guest"] = () => json(guest, 201);
  const adopting = session.adoptIdentity();
  await flush();
  FakeSocket.latest().open();
  serve(FakeSocket.latest(), snapshot());
  const result = await adopting;
  assert.deepEqual(result.identity, guest);
  assert.ok(result.join?.ok);
});

test("adoptIdentity goes offline when the server has gone away", async () => {
  const routes: Routes = {};
  const { session, socket } = await joined(routes);
  const down = () => {
    throw new TypeError("fetch failed");
  };
  routes["GET /api/me"] = down;
  routes["POST /api/guest"] = down;
  assert.deepEqual(await session.adoptIdentity(), {
    identity: null,
    join: null,
  });
  assert.equal(socket.closedWith, 1000);
  assert.equal(session.status(), "offline");
  assert.equal(session.room(), null);
});

test("report and block name the room copy, and a block drops the player", async () => {
  const bodies: Record<string, unknown> = {};
  const capture = (key: string) => async () => {
    bodies[key] = true;
    return json({ ok: true }, 202);
  };
  const { session, socket } = await joined({
    "POST /api/report": capture("report"),
    "POST /api/block": capture("block"),
  });
  serve(socket, snapshot([entity(1)]));
  serve(socket, {
    type: "profile",
    roomId: "plaza",
    ...other,
    look: otherLook,
  });
  assert.ok(session.remotePlayers.has(other.id));
  const left: string[] = [];
  session.on("leave", (id) => left.push(id));
  assert.equal(await session.report(other.id, "harassment"), true);
  assert.equal(await session.block(other.id), true);
  assert.deepEqual(bodies, { report: true, block: true });
  assert.equal(session.remotePlayers.has(other.id), false);
  assert.deepEqual(left, [other.id]);
});

test("reporting with no room joined does nothing", async () => {
  const { session } = setup();
  assert.equal(await session.report("g_x", "spam"), false);
});

test("signIn logs in and becomes the account; a wrong password changes nothing", async () => {
  const routes: Routes = {};
  const { session } = setup(routes);
  await session.start();
  routes["POST /api/login"] = () => json({ error: "wrong-credentials" }, 401);
  const wrong = await session.signIn("login", "Kai", "not-it-at-all");
  assert.deepEqual(wrong, {
    ok: false,
    status: 401,
    error: "wrong-credentials",
  });
  assert.equal(session.identity()?.isGuest, true);
  routes["POST /api/login"] = () => json(account);
  routes["GET /api/me"] = () => json(account);
  const right = await session.signIn("login", "Kai", "right-password");
  assert.equal(right.ok, true);
  assert.deepEqual(session.identity(), account);
});

test("signOut logs out and carries on as a guest", async () => {
  const routes: Routes = {};
  const { session } = setup(routes);
  routes["GET /api/me"] = () => json(account);
  await session.start();
  const guest = { ...me, id: "g_after", name: "JuicySlice4321" };
  routes["POST /api/logout"] = () => json({ ok: true });
  routes["GET /api/me"] = () => json({ error: "no-session" }, 401);
  routes["POST /api/guest"] = () => json(guest);
  await session.signOut();
  assert.deepEqual(session.identity(), guest);
});
