// Client side of server-owned progress: adopting the server's totals, retrying
// a busy server, the notes a score shows, and the board reset countdown.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PRIZE_TABLES } from "../../game/prizes.ts";
import { createDefaultSave } from "../../game/save.ts";
import type { ScoreOutcome } from "../progress.ts";
import type { ApiResult } from "./api.ts";
import {
  adoptServerProgress,
  boardChoice,
  boardValue,
  retryBusy,
  scoreNote,
  weekCountdown,
} from "./progressSync.ts";

const outcome: ScoreOutcome = {
  xp: { street: 5, fame: 300, hustle: 0 },
  title: null,
  dailyXpLeft: 4900,
  grade: "A",
  ladder: "fame",
  gained: 70,
  best: false,
  capped: false,
};

test("the server's XP replaces the local XP, and the save keeps everything else", () => {
  const save = createDefaultSave("Mo");
  save.progression.xp = { street: 900, fame: 0, hustle: 0 };
  save.progression.events = { "disco-night": 123 };
  const next = adoptServerProgress(save, {
    xp: { street: 5, fame: 300, hustle: 0 },
    title: null,
  });
  assert.deepEqual(next.progression.xp, { street: 5, fame: 300, hustle: 0 });
  assert.deepEqual(next.progression.events, save.progression.events);
  assert.equal(next.coins, save.coins);
});

test("a save that already matches the server is returned as is, so no sync loop starts", () => {
  const save = createDefaultSave("Mo");
  assert.equal(
    adoptServerProgress(save, { xp: save.progression.xp, title: null }),
    save,
  );
});

test("a title the server's XP has not earned is dropped", () => {
  const save = createDefaultSave("Mo");
  const earned = adoptServerProgress(save, {
    xp: { street: 0, fame: 300, hustle: 0 },
    title: "fame:1",
  });
  assert.equal(earned.progression.title, "fame:1");
  const unearned = adoptServerProgress(save, {
    xp: { street: 0, fame: 0, hustle: 0 },
    title: "fame:3",
  });
  assert.equal(unearned.progression.title, null);
});

test("a busy server is retried, anything else is returned at once", async () => {
  const busy: ApiResult<number> = { ok: false, status: 409, error: "busy" };
  let calls = 0;
  const waits: number[] = [];
  const result = await retryBusy(
    () => Promise.resolve(++calls < 3 ? busy : { ok: true as const, value: 7 }),
    (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  );
  assert.deepEqual(result, { ok: true, value: 7 });
  assert.equal(calls, 3);
  assert.equal(waits.length, 2);

  calls = 0;
  const refused = await retryBusy(
    () => {
      calls++;
      return Promise.resolve<ApiResult<number>>({
        ok: false,
        status: 422,
        error: "refused",
      });
    },
    () => Promise.resolve(),
  );
  assert.equal(refused.ok, false);
  assert.equal(calls, 1);
});

test("a server that stays busy gives up after the last try", async () => {
  let calls = 0;
  const result = await retryBusy(
    () => {
      calls++;
      return Promise.resolve<ApiResult<number>>({
        ok: false,
        status: 409,
        error: "busy",
      });
    },
    () => Promise.resolve(),
  );
  assert.equal(result.ok, false);
  assert.equal(calls, 3);
});

test("a score's note says how much XP is left today, or that the cap was hit", () => {
  assert.equal(scoreNote({ ok: true, value: outcome }), "4,900 XP left today");
  assert.equal(
    scoreNote({
      ok: true,
      value: { ...outcome, capped: true, gained: 0, dailyXpLeft: 0 },
    }),
    "Daily XP limit reached",
  );
});

test("a score the server did not take says so without losing the local result", () => {
  const fail = (status: number, error: string) =>
    scoreNote({ ok: false, status, error });
  assert.match(fail(0, "network"), /offline/i);
  assert.match(fail(429, "rate-limited"), /slow down/i);
  assert.match(fail(422, "refused"), /weekly board/i);
  assert.match(fail(500, "http-500"), /weekly board/i);
});

test("the reset countdown counts days, then hours, then minutes", () => {
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  assert.equal(weekCountdown(3 * day + 5 * hour + 10 * min, 0), "3d 5h");
  assert.equal(weekCountdown(5 * hour + 10 * min, 0), "5h 10m");
  assert.equal(weekCountdown(7 * min + 30_000, 0), "8m");
  assert.equal(weekCountdown(1000, 0), "under a minute");
  assert.equal(weekCountdown(0, 5000), "under a minute");
});

test("board values show as a game's own score format, or as XP", () => {
  assert.equal(boardValue({ ladder: "fame" }, 1234), "1,234 XP");
  assert.equal(
    boardValue({ game: "bowling" }, 150),
    PRIZE_TABLES.bowling.format(150),
  );
});

test("a board picker value names a ladder or a game, and nothing else", () => {
  assert.deepEqual(boardChoice("ladder:fame"), { ladder: "fame" });
  assert.deepEqual(boardChoice("game:bowling"), { game: "bowling" });
  for (const bad of ["", "fame", "ladder:bowling", "game:fame", "x:y", "game:"])
    assert.equal(boardChoice(bad), null, bad);
});
