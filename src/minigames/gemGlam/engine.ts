/**
 * Gem Glam: the arcade's match-3. Swap two neighbouring gems to line up
 * three or more of a kind; matches clear, gems fall and new ones drop in, and
 * cascades score more. Four in a line leaves a sparkle gem that clears its
 * row and column when matched; five leaves a disco gem that clears every gem
 * of the color it is swapped with. Pure and seeded, so every rule is tested.
 */
import type { PayGrade } from "../../game/wallet.ts";

export const SIZE = 8;
export const COLORS = 6;

export type Special = "sparkle" | "disco" | null;
export type Gem = { color: number; special: Special; id: number };
export type Board = (Gem | null)[][]; // [row][col], row 0 at the top

export type Level = "easy" | "medium" | "hard";
export const LEVELS: readonly { id: Level; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];
export const MOVES: Record<Level, number> = { easy: 24, medium: 20, hard: 16 };
export const TARGET: Record<Level, number> = {
  easy: 1500,
  medium: 2200,
  hard: 3000,
};

export type Game = {
  board: Board;
  score: number;
  moves: number;
  rand: () => number;
  nextId: number;
};

/** A seeded 0..1 generator (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gem(g: Game, color: number, special: Special = null): Gem {
  return { color, special, id: g.nextId++ };
}

/** A fresh board with no ready-made matches and at least one legal move. */
export function newGame(level: Level, seed: number): Game {
  const g: Game = {
    board: [],
    score: 0,
    moves: MOVES[level],
    rand: seeded(seed),
    nextId: 1,
  };
  do {
    g.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        let color: number;
        do color = Math.floor(g.rand() * COLORS);
        while (
          (c >= 2 &&
            g.board[r][c - 1]?.color === color &&
            g.board[r][c - 2]?.color === color) ||
          (r >= 2 &&
            g.board[r - 1][c]?.color === color &&
            g.board[r - 2][c]?.color === color)
        );
        g.board[r][c] = gem(g, color);
      }
  } while (!hasMove(g.board));
  return g;
}

export type Cell = [number, number];

const adjacent = (a: Cell, b: Cell) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

/** Runs of three or more in rows and columns, as lists of cells. */
export function findRuns(board: Board): Cell[][] {
  const runs: Cell[][] = [];
  for (const horizontal of [true, false]) {
    for (let i = 0; i < SIZE; i++) {
      let run: Cell[] = [];
      for (let j = 0; j <= SIZE; j++) {
        const cell: Cell = horizontal ? [i, j] : [j, i];
        const g = j < SIZE ? board[cell[0]][cell[1]] : null;
        const prev = run.length ? board[run[0][0]][run[0][1]] : null;
        if (g && prev && g.color === prev.color) run.push(cell);
        else {
          if (run.length >= 3) runs.push(run);
          run = g ? [cell] : [];
        }
      }
    }
  }
  return runs;
}

function swap(board: Board, a: Cell, b: Cell) {
  const t = board[a[0]][a[1]];
  board[a[0]][a[1]] = board[b[0]][b[1]];
  board[b[0]][b[1]] = t;
}

/** Whether any single swap would make a match (or fire a disco gem). */
export function hasMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c]?.special === "disco") return true;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ]) {
        const b: Cell = [r + dr, c + dc];
        if (b[0] >= SIZE || b[1] >= SIZE) continue;
        swap(board, [r, c], b);
        const ok = findRuns(board).length > 0;
        swap(board, [r, c], b);
        if (ok) return true;
      }
    }
  return false;
}

export type Step = { cleared: Cell[]; points: number };

/**
 * Clears `cells` (firing any specials among them), scores, drops gems and
 * refills. `make` lists specials to leave behind where a long run was made.
 */
