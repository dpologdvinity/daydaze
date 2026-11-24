// Tests for server/src/progressStore.ts, run against a real in-memory SQLite
// with the D1 migrations applied: first-contact seeding, graded writes with
// their weekly rows, lost races (a stale write must change nothing, not even
// the boards), and the weekly boards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createDefaultSave, serializeSave } from "../../src/game/save.ts";
import {
  ladderBoard,
  loadProgress,
  scoreBoard,
  updateProgress,
  type Db,
  type Statement,
} from "./progressStore.ts";
import { applyScore, applyVisit } from "./progressCore.ts";

const NOW = Date.UTC(2026, 10, 18, 12);
const MIGRATIONS = new URL("../migrations/", import.meta.url);

/** A D1-shaped wrapper over node:sqlite; batches run in one transaction. */
function database() {
  const sqlite = new DatabaseSync(":memory:");
  // only *.sql, like `wrangler d1 migrations apply`; the folder holds a README
  for (const file of readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"));
  const parts = new Map<Statement, { sql: string; values: unknown[] }>();
  const statement = (sql: string, values: unknown[]): Statement => {
    const made: Statement = {
      bind: (...next) => statement(sql, next),
      first: async () => sqlite.prepare(sql).get(...toSql(values)) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...toSql(values)) }),
      run: async () => sqlite.prepare(sql).run(...toSql(values)),
    };
    parts.set(made, { sql, values });
    return made;
  };
  const db: Db = {
    prepare: (sql) => statement(sql, []),
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const out = statements.map((s) => {
          const part = parts.get(s);
          assert.ok(part);
          const query = sqlite.prepare(part.sql);
          const values = toSql(part.values);
          // like D1, a batched SELECT returns its rows
          if (query.columns().length > 0)
            return { meta: { changes: 0 }, results: query.all(...values) };
          const { changes } = query.run(...values);
          return { meta: { changes: Number(changes) }, results: [] };
        });
        sqlite.exec("COMMIT");
        return out;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { sqlite, db };
}
function toSql(values: unknown[]) {
  return values.map((v) => {
    assert.ok(
      v === null || typeof v === "string" || typeof v === "number",
      `cannot bind ${String(v)}`,
    );
    return v;
  });
}

function addUser(sqlite: DatabaseSync, id: string, name: string) {
  sqlite
    .prepare(
      `INSERT INTO users (id, username, username_key, password_hash, created_at)
       VALUES (?, ?, ?, 'x', 0)`,
    )
    .run(id, name, name.toLowerCase());
}

const score = (game: "bowling" | "mini-golf", value: number) => ({
  game,
  value,
});

/** Grades `value` in `game` for the account and writes it, like the Worker. */
function play(
  db: Db,
  id: string,
  game: "bowling" | "mini-golf",
  value: number,
  now = NOW,
) {
  return updateProgress(db, id, id, now, (state) => {
    const r = applyScore(state, game, value, now);
    return (
      r && {
        state: r.state,
        effects: {
          score: score(game, value),
          xp: { ladder: r.ladder, amount: r.xp },
        },
        result: { gained: r.xp },
      }
    );
  });
}

function weeklyXp(sqlite: DatabaseSync, id: string): number {
  const row = sqlite
    .prepare(
      "SELECT COALESCE(SUM(xp), 0) AS xp FROM weekly_xp WHERE user_id = ?",
    )
    .get(id);
  return Number(row?.xp);
}

test("first contact seeds from the stored save, once", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  const save = createDefaultSave("Ana");
  save.progression.xp.fame = 300;
  save.visited = ["plaza"];
  sqlite
    .prepare("INSERT INTO saves (user_id, data, updated_at) VALUES (?, ?, 0)")
    .run("u_a", serializeSave(save));
  const first = await loadProgress(db, "u_a", "Ana");
  assert.equal(first.state.xp.fame, 300);
  assert.deepEqual(first.state.visited, ["plaza"]);
  // a later, inflated save changes nothing: the row already exists
  save.progression.xp.fame = 99_999;
  sqlite
    .prepare("UPDATE saves SET data = ? WHERE user_id = ?")
    .run(serializeSave(save), "u_a");
  assert.equal((await loadProgress(db, "u_a", "Ana")).state.xp.fame, 300);
  // seeding is not board activity
  assert.equal(weeklyXp(sqlite, "u_a"), 0);
});

