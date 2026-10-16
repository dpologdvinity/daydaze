import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MOVES,
  SIZE,
  findRuns,
  grade,
  hasMove,
  newGame,
  play,
  type Board,
  type Cell,
  type Game,
} from "./engine.ts";

const full = (b: Board) => b.every((row) => row.every((g) => g !== null));

/** The first swap that makes a match on this board. */
function legalSwap(g: Game): [Cell, Cell] {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ]) {
        const b: Cell = [r + dr, c + dc];
        if (b[0] >= SIZE || b[1] >= SIZE) continue;
        const copy = g.board.map((row) => [...row]);
        const t = copy[r][c];
        copy[r][c] = copy[b[0]][b[1]];
        copy[b[0]][b[1]] = t;
        if (findRuns(copy).length) return [[r, c], b];
      }
  throw new Error("no legal swap");
}

test("a new board is full, has no ready matches and has a move", () => {
  for (const seed of [1, 2, 3, 99]) {
    const g = newGame("medium", seed);
    assert.ok(full(g.board));
    assert.equal(findRuns(g.board).length, 0);
    assert.ok(hasMove(g.board));
  }
});

test("the same seed deals the same board", () => {
  const colours = (g: Game) => g.board.map((row) => row.map((x) => x?.colour));
  assert.deepEqual(colours(newGame("easy", 5)), colours(newGame("easy", 5)));
});

test("an illegal swap changes nothing and costs no move", () => {
  const g = newGame("easy", 4);
  const before = JSON.stringify(g.board);
  assert.equal(play(g, [0, 0], [2, 2]), null); // not neighbours
  assert.equal(g.moves, MOVES.easy);
  assert.equal(JSON.stringify(g.board), before);
});

test("a legal swap scores, uses a move and leaves a settled full board", () => {
  const g = newGame("easy", 8);
  const [a, b] = legalSwap(g);
  const steps = play(g, a, b);
  assert.ok(steps && steps.length >= 1);
  assert.ok(g.score > 0);
  assert.equal(g.moves, MOVES.easy - 1);
  assert.ok(full(g.board));
  assert.equal(findRuns(g.board).length, 0);
  assert.ok(hasMove(g.board));
});

test("four in a row leaves a sparkle gem that clears its row and column", () => {
  const g = newGame("easy", 11);
  // hand-build a row with a four-run waiting for the swap
  for (let c = 0; c < SIZE; c++)
    for (let r = 0; r < SIZE; r++) {
      const cell = g.board[r][c];
      if (cell) cell.colour = (r * 3 + c * 2) % 6;
    }
  // the board above may have runs; build the case on row 7 explicitly
  const row = SIZE - 1;
  for (const c of [0, 1, 3]) {
    const cell = g.board[row][c];
    if (cell) cell.colour = 5;
  }
  const above = g.board[row - 1][2];
  if (above) above.colour = 5;
  // col 4 must not extend the run to five (that would make a disco gem)
  const fifth = g.board[row][4];
  if (fifth) fifth.colour = 0;
  const gap = g.board[row][2];
  if (gap) gap.colour = 4;
  const steps = play(g, [row - 1, 2], [row, 2]);
  assert.ok(steps);
  const madeSparkle = g.board.some((r) =>
    r.some((x) => x?.special === "sparkle"),
  );
  assert.ok(madeSparkle);
});

test("a long game never stalls: forty legal moves in a row", () => {
  const g = newGame("hard", 21);
  g.moves = 40;
  for (let i = 0; i < 40; i++) {
    const [a, b] = legalSwap(g);
    assert.ok(play(g, a, b));
  }
  assert.equal(g.moves, 0);
  assert.equal(play(g, ...legalSwap(g)), null);
});

test("grades follow the level's target", () => {
  assert.equal(grade("easy", 0), "C");
  assert.equal(grade("easy", 1500), "A");
  assert.equal(grade("easy", 2250), "S");
});
