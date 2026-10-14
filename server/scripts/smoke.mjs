// End-to-end check against a local `wrangler dev`: two guests join one room
// copy and see each other's join, movement and chat. Never touches Cloudflare.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DEFAULT_LOOK } from "../../src/game/look.ts";
import { createDefaultSave } from "../../src/game/save.ts";
import { createApi } from "../../src/net/client/api.ts";
import { OnlineSession } from "../../src/net/client/OnlineSession.ts";
import { WebSocketTransport } from "../../src/net/client/WebSocketTransport.ts";
import {
  decodeServerMessage,
  encodeClientMessage,
} from "../../src/net/networkProtocol.ts";

const PORT = Number(process.env.SMOKE_PORT ?? 8799);
const BASE = `http://127.0.0.1:${PORT}`;
const CONFIG = "server/wrangler.jsonc";
const persist = mkdtempSync(join(tmpdir(), "daydaze-smoke-"));

function wrangler(args, options) {
  return [
    "npx",
    ["wrangler", ...args, "--config", CONFIG, "--persist-to", persist],
    options,
  ];
}

function check(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const response = await fetch(`${BASE}/api/me`);
      if (response.status === 401) return;
    } catch {
      // Not listening yet.
    }
    await sleep(500);
  }
  throw new Error("wrangler dev did not start within 60 s");
}

async function guest() {
  const response = await fetch(`${BASE}/api/guest`, { method: "POST" });
  check(response.status === 201, "POST /api/guest creates a guest");
  const cookie = response.headers.getSetCookie()[0] ?? "";
  check(
    /HttpOnly/.test(cookie) && /SameSite=Lax/.test(cookie),
    "session cookie is HttpOnly and SameSite=Lax",
  );
  const identity = await response.json();
  return { ...identity, cookie: cookie.split(";")[0] };
}

function connect(player) {
  const socket = new WebSocket(
    `${BASE.replace("http", "ws")}/ws/room/plaza/1`,
    {
      headers: { Cookie: player.cookie },
    },
  );
  const messages = [];
  socket.addEventListener("message", (event) => {
    const message = decodeServerMessage(event.data);
    if (message) messages.push(message);
  });
  const closed = new Promise((resolve) =>
    socket.addEventListener("close", (event) => resolve(event.code)),
  );
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () =>
      resolve({ socket, messages, closed }),
    );
    socket.addEventListener("error", () => reject(new Error("socket error")));
  });
}

async function waitFor(messages, predicate, description) {
  for (let i = 0; i < 50; i++) {
    if (messages.some(predicate)) return check(true, description);
    await sleep(100);
  }
  check(false, description);
}

/** An OnlineSession wired like the browser's, with a cookie jar in place of one. */
function onlineSession() {
  let cookie = "";
  const fetchWithCookies = async (url, init) => {
    const headers = new Headers(init.headers);
    if (cookie) headers.set("Cookie", cookie);
    const response = await fetch(url, { ...init, headers });
    const set = response.headers.getSetCookie()[0];
    if (set) cookie = set.split(";")[0];
    return response;
  };
  // A constructor returning an object makes `new NodeSocket(url)` that object.
  function NodeSocket(url) {
    return new WebSocket(url, { headers: { Cookie: cookie } });
  }
  const session = new OnlineSession({
    api: createApi({ fetch: fetchWithCookies, baseUrl: BASE }),
    wsBaseUrl: BASE.replace("http", "ws"),
    openTransport: (url) =>
      new WebSocketTransport({ url, WebSocket: NodeSocket }),
  });
  const events = [];
  for (const name of ["profile", "delta", "leave", "chat"])
    session.on(name, (payload) => events.push({ name, payload }));
  return { session, events };
}

const migrate = spawnSync(
  ...wrangler(["d1", "migrations", "apply", "DB", "--local"], {
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  }),
);
if (migrate.status !== 0) {
  rmSync(persist, { recursive: true, force: true });
  throw new Error("applying D1 migrations failed");
}