test("an account with no save starts from nothing", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  const loaded = await loadProgress(db, "u_a", "Ana");
  assert.deepEqual(loaded.state.xp, { street: 0, fame: 0, hustle: 0 });
  assert.equal(loaded.rev, 0);
});

test("a graded score updates progress and this week's rows together", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  const done = await play(db, "u_a", "bowling", 185);
  assert.ok(done && done !== "busy");
  assert.equal(done.state.xp.fame, 125);
  const loaded = await loadProgress(db, "u_a", "Ana");
  assert.equal(loaded.state.xp.fame, 125);
  assert.equal(loaded.rev, 1);
  assert.equal(weeklyXp(sqlite, "u_a"), 125);
  await play(db, "u_a", "bowling", 100);
  const row = sqlite.prepare("SELECT score FROM weekly_scores").get();
  assert.equal(row?.score, 185, "a worse score keeps the week's best");
  await play(db, "u_a", "bowling", 190);
  assert.equal(
    sqlite.prepare("SELECT score FROM weekly_scores").get()?.score,
    190,
  );
});

test("lower-is-better games keep the week's lowest score", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  await play(db, "u_a", "mini-golf", 1);
  await play(db, "u_a", "mini-golf", 4);
  await play(db, "u_a", "mini-golf", -1);
  assert.equal(
    sqlite.prepare("SELECT score FROM weekly_scores").get()?.score,
    -1,
  );
});

test("a stale write leaves the boards alone and the retry pays once", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  await loadProgress(db, "u_a", "Ana");
  let first = true;
  const result = await updateProgress(db, "u_a", "Ana", NOW, (state) => {
    if (first) {
      first = false;
      // a concurrent request wins the race: it writes between our read and write
      sqlite.exec("UPDATE progress SET rev = rev + 1 WHERE user_id = 'u_a'");
    }
    const r = applyScore(state, "bowling", 185, NOW);
    assert.ok(r);
    return {
      state: r.state,
      effects: {
        score: score("bowling", 185),
        xp: { ladder: r.ladder, amount: r.xp },
      },
      result: { gained: r.xp },
    };
  });
  assert.ok(result && result !== "busy");
  assert.equal(weeklyXp(sqlite, "u_a"), 125, "weekly XP counted exactly once");
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS n FROM weekly_scores").get()?.n,
    1,
  );
});

test("a write that keeps losing gives up as busy, writing nothing", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  await loadProgress(db, "u_a", "Ana");
  const result = await updateProgress(db, "u_a", "Ana", NOW, (state) => {
    sqlite.exec("UPDATE progress SET rev = rev + 1 WHERE user_id = 'u_a'");
    const r = applyScore(state, "bowling", 185, NOW);
    assert.ok(r);
    return {
      state: r.state,
      effects: { xp: { ladder: r.ladder, amount: r.xp } },
      result: {},
    };
  });
  assert.equal(result, "busy");
  assert.equal(weeklyXp(sqlite, "u_a"), 0);
  assert.equal(
    (await loadProgress(db, "u_a", "Ana")).state.xp.fame,
    0,
    "no XP from the lost writes",
  );
});

test("refusing, or changing nothing, writes nothing", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  assert.equal(await updateProgress(db, "u_a", "Ana", NOW, () => null), null);
  const visit = (state: Parameters<typeof applyVisit>[0]) => {
    const r = applyVisit(state, "plaza");
    return { state: r.state, effects: {}, result: { gained: r.xp } };
  };
  await updateProgress(db, "u_a", "Ana", NOW, visit);
  const before = (await loadProgress(db, "u_a", "Ana")).rev;
  await updateProgress(db, "u_a", "Ana", NOW, visit);
  assert.equal((await loadProgress(db, "u_a", "Ana")).rev, before);
});

test("old weeks are pruned on write", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  const WEEK = 7 * 86_400_000;
  await play(db, "u_a", "bowling", 150, NOW - 9 * WEEK);
  await play(db, "u_a", "bowling", 150, NOW);
  const weeks = sqlite.prepare("SELECT week FROM weekly_scores").all();
  assert.equal(weeks.length, 1);
});

