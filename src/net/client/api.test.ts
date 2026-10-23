import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOOK } from "../../game/look.ts";
import { createDefaultSave, serializeSave } from "../../game/save.ts";
import { createApi, type Fetch } from "./api.ts";

const identity = {
  id: "g_abc",
  name: "MangoGuest1234",
  isGuest: true,
  isAdmin: false,
};

type Call = { url: string; init: RequestInit };

function fakeFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch: Fetch = async (url, init) => {
    const call = { url, init };
    calls.push(call);
    return respond(call);
  };
  return { fetch, calls };
}
const json = (body: unknown, status = 200) => Response.json(body, { status });

test("every route sends credentials and the right method, path and body", async () => {
  const { fetch, calls } = fakeFetch(({ url }) =>
    url.endsWith("/api/rooms/plaza")
      ? json({ copies: [{ copy: 1, count: 0, full: false }], pick: 1 })
      : url.endsWith("/api/save")
        ? new Response(serializeSave(createDefaultSave("Kai")))
        : url.endsWith("/api/logout") ||
            url.endsWith("/api/block") ||
            url.endsWith("/api/report")
          ? new Response(null, { status: url.endsWith("/report") ? 201 : 204 })
          : json(identity),
  );
  const api = createApi({ fetch, baseUrl: "http://game" });
  await api.guest();
  await api.signup("Kai", "hunter22");
  await api.login("Kai", "hunter22");
  await api.logout();
  await api.me();
  await api.getSave("Kai");
  await api.putSave(createDefaultSave("Kai"));
  await api.rooms("plaza");
  await api.report({
    targetId: "u_x",
    reason: "spam",
    roomId: "plaza",
    copy: 1,
  });
  await api.block("u_x", { roomId: "plaza", copy: 2 });
  await api.ban("g_troll", "slurs in chat");
  assert.deepEqual(
    calls.map(({ url, init }) => `${init.method} ${url}`),
    [
      "POST http://game/api/guest",
      "POST http://game/api/signup",
      "POST http://game/api/login",
      "POST http://game/api/logout",
      "GET http://game/api/me",
      "GET http://game/api/save",
      "PUT http://game/api/save",
      "GET http://game/api/rooms/plaza",
      "POST http://game/api/report",
      "POST http://game/api/block",
      "POST http://game/api/admin/ban",
    ],
  );
  assert.ok(calls.every(({ init }) => init.credentials === "include"));
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    username: "Kai",
    password: "hunter22",
  });
  assert.deepEqual(JSON.parse(String(calls[9].init.body)), {
    targetId: "u_x",
    roomId: "plaza",
    copy: 2,
  });
  assert.deepEqual(JSON.parse(String(calls[10].init.body)), {
    targetId: "g_troll",
    reason: "slurs in chat",
  });
  assert.equal(calls[4].init.body, undefined);
});

test("identities, saves and room lists are validated before use", async () => {
  const bad = createApi({
    fetch: fakeFetch(() => json({ ...identity, isAdmin: "yes" })).fetch,
  });
  assert.deepEqual(await bad.me(), {
    ok: false,
    status: 200,
    error: "invalid-response",
  });
  const rooms = createApi({
    fetch: fakeFetch(() =>
      json({ copies: [{ copy: 0, count: 1, full: false }], pick: 1 }),
    ).fetch,
  });
  assert.equal((await rooms.rooms("plaza")).ok, false);
  const save = createApi({
    fetch: fakeFetch(() => json({ version: 1, name: "Kai", look: "junk" }))
      .fetch,
  });
  const loaded = await save.getSave("Kai");
  assert.ok(loaded.ok);
  assert.deepEqual(loaded.value.look, DEFAULT_LOOK);
});

test("server errors and network failures are reported, never thrown", async () => {
  const refused = createApi({
    fetch: async () => {
      throw new TypeError("fetch failed");
    },
  });
  assert.deepEqual(await refused.me(), {
    ok: false,
    status: 0,
    error: "network",
  });
  const unauthorized = createApi({
    fetch: fakeFetch(() => json({ error: "no-session" }, 401)).fetch,
  });
  assert.deepEqual(await unauthorized.me(), {
    ok: false,
    status: 401,
    error: "no-session",
  });
  const html = createApi({
    fetch: fakeFetch(
      () => new Response("<h1>Bad gateway</h1>", { status: 502 }),
    ).fetch,
  });
  assert.deepEqual(await html.guest(), {
    ok: false,
    status: 502,
    error: "http-502",
  });
});
