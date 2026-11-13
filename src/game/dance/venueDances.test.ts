// A venue's dancers: its style, a club night's own, a line dance the whole
// floor is called to in step, and moves of their own the rest of the time.

import assert from "node:assert/strict";
import { test } from "node:test";
import { CLUB_NIGHTS, nightsAt } from "../events.ts";
import { isDanceMoveId } from "./moves.ts";
import {
  CALL_CYCLE_MS,
  CALL_MS,
  cartGagOn,
  crowdMove,
  crowdStyle,
  LINE_DANCES,
  NIGHT_STYLE,
  nextChangeAt,
  STYLE_MOVES,
  VENUE_STYLE,
} from "./venueDances.ts";

const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;

/** The first hour in a week of 2026 when `ok(ms)` holds. */
function when(ok: (ms: number) => boolean): number {
  const start = Date.UTC(2026, 10, 2);
  for (let ms = start; ms < start + WEEK; ms += HOUR) if (ok(ms)) return ms;
  throw new Error("no such hour");
}

/** The first cycle start (ms) at or after `from` whose line-dance call is on. */
function calledCycle(room: "pulse" | "velvet-room", from: number): number {
  const first = Math.ceil(from / CALL_CYCLE_MS);
  for (let c = first; c < first + 100; c++)
    if (crowdMove(room, 1, c * CALL_CYCLE_MS + 1).line)
      return c * CALL_CYCLE_MS;
  throw new Error("no called cycle");
}

/** An hour when nothing is on at Pulse: its own style, no night's. */
const QUIET_PULSE = when((ms) => nightsAt("pulse", ms).length === 0);

test("every move a style names is a real dance", () => {
  for (const moves of [
    ...Object.values(STYLE_MOVES),
    ...Object.values(LINE_DANCES),
  ])
    for (const id of moves) assert.ok(isDanceMoveId(id), id);
  for (const style of Object.keys(STYLE_MOVES))
    assert.ok(LINE_DANCES[style as keyof typeof LINE_DANCES]?.length);
});

test("every night a style names is a night on the calendar", () => {
  const ids = new Set(CLUB_NIGHTS.map((n) => n.id as string));
  for (const id of Object.keys(NIGHT_STYLE)) assert.ok(ids.has(id), id);
});

test("hip-hop at Pulse, swing at the roller disco, pop at the karaoke loft, on a quiet night", () => {
  const quiet = (room: "pulse" | "roller-rink" | "karaoke") =>
    when((ms) => nightsAt(room, ms).length === 0);
  assert.equal(crowdStyle("pulse", quiet("pulse")), "hip-hop");
  assert.equal(crowdStyle("roller-rink", quiet("roller-rink")), "swing");
  assert.equal(crowdStyle("karaoke", quiet("karaoke")), "pop");
  assert.equal(VENUE_STYLE.pulse, "hip-hop");
});

test("a goth night dances Thriller where it is held", () => {
  const ms = when((t) => {
    const nights = nightsAt("velvet-room", t);
    return nights.length === 1 && nights[0]?.id === "goth-night";
  });
  assert.equal(crowdStyle("velvet-room", ms), "monster");
});

test("a room with no style of its own dances house", () => {
  const quiet = when((ms) => nightsAt("dome", ms).length === 0);
  assert.equal(crowdStyle("dome", quiet), "house");
});

test("called to a line dance, the whole floor does the same move", () => {
  const start = calledCycle("pulse", QUIET_PULSE);
  for (const into of [0, 1000, CALL_MS - 5]) {
    const moves = Array.from({ length: 30 }, (_, seed) =>
      crowdMove("pulse", seed, start + into + 1),
    );
    assert.ok(moves.every((m) => m.line));
    assert.equal(new Set(moves.map((m) => m.move)).size, 1);
  }
});

test("the rest of the time the dancers each have moves of their own, from the style", () => {
  const start = calledCycle("pulse", QUIET_PULSE);
  const moves = Array.from({ length: 30 }, (_, seed) =>
    crowdMove("pulse", seed, start + CALL_MS + 5_000),
  );
  assert.ok(moves.every((m) => !m.line));
  assert.ok(moves.every((m) => STYLE_MOVES["hip-hop"].includes(m.move)));
  assert.ok(new Set(moves.map((m) => m.move)).size >= 4);
});

test("Thriller's parts follow one another across the calls", () => {
  const ms = when((t) => {
    const nights = nightsAt("velvet-room", t);
    return nights.length === 1 && nights[0]?.id === "goth-night";
  });
  // the first called cycle at or after that hour, then the next called one
  const first = calledCycle("velvet-room", ms);
  const part = (at: number) => crowdMove("velvet-room", 4, at + 10).move;
  const c = first / CALL_CYCLE_MS;
  assert.equal(part(first), LINE_DANCES.monster[c % 4]);
});

test("a dancer's move holds until the moment the next change is announced", () => {
  const base = calledCycle("pulse", QUIET_PULSE) + 7_000;
  for (const seed of [1, 9, 40, 123])
    for (let ms = base; ms < base + 1_500_000; ms += 61_000) {
      const next = nextChangeAt(seed, ms);
      assert.ok(next > ms);
      const here = crowdMove("pulse", seed, ms);
      for (const t of [ms, (ms + next) / 2, next - 1])
        assert.deepEqual(crowdMove("pulse", seed, Math.floor(t)), here);
    }
});

test("dancers' own changes are staggered, not all at once", () => {
  const ms = calledCycle("pulse", QUIET_PULSE) + CALL_MS + 1_000;
  const nexts = new Set(
    Array.from({ length: 20 }, (_, seed) => nextChangeAt(seed, ms)),
  );
  assert.ok(nexts.size >= 8);
});

test("the shopping cart gag is rare: about one hour in five, the same for everyone", () => {
  const start = Date.UTC(2026, 10, 2);
  let on = 0;
  for (let h = 0; h < 500; h++) if (cartGagOn(start + h * HOUR)) on++;
  assert.ok(on > 50 && on < 150, `${on} of 500`);
  assert.equal(
    cartGagOn(start + 17 * HOUR),
    cartGagOn(start + 17 * HOUR + 59 * 60_000),
  );
});