test("the score board ranks best first, skips bans and shows names only", async () => {
  const { sqlite, db } = database();
  for (const [id, name] of [
    ["u_a", "Ana"],
    ["u_b", "Bea"],
    ["u_c", "Cass"],
  ] as const)
    addUser(sqlite, id, name);
  await play(db, "u_a", "bowling", 150);
  await play(db, "u_b", "bowling", 190);
  await play(db, "u_c", "bowling", 170);
  sqlite
    .prepare("INSERT INTO bans (player_id, created_at) VALUES ('u_b', 0)")
    .run();
  const board = await scoreBoard(db, "bowling", "u_a", NOW);
  assert.deepEqual(board.entries, [
    { rank: 1, name: "Cass", value: 170 },
    { rank: 2, name: "Ana", value: 150 },
  ]);
  assert.equal(board.you?.value, 150);
  assert.ok(board.startsAt <= NOW && NOW < board.endsAt);
  assert.equal(JSON.stringify(board).includes("u_a"), false, "no ids leak");
  // no row yet this week
  assert.equal((await scoreBoard(db, "bowling", "u_zzz", NOW)).you, null);
  // last week's scores are not this week's board
  const later = await scoreBoard(db, "bowling", "u_a", NOW + 7 * 86_400_000);
  assert.deepEqual(later.entries, []);
});

test("lower-is-better boards rank the lowest first; ties go to who got there first", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  addUser(sqlite, "u_b", "Bea");
  await play(db, "u_a", "mini-golf", 2, NOW);
  await play(db, "u_b", "mini-golf", -1, NOW + 1000);
  const board = await scoreBoard(db, "mini-golf", "u_a", NOW + 2000);
  assert.deepEqual(
    board.entries.map((e) => e.name),
    ["Bea", "Ana"],
  );
  assert.equal(board.you?.rank, 2);
  await play(db, "u_a", "mini-golf", -1, NOW + 3000);
  const tied = await scoreBoard(db, "mini-golf", "u_a", NOW + 4000);
  assert.deepEqual(
    tied.entries.map((e) => e.name),
    ["Bea", "Ana"],
  );
  assert.equal(tied.you?.rank, 2);
});

test("the ladder board counts only XP the server paid this week", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  addUser(sqlite, "u_b", "Bea");
  await play(db, "u_a", "bowling", 185);
  await play(db, "u_b", "bowling", 100);
  const board = await ladderBoard(db, "fame", "u_b", NOW);
  assert.deepEqual(board.entries, [
    { rank: 1, name: "Ana", value: 125 },
    { rank: 2, name: "Bea", value: 70 },
  ]);
  assert.deepEqual(board.you, { rank: 2, value: 70 });
  assert.deepEqual((await ladderBoard(db, "street", "u_a", NOW)).entries, []);
});

test("a caller's rank leaves out banned players, like the list does", async () => {
  const { sqlite, db } = database();
  for (const [id, name] of [
    ["u_a", "Ana"],
    ["u_b", "Bea"],
  ] as const)
    addUser(sqlite, id, name);
  await play(db, "u_a", "bowling", 150);
  await play(db, "u_b", "bowling", 190);
  sqlite
    .prepare("INSERT INTO bans (player_id, created_at) VALUES ('u_b', 0)")
    .run();
  assert.equal((await scoreBoard(db, "bowling", "u_a", NOW)).you?.rank, 1);
  assert.equal((await ladderBoard(db, "fame", "u_a", NOW)).you?.rank, 1);
});

test("players tied on value and time still get distinct ranks, matching the list", async () => {
  const { sqlite, db } = database();
  addUser(sqlite, "u_a", "Ana");
  addUser(sqlite, "u_b", "Bea");
  await play(db, "u_a", "bowling", 150);
  await play(db, "u_b", "bowling", 150);
  for (const viewer of ["u_a", "u_b"]) {
    for (const board of [
      await scoreBoard(db, "bowling", viewer, NOW),
      await ladderBoard(db, "fame", viewer, NOW),
    ]) {
      const listed = board.entries.find(
        (e) => e.name === (viewer === "u_a" ? "Ana" : "Bea"),
      );
      assert.equal(board.you?.rank, listed?.rank, viewer);
    }
  }
  const ranks = [
    (await scoreBoard(db, "bowling", "u_a", NOW)).you?.rank,
    (await scoreBoard(db, "bowling", "u_b", NOW)).you?.rank,
  ];
  assert.deepEqual(ranks.sort(), [1, 2]);
});