function clearAndDrop(
  g: Game,
  cells: Cell[],
  chain: number,
  make: { at: Cell; color: number; special: Special }[],
): Step {
  const doomed = new Set(cells.map(([r, c]) => r * SIZE + c));
  // specials caught in a clear fire too, spreading the clear
  const queue = [...doomed];
  while (queue.length) {
    const k = queue.pop() ?? 0;
    const r = Math.floor(k / SIZE);
    const c = k % SIZE;
    const target = g.board[r][c];
    if (target?.special !== "sparkle") continue;
    for (let i = 0; i < SIZE; i++)
      for (const kk of [r * SIZE + i, i * SIZE + c])
        if (!doomed.has(kk)) {
          doomed.add(kk);
          queue.push(kk);
        }
  }
  const points = doomed.size * 20 * chain;
  for (const k of doomed) g.board[Math.floor(k / SIZE)][k % SIZE] = null;
  for (const m of make) g.board[m.at[0]][m.at[1]] = gem(g, m.color, m.special);
  // gravity, then refill from the top
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const cell = g.board[r][c];
      if (!cell) continue;
      g.board[r][c] = null;
      g.board[write--][c] = cell;
    }
    for (let r = write; r >= 0; r--)
      g.board[r][c] = gem(g, Math.floor(g.rand() * COLORS));
  }
  g.score += points;
  return {
    cleared: [...doomed].map((k): Cell => [Math.floor(k / SIZE), k % SIZE]),
    points,
  };
}

/**
 * Swaps two neighbouring gems. Returns the clear steps (cascades included),
 * or null when the swap is illegal and the board is unchanged.
 */
export function play(g: Game, a: Cell, b: Cell): Step[] | null {
  if (g.moves <= 0 || !adjacent(a, b)) return null;
  const ga = g.board[a[0]][a[1]];
  const gb = g.board[b[0]][b[1]];
  if (!ga || !gb) return null;
  const steps: Step[] = [];
  // a disco gem clears every gem of the color it is swapped with
  const disco = ga.special === "disco" ? a : gb.special === "disco" ? b : null;
  if (disco) {
    const other = disco === a ? gb : ga;
    const cells: Cell[] = [disco];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (g.board[r][c]?.color === other.color) cells.push([r, c]);
    g.moves -= 1;
    steps.push(clearAndDrop(g, cells, 1, []));
  } else {
    swap(g.board, a, b);
    if (!findRuns(g.board).length) {
      swap(g.board, a, b);
      return null;
    }
    g.moves -= 1;
  }
  // resolve cascades; long runs leave a special at the swapped cell or center
  for (let chain = steps.length + 1; ; chain++) {
    const runs = findRuns(g.board);
    if (!runs.length) break;
    const make: { at: Cell; color: number; special: Special }[] = [];
    for (const run of runs) {
      if (run.length < 4) continue;
      const at =
        run.find(
          ([r, c]) => (r === a[0] && c === a[1]) || (r === b[0] && c === b[1]),
        ) ?? run[Math.floor(run.length / 2)];
      const color = g.board[at[0]][at[1]]?.color ?? 0;
      make.push({ at, color, special: run.length >= 5 ? "disco" : "sparkle" });
    }
    steps.push(clearAndDrop(g, runs.flat(), chain, make));
  }
  if (!hasMove(g.board)) shuffle(g);
  return steps;
}

/** Reshuffles colors in place until a move exists (specials are kept). */
export function shuffle(g: Game) {
  do {
    for (const row of g.board)
      for (const cell of row)
        if (cell && !cell.special) cell.color = Math.floor(g.rand() * COLORS);
  } while (findRuns(g.board).length || !hasMove(g.board));
}

export function over(g: Game): boolean {
  return g.moves <= 0;
}

/** S for beating the target by half again, down to C. */
export function grade(level: Level, score: number): PayGrade {
  const t = TARGET[level];
  return score >= t * 1.5
    ? "S"
    : score >= t
      ? "A"
      : score >= t * 0.6
        ? "B"
        : "C";
}