const server = spawn(
  ...wrangler(["dev", "--ip", "127.0.0.1", "--port", String(PORT)], {
    stdio: ["ignore", "inherit", "inherit"],
    detached: true,
  }),
);
let failed = false;
try {
  await waitForServer();
  const alice = await guest();
  const bob = await guest();
  check(alice.id !== bob.id && alice.isGuest, "guests get distinct ids");

  const a = await connect(alice);
  await waitFor(
    a.messages,
    (m) => m.type === "snapshot",
    "first player gets a snapshot",
  );
  const b = await connect(bob);
  await waitFor(
    a.messages,
    (m) => m.type === "profile" && m.id === bob.id && m.name === bob.name,
    "first player sees the second join",
  );
  await waitFor(
    b.messages,
    (m) => m.type === "profile" && m.id === alice.id,
    "second player gets the first player's profile",
  );

  b.socket.send(
    encodeClientMessage({
      type: "update",
      entity: {
        id: bob.id,
        x: 1.5,
        z: 2,
        yaw: 0.5,
        action: "walk",
        timestamp: Date.now(),
      },
    }),
  );
  await waitFor(
    a.messages,
    (m) => m.type === "delta" && m.entity.id === bob.id && m.entity.x === 1.5,
    "first player sees the second player's movement",
  );

  a.socket.send(
    encodeClientMessage({ type: "chat", text: "hello from the plaza" }),
  );
  await waitFor(
    b.messages,
    (m) =>
      m.type === "chat" &&
      m.id === alice.id &&
      m.text === "hello from the plaza",
    "second player sees the first player's chat",
  );

  const rooms = await (await fetch(`${BASE}/api/rooms/plaza`)).json();
  check(
    rooms.copies.some((copy) => copy.copy === 1 && copy.count === 2),
    "the directory counts both players in copy 1",
  );

  // Reconnecting replaces the old socket without dropping the player.
  const a2 = await connect(alice);
  check(
    (await a.closed) === 4009,
    "a reconnect closes the stale socket with 4009",
  );
  await sleep(300);
  const afterReconnect = await (await fetch(`${BASE}/api/rooms/plaza`)).json();
  check(
    afterReconnect.copies.some((copy) => copy.copy === 1 && copy.count === 2),
    "the reconnected player still counts once",
  );

  // Blocking hides the pair from each other at once.
  const block = await fetch(`${BASE}/api/block`, {
    method: "POST",
    headers: { Cookie: alice.cookie },
    body: JSON.stringify({ targetId: bob.id, roomId: "plaza", copy: 1 }),
  });
  check(block.status === 204, "POST /api/block succeeds");
  await waitFor(
    a2.messages,
    (m) => m.type === "entity-leave" && m.id === bob.id,
    "the blocker stops seeing the blocked player",
  );
  b.socket.send(encodeClientMessage({ type: "chat", text: "can you hear me" }));
  await sleep(500);
  check(
    !a2.messages.some((m) => m.type === "chat" && m.id === bob.id),
    "a blocked player's chat never arrives",
  );

  a2.socket.close();
  b.socket.close();

  // The browser client library end to end, in a room of its own.
  const one = onlineSession();
  const two = onlineSession();
  const first = await one.session.start();
  const second = await two.session.start();
  check(first?.isGuest && second?.isGuest, "OnlineSession.start makes guests");
  const joinedOne = await one.session.joinRoom("mango-room", DEFAULT_LOOK);
  const joinedTwo = await two.session.joinRoom("mango-room", DEFAULT_LOOK);
  check(
    joinedOne.ok && joinedTwo.ok && joinedOne.copy === joinedTwo.copy,
    "two OnlineSessions join the same Mango Room copy",
  );
  await waitFor(
    one.events,
    ({ name, payload }) => name === "profile" && payload.id === second.id,
    "OnlineSession sees the other player join",
  );
  two.session.sendMove(1.25, 2.5, 0.75, "walk");
  await waitFor(
    one.events,
    ({ name, payload }) =>
      name === "delta" && payload.id === second.id && payload.next?.x === 1.25,
    "OnlineSession sees the other player move",
  );
  // Remote players render 100 ms behind; after that they rest where they stopped.
  await sleep(150);
  check(
    one.session.sample(second.id)?.z === 2.5,
    "OnlineSession samples the remote position",
  );
  one.session.sendChat("hi from OnlineSession");
  await waitFor(
    two.events,
    ({ name, payload }) =>
      name === "chat" &&
      payload.name === first.name &&
      payload.text === "hi from OnlineSession",
    "OnlineSession receives chat with the sender's name",
  );
  one.session.leaveRoom();
  await waitFor(
    two.events,
    ({ name, payload }) => name === "leave" && payload === first.id,
    "OnlineSession sees the other player leave",
  );
  two.session.leaveRoom();

  // Accounts: signup, save round trip, logout and login.
  const credentials = { username: "Smoke Tester", password: "correct horse" };
  const signup = await fetch(`${BASE}/api/signup`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  check(signup.status === 201, "POST /api/signup creates an account");
  const account = signup.headers.getSetCookie()[0].split(";")[0];
  const save = {
    ...createDefaultSave("Smoke Tester"),
    settings: { quality: "low", muted: true },
  };
  const put = await fetch(`${BASE}/api/save`, {
    method: "PUT",
    headers: { Cookie: account },
    body: JSON.stringify(save),
  });
  check(put.status === 200, "PUT /api/save stores a valid save");
  const bad = await fetch(`${BASE}/api/save`, {
    method: "PUT",
    headers: { Cookie: account },
    body: JSON.stringify({ ...save, look: { hair: "bob" } }),
  });
  check(bad.status === 400, "PUT /api/save rejects an invalid save");
  const got = await (
    await fetch(`${BASE}/api/save`, { headers: { Cookie: account } })
  ).json();
  check(
    got.settings.quality === "low",
    "GET /api/save keeps the last good save",
  );
  const logout = await fetch(`${BASE}/api/logout`, {
    method: "POST",
    headers: { Cookie: account },
  });
  check(logout.status === 204, "POST /api/logout ends the session");
  const me = await fetch(`${BASE}/api/me`, { headers: { Cookie: account } });
  check(me.status === 401, "the old cookie no longer works");
  const login = await fetch(`${BASE}/api/login`, {
    method: "POST",
    body: JSON.stringify({ ...credentials, username: "smoke tester" }),
  });
  check(
    login.status === 200,
    "POST /api/login accepts the password, case-insensitive name",
  );
  const wrong = await fetch(`${BASE}/api/login`, {
    method: "POST",
    body: JSON.stringify({ ...credentials, password: "wrong horse" }),
  });
  check(wrong.status === 401, "POST /api/login rejects a wrong password");
} catch (error) {
  failed = true;
  console.error(error);
} finally {
  // The whole process group, so workerd children cannot outlive the script.
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // Already gone.
  }
  await sleep(1000);
  try {
    process.kill(-server.pid, "SIGKILL");
  } catch {
    // Already gone.
  }
  rmSync(persist, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
