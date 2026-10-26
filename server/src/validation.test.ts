import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOOK } from "../../src/game/look.ts";
import { createDefaultSave, serializeSave } from "../../src/game/save.ts";
import {
  MAX_SAVE_BYTES,
  parseAttachment,
  parseBan,
  parseBlock,
  parseCredentials,
  parseLookParam,
  parseReport,
  parseSave,
  parseTarget,
} from "./validation.ts";

const identity = {
  id: "g_abc",
  name: "MangoGuest1234",
  isGuest: true,
  isAdmin: false,
};

test("socket attachments carry identity, look, room and copy", () => {
  const attachment = { identity, look: DEFAULT_LOOK, roomId: "plaza", copy: 2 };
  assert.deepEqual(parseAttachment(attachment), attachment);
  for (const bad of [
    null,
    { ...attachment, identity: null },
    { ...attachment, look: { hair: "bob" } },
    { ...attachment, roomId: "nowhere" },
    { ...attachment, copy: 0 },
  ])
    assert.equal(parseAttachment(bad), null);
});

test("credentials need a clean display name and an 8 to 128 character password", () => {
  assert.deepEqual(
    parseCredentials({ username: "Kai_99", password: "hunter22" }),
    { username: "Kai_99", password: "hunter22" },
  );
  for (const bad of [
    null,
    { username: "Kai" },
    { username: "Kai", password: "short" },
    { username: "K", password: "hunter22" },
    { username: "xXniggerXx", password: "hunter22" },
    { username: "Kai", password: 12345678 },
  ])
    assert.equal(parseCredentials(bad), null);
});

test("saves are stored only when loadSave keeps every field as sent", () => {
  const save = {
    ...createDefaultSave("Kai"),
    settings: {
      quality: "low",
      muted: true,
      effects: "low",
      panelOpen: false,
      strictChat: false,
    },
  };
  const raw = JSON.stringify(save);
  assert.deepEqual(parseSave(raw, "Fallback"), save);
  // Key order does not matter.
  const reordered = JSON.stringify({
    settings: {
      muted: true,
      quality: "low",
      effects: "low",
      panelOpen: false,
      strictChat: false,
    },
    bests: save.bests,
    challenges: save.challenges,
    car: save.car,
    garage: save.garage,
    records: save.records,
    onboarded: save.onboarded,
    visited: save.visited,
    sets: save.sets,
    crime: save.crime,
    jail: save.jail,
    home: save.home,
    swim: { color: save.swim.color, style: save.swim.style },
    look: save.look,
    name: "Kai",
    version: 1,
    coins: save.coins,
    wardrobe: save.wardrobe,
    body: save.body,
  });
  assert.deepEqual(parseSave(reordered, "Fallback"), save);
  for (const bad of [
    "{",
    "null",
    "[]",
    JSON.stringify({ ...save, look: { hair: "bob" } }),
    JSON.stringify({ ...save, swim: { style: "thong", color: "#3fe0d0" } }),
    JSON.stringify({ ...save, name: "x" }),
    JSON.stringify({ ...save, version: 2 }),
    JSON.stringify({ ...save, coins: -5 }),
    JSON.stringify({ ...save, settings: { quality: "ultra", muted: true } }),
    JSON.stringify({
      ...save,
      settings: { quality: "low", muted: true, effects: "loud" },
    }),
  ])
    assert.equal(parseSave(bad, "Fallback"), null, bad);
});

test("saves over 64 KB are rejected by UTF-8 size", () => {
  const save = serializeSave(createDefaultSave("Kai"));
  const padded = save.replace("{", `{${" ".repeat(MAX_SAVE_BYTES)}`);
  assert.equal(parseSave(padded, "Kai"), null);
  const multibyte = save.replace("{", `{${" ".repeat(MAX_SAVE_BYTES / 2)}`);
  assert.ok(multibyte.length < MAX_SAVE_BYTES);
  assert.equal(parseSave(multibyte, "Kai"), null);
});

test("reports need a target, a short reason and the room copy", () => {
  const report = { targetId: "u_x", reason: "spam", roomId: "plaza", copy: 1 };
  assert.deepEqual(parseReport(report), report);
  for (const bad of [
    { ...report, reason: "" },
    { ...report, reason: "x".repeat(201) },
    { ...report, targetId: "" },
    { ...report, roomId: "nowhere" },
    { ...report, copy: 100 },
  ])
    assert.equal(parseReport(bad), null);
});

test("blocks need a target and optionally the shared room copy", () => {
  assert.deepEqual(parseBlock({ targetId: "u_x" }), {
    targetId: "u_x",
    room: null,
  });
  assert.deepEqual(parseBlock({ targetId: "u_x", roomId: "plaza", copy: 3 }), {
    targetId: "u_x",
    room: { roomId: "plaza", copy: 3 },
  });
  for (const bad of [
    null,
    { targetId: "" },
    { targetId: "u_x", roomId: "plaza" },
    { targetId: "u_x", roomId: "nowhere", copy: 1 },
  ])
    assert.equal(parseBlock(bad), null);
});

test("the look query parameter falls back to the default look", () => {
  const look = { ...DEFAULT_LOOK, hairStyle: "buns" };
  assert.deepEqual(parseLookParam(JSON.stringify(look)), look);
  for (const bad of [null, "", "{", JSON.stringify({ hair: "bob" })])
    assert.deepEqual(parseLookParam(bad), DEFAULT_LOOK);
});

test("admin bans need a target and a short reason", () => {
  assert.deepEqual(parseBan({ targetId: "g_x", reason: "slurs", extra: 1 }), {
    targetId: "g_x",
    reason: "slurs",
  });
  for (const bad of [
    null,
    { targetId: "g_x" },
    { targetId: "", reason: "slurs" },
    { targetId: "g_x", reason: " " },
    { targetId: "g_x", reason: "x".repeat(201) },
  ])
    assert.equal(parseBan(bad), null);
});

test("friend requests name only a target", () => {
  assert.equal(parseTarget({ targetId: "u_x" }), "u_x");
  assert.equal(parseTarget({ targetId: "" }), null);
  assert.equal(parseTarget({}), null);
  assert.equal(parseTarget(null), null);
});

test("an apartment socket's attachment keeps its owner; a bad owner is refused", () => {
  const base = {
    identity: { id: "u_friend", name: "Kai", isGuest: false, isAdmin: false },
    look: DEFAULT_LOOK,
    roomId: "apartment",
    copy: 1,
  };
  assert.equal(
    parseAttachment({ ...base, owner: "u_owner" })?.owner,
    "u_owner",
  );
  assert.equal(parseAttachment(base)?.owner, undefined);
  assert.equal(parseAttachment({ ...base, owner: "bad id!" }), null);
  assert.equal(parseAttachment({ ...base, owner: 7 }), null);
});

test("a report or block from inside an apartment names its owner", () => {
  const room = { roomId: "apartment", copy: 1, owner: "u_owner" };
  assert.equal(
    parseReport({ targetId: "u_x", reason: "Spam", ...room })?.owner,
    "u_owner",
  );
  assert.equal(
    parseBlock({ targetId: "u_x", ...room })?.room?.owner,
    "u_owner",
  );
  assert.equal(
    parseBlock({ targetId: "u_x", ...room, owner: "no way!" }),
    null,
  );
  assert.equal(
    parseReport({ targetId: "u_x", reason: "Spam", roomId: "plaza", copy: 2 })
      ?.owner,
    undefined,
  );
});
