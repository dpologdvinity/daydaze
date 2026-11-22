// The glue between the client's local save and the server-owned progress of an
// account: adopt the server's XP and title, retry a busy server, and word the
// results (a score's note, a board's value and reset countdown). Pure, so the
// rules are tested without a browser or a network.

import {
  PRIZE_GAMES,
  PRIZE_TABLES,
  type PrizeGame,
} from "../../game/prizes.ts";
import {
  LADDERS,
  selectTitle,
  type Ladder,
} from "../../game/progression/progression.ts";
import type { SaveV1 } from "../../game/save.ts";
import type { ScoreOutcome, ServerProgress } from "../progress.ts";
import type { ApiResult } from "./api.ts";

/** Tries a write gets when the server says it is busy with another one. */
const BUSY_TRIES = 3;
const BUSY_WAIT_MS = 1200;

/**
 * The save with the server's XP and title in place of its own. Events (which
 * night's XP was already paid) stay local. A title the server's XP hasn't
 * earned is dropped. Returns the same save when nothing changes, so adopting
 * a reply never sets off another sync.
 */
export function adoptServerProgress(
  save: SaveV1,
  server: Pick<ServerProgress, "xp" | "title">,
): SaveV1 {
  const { progression } = save;
  const { street, fame, hustle } = server.xp;
  const base = { ...progression, xp: { street, fame, hustle }, title: null };
  const next = server.title === null ? base : selectTitle(base, server.title);
  const same =
    next.xp.street === progression.xp.street &&
    next.xp.fame === progression.xp.fame &&
    next.xp.hustle === progression.xp.hustle &&
    next.title === progression.title;
  return same ? save : { ...save, progression: next };
}

/** Runs a write again while the server answers 409 `busy`; any other result
 * (success, refusal, a dead network) is returned as it is. */
export async function retryBusy<T>(
  call: () => Promise<ApiResult<T>>,
  sleep: (ms: number) => Promise<void>,
): Promise<ApiResult<T>> {
  let result = await call();
  for (let tries = 1; tries < BUSY_TRIES; tries++) {
    if (result.ok || result.status !== 409) break;
    await sleep(BUSY_WAIT_MS);
    result = await call();
  }
  return result;
}

/** The line under a prize about what the server did with the score. The local
 * result always stands; this only says whether it reached the account. */
export function scoreNote(result: ApiResult<ScoreOutcome>): string {
  if (result.ok) {
    return result.value.capped
      ? "Daily XP limit reached"
      : `${result.value.dailyXpLeft.toLocaleString("en-US")} XP left today`;
  }
  if (result.status === 0)
    return "Offline: this score is saved on this device.";
  if (result.status === 429)
    return "Slow down: this score didn't reach the board.";
  return "This score didn't reach the weekly board.";
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long until the weekly boards reset: "3d 5h", "5h 10m", "8m". */
export function weekCountdown(endsAt: number, now: number): string {
  const left = endsAt - now;
  if (left < MINUTE) return "under a minute";
  if (left >= DAY)
    return `${Math.floor(left / DAY)}d ${Math.floor((left % DAY) / HOUR)}h`;
  if (left >= HOUR)
    return `${Math.floor(left / HOUR)}h ${Math.floor((left % HOUR) / MINUTE)}m`;
  return `${Math.ceil(left / MINUTE)}m`;
}

/** Which weekly board: one minigame's best scores, or one ladder's XP. */
export type BoardChoice = { game: PrizeGame } | { ladder: Ladder };

/** Reads a board picker's value ("ladder:fame", "game:bowling"); null for
 * anything else. */
export function boardChoice(value: string): BoardChoice | null {
  const [kind, name] = value.split(":");
  if (kind === "ladder") {
    const ladder = LADDERS.find((l) => l === name);
    return ladder ? { ladder } : null;
  }
  if (kind === "game") {
    const game = PRIZE_GAMES.find((g) => g === name);
    return game ? { game } : null;
  }
  return null;
}

/** A board line's value: a game's own score format, or a ladder's XP. */
export function boardValue(board: BoardChoice, value: number): string {
  return "game" in board
    ? PRIZE_TABLES[board.game].format(value)
    : `${value.toLocaleString("en-US")} XP`;
}
