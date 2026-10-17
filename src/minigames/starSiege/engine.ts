// Star Siege: the arcade bar's alien invasion shooter (aliens, never
// zombies). A fleet marches side to side and down; slide your ship along
// the bottom and shoot them before they land. One shot on screen at a
// time, three ships, and every cleared wave comes back faster. Pure and
// deterministic: the fleet's bombs come from the game's own seeded random.

import type { PayGrade } from "../../game/wallet.ts";

export const W = 100;
export const H = 140;
export const SHIP_Y = 130;
const SHIP_HALF = 5;
const SHIP_SPEED = 60;
const SHOT_SPEED = 140;
const BOMB_SPEED = 45;
const COLS = 6;
const ROWS = 4;
const GAP_X = 12;
const GAP_Y = 10;
const ALIEN_HALF = 4;
/** Aliens this low have landed: the invasion's won. */
export const LANDED_Y = 118;
const START_LIVES = 3;

export type Alien = { x: number; y: number; row: number; alive: boolean };
export type Shot = { x: number; y: number };

export type Game = {
  ship: number;
  lives: number;
  score: number;
  wave: number;
  aliens: Alien[];
  /** The fleet's march: +1 right, -1 left. */
  dir: 1 | -1;
  shot: Shot | null;
  bombs: Shot[];
  /** Seconds until the fleet drops its next bomb. */
  bombIn: number;
  /** Seconds the ship is still blinking after a hit (can't be hit). */
  hurt: number;
  seed: number;
  over: boolean;
};

export type Input = { left: boolean; right: boolean; fire: boolean };

function rand(g: Game): number {
  g.seed = (g.seed * 1664525 + 1013904223) % 4294967296;
  return g.seed / 4294967296;
}

function fleet(): Alien[] {
  const out: Alien[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let c = 0; c < COLS; c++)
      out.push({
        x: 20 + c * GAP_X,
        y: 16 + row * GAP_Y,
        row,
        alive: true,
      });
  return out;
}

export function newGame(seed: number): Game {
  return {
    ship: W / 2,
    lives: START_LIVES,
    score: 0,
    wave: 1,
    aliens: fleet(),
    dir: 1,
    shot: null,
    bombs: [],
    bombIn: 1.5,
    hurt: 0,
    seed: Math.abs(Math.floor(seed)) % 4294967296,
    over: false,
  };
}

/** How fast the fleet marches: faster each wave and as it thins out. */
export function marchSpeed(wave: number, left: number): number {
  return (6 + wave * 3) * (1 + (COLS * ROWS - left) * 0.08);
}

/** Points for an alien by its row: the back rows are worth the most. */
export function pointsFor(row: number): number {
  return (ROWS - row) * 10;
}

/** Advances the game by `dt` seconds with the player's `input`. */
export function step(prev: Game, input: Input, dt: number): Game {
  if (prev.over) return prev;
  const g: Game = {
    ...prev,
    aliens: prev.aliens.map((a) => ({ ...a })),
    bombs: prev.bombs.map((b) => ({ ...b })),
    shot: prev.shot && { ...prev.shot },
  };
  const t = Math.min(Math.max(dt, 0), 0.05);
  // the ship
  const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  g.ship = Math.max(
    SHIP_HALF,
    Math.min(W - SHIP_HALF, g.ship + move * SHIP_SPEED * t),
  );
  if (input.fire && !g.shot) g.shot = { x: g.ship, y: SHIP_Y - 4 };
  g.hurt = Math.max(0, g.hurt - t);
  // the fleet marches, and steps down at the edges
  const alive = g.aliens.filter((a) => a.alive);
  const dx = g.dir * marchSpeed(g.wave, alive.length) * t;
  const edge = alive.some(
    (a) => a.x + dx > W - ALIEN_HALF || a.x + dx < ALIEN_HALF,
  );
  for (const a of alive)
    if (edge) a.y += 4;
    else a.x += dx;
  if (edge) g.dir = g.dir === 1 ? -1 : 1;
  // your shot
  if (g.shot) {
    g.shot.y -= SHOT_SPEED * t;
    const hit = alive.find(
      (a) =>
        a.alive &&
        Math.abs(a.x - g.shot!.x) < ALIEN_HALF &&
        Math.abs(a.y - g.shot!.y) < ALIEN_HALF,
    );
    if (hit) {
      hit.alive = false;
      g.score += pointsFor(hit.row);
      g.shot = null;
    } else if (g.shot.y < 0) g.shot = null;
  }
  // the fleet's bombs, from a random alien still flying
  g.bombIn -= t;
  const flying = g.aliens.filter((a) => a.alive);
  if (g.bombIn <= 0 && flying.length) {
    const from = flying[Math.floor(rand(g) * flying.length)];
    g.bombs.push({ x: from.x, y: from.y + 3 });
    g.bombIn = Math.max(0.35, 1.4 - g.wave * 0.15) * (0.6 + rand(g) * 0.8);
  }
  for (const b of g.bombs) b.y += BOMB_SPEED * t;
  const struck = g.bombs.find(
    (b) => Math.abs(b.x - g.ship) < SHIP_HALF && Math.abs(b.y - SHIP_Y) < 3,
  );
  g.bombs = g.bombs.filter((b) => b !== struck && b.y < H);
  if (struck && g.hurt === 0) {
    g.lives -= 1;
    g.hurt = 1.5;
  }
  // a cleared wave: a bonus, and the next fleet, faster
  if (!flying.length) {
    g.score += 100 * g.wave;
    g.wave += 1;
    g.aliens = fleet();
    g.dir = 1;
    g.bombs = [];
  }
  if (g.lives <= 0 || flying.some((a) => a.y >= LANDED_Y)) g.over = true;
  return g;
}

export function grade(score: number): PayGrade {
  return score >= 1500 ? "S" : score >= 900 ? "A" : score >= 400 ? "B" : "C";
}
