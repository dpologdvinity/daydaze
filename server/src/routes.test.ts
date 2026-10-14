import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRoute } from "./routes.ts";

test("fixed API routes match by method and path", () => {
  assert.deepEqual(matchRoute("POST", "/api/guest"), { kind: "guest" });
  assert.deepEqual(matchRoute("POST", "/api/signup"), { kind: "signup" });
  assert.deepEqual(matchRoute("POST", "/api/login"), { kind: "login" });
  assert.deepEqual(matchRoute("POST", "/api/logout"), { kind: "logout" });
  assert.deepEqual(matchRoute("GET", "/api/me"), { kind: "me" });
  assert.deepEqual(matchRoute("GET", "/api/save"), { kind: "save-get" });
  assert.deepEqual(matchRoute("PUT", "/api/save"), { kind: "save-put" });
  assert.deepEqual(matchRoute("POST", "/api/report"), { kind: "report" });
  assert.deepEqual(matchRoute("POST", "/api/block"), { kind: "block" });
  assert.deepEqual(matchRoute("POST", "/api/admin/ban"), { kind: "admin-ban" });
});

test("room routes accept only known rooms and copies 1 to 99", () => {
  assert.deepEqual(matchRoute("GET", "/api/rooms/plaza"), {
    kind: "rooms",
    roomId: "plaza",
  });
  assert.deepEqual(matchRoute("GET", "/ws/room/velvet-room/2"), {
    kind: "ws",
    roomId: "velvet-room",
    copy: 2,
  });
  assert.deepEqual(matchRoute("GET", "/ws/room/plaza/99"), {
    kind: "ws",
    roomId: "plaza",
    copy: 99,
  });
  for (const path of [
    "/api/rooms/nowhere",
    "/api/rooms/toString",
    "/ws/room/plaza/0",
    "/ws/room/plaza/100",
    "/ws/room/plaza/01",
    "/ws/room/plaza/1.5",
    "/ws/room/nowhere/1",
    "/ws/room/plaza",
  ])
    assert.equal(matchRoute("GET", path), null, path);
});

test("wrong methods and unknown paths do not match", () => {
  for (const [method, path] of [
    ["GET", "/api/guest"],
    ["DELETE", "/api/save"],
    ["POST", "/api/me"],
    ["POST", "/api/rooms/plaza"],
    ["GET", "/api/admin/ban"],
    ["GET", "/api/guest/"],
    ["GET", "/"],
  ])
    assert.equal(matchRoute(method, path), null, `${method} ${path}`);
});
